"""Mock-isolated tests for Asumi service orders; no database or gateway writes occur."""

import sys
import unittest
from contextlib import ExitStack, contextmanager
from types import SimpleNamespace
from unittest.mock import patch

from press.saas.commerce import api


class FakeDocument(SimpleNamespace):
	def insert(self, **_kwargs):
		return self

	def save(self, **_kwargs):
		return self

	def is_new(self):
		return False

	def db_set(self, fieldname, value=None, **_kwargs):
		if isinstance(fieldname, dict):
			self.__dict__.update(fieldname)
		else:
			setattr(self, fieldname, value)


class CheckoutRejected(Exception):
	pass


class ServiceOrderApiTests(unittest.TestCase):
	user = "buyer@example.com"

	def setUp(self):
		self.team = FakeDocument(name="TEAM-1", user=self.user, currency="USD")
		self.settings = FakeDocument(
			enabled=1,
			allow_service_sales=1,
			allow_marketplace_app_sales=1,
			allow_site_plan_sales=1,
			sandbox_mode=0,
		)
		self.settings.get_password = lambda *_args, **_kwargs: "merchant-secret"

	def common_purchase_patches(self, *, prices=None, get_all=None):
		return (
			patch.object(api.frappe, "session", SimpleNamespace(user=self.user)),
			patch.object(api, "get_current_team", return_value=self.team),
			patch.object(api, "is_user_part_of_team", return_value=True),
			patch.object(api, "_get_settings", return_value=self.settings),
			patch.object(api, "_get_service_prices", return_value=prices or api.default_service_prices()),
			patch.object(api, "_acquire_transaction_lock", return_value=True),
			patch.object(api.frappe, "get_all", side_effect=get_all or (lambda *_a, **_k: [])),
			patch.object(
				api.frappe.db,
				"exists",
				side_effect=lambda doctype, name=None: doctype == "Currency" and name == "IRR",
			),
			patch.object(api.frappe.utils, "now_datetime", return_value="2026-10-13 12:00:00"),
		)

	def test_requires_signed_in_user_and_does_not_create_guest_orders(self):
		with (
			patch.object(api.frappe, "session", SimpleNamespace(user="Guest")),
			patch.object(api.frappe, "throw", side_effect=CheckoutRejected),
			patch.object(api.frappe, "get_doc") as get_doc,
		):
			with self.assertRaises(CheckoutRejected):
				api.start_service_purchase('["finance"]', "[]", "مشتری", "09123456789")
		get_doc.assert_not_called()

	def test_service_sales_flag_blocks_paid_and_free_orders_independently(self):
		self.settings.allow_service_sales = 0
		with (
			patch.object(api.frappe, "session", SimpleNamespace(user=self.user)),
			patch.object(api, "get_current_team", return_value=self.team),
			patch.object(api, "_get_settings", return_value=self.settings),
			patch.object(api.frappe, "throw", side_effect=CheckoutRejected),
			patch.object(api.frappe, "get_doc") as get_doc,
		):
			with self.assertRaises(CheckoutRejected):
				api.start_service_purchase('["finance"]', "[]", "مشتری", "09123456789")
		get_doc.assert_not_called()

	def test_missing_merchant_blocks_paid_order_before_it_is_created(self):
		with patch.object(self.settings, "get_password", return_value=None), patch.object(
			api.frappe, "throw", side_effect=CheckoutRejected
		), patch.object(api.frappe, "get_doc") as get_doc:
			with self._purchase_context():
				with self.assertRaises(CheckoutRejected):
					api.start_service_purchase('["finance"]', "[]", "مشتری", "09123456789")
		get_doc.assert_not_called()

	def test_paid_order_uses_server_quote_and_never_queues_provisioning(self):
		checkout_calls = []
		with self._purchase_context() as stack:
			checkout = stack.enter_context(
				patch.object(api, "_create_zarinpal_checkout", side_effect=lambda *args: checkout_calls.append(args) or {"order": "ORDER-PENDING", "checkout_url": "https://gateway.test/pay"})
			)
			queue = stack.enter_context(patch.object(api, "_enqueue_provision_paid_order"))
			result = api.start_service_purchase('["finance"]', "[]", " مشتری ", "۰۹۱۲۱۲۳۴۵۶۷", " شرکت ")

		self.assertEqual(result, {"order": "ORDER-PENDING", "checkout_url": "https://gateway.test/pay"})
		self.assertEqual(len(checkout_calls), 1)
		snapshot = checkout_calls[0][0]
		self.assertEqual(snapshot["amount"], 55_000_000)
		self.assertEqual(snapshot["team"], "TEAM-1")
		self.assertEqual(snapshot["customer"], self.user)
		self.assertEqual(snapshot["service_amount_toman"], 5_500_000)
		self.assertIsInstance(snapshot["service_quote_snapshot"], dict)
		queue.assert_not_called()
		checkout.assert_called_once()

	def test_free_service_order_is_paid_without_gateway_or_provisioning(self):
		prices = api.default_service_prices()
		prices["modules"]["finance"] = 0
		created = []

		def get_doc(values):
			order = FakeDocument(name="ORDER-FREE", status="Pending Payment", **values)
			created.append(order)
			return order

		with self._purchase_context(prices=prices) as stack:
			stack.enter_context(patch.object(api.frappe, "get_doc", side_effect=get_doc))
			create_payment = stack.enter_context(patch.object(api, "create_payment"))
			checkout = stack.enter_context(patch.object(api, "_create_zarinpal_checkout"))
			queue = stack.enter_context(patch.object(api, "_enqueue_provision_paid_order"))
			result = api.start_service_purchase('["finance"]', "[]", "مشتری", "09123456789")

		self.assertEqual(result, {"order": "ORDER-FREE", "free": True})
		self.assertEqual(created[0].provider, "Free")
		self.assertEqual(created[0].status, "Paid")
		self.assertEqual(created[0].amount, 0)
		self.assertEqual(created[0].paid_at, "2026-10-13 12:00:00")
		self.assertIsInstance(created[0].service_quote_snapshot, str)
		create_payment.assert_not_called()
		checkout.assert_not_called()
		queue.assert_not_called()

	def test_pending_paid_order_reuses_existing_authority_for_same_fingerprint(self):
		pending = SimpleNamespace(
			name="ORDER-PENDING", status="Pending Payment", authority="AUTH-1", sandbox_mode=0
		)
		with self._purchase_context(get_all=lambda *_a, **_k: [pending]) as stack:
			checkout = stack.enter_context(patch.object(api, "_create_zarinpal_checkout"))
			result = api.start_service_purchase('["finance"]', "[]", "مشتری", "09123456789")

		self.assertEqual(result, {"order": "ORDER-PENDING", "checkout_url": "https://www.zarinpal.com/pg/StartPay/AUTH-1"})
		checkout.assert_not_called()

	def test_addon_purchase_requires_signin(self):
		with (
			patch.object(api.frappe, "session", SimpleNamespace(user="Guest")),
			patch.object(api.frappe, "throw", side_effect=CheckoutRejected),
			patch.object(api, "_addon_purchase_site") as resolve_site,
		):
			with self.assertRaises(CheckoutRejected):
				api.start_service_addon_purchase(
					"assistant_ai", "Site", "tenant.asumi.ir", "مشتری", "09123456789"
				)
		resolve_site.assert_not_called()

	def test_paid_addon_checkout_uses_server_price_and_site_target(self):
		checkout_calls = []
		with self._addon_purchase_context() as stack:
			checkout = stack.enter_context(
				patch.object(
					api,
					"_create_zarinpal_checkout",
					side_effect=lambda *args: checkout_calls.append(args)
					or {"order": "ORDER-ADDON", "checkout_url": "https://gateway.test/pay"},
				)
			)
			result = api.start_service_addon_purchase(
				"assistant_ai", "Site", "tenant.asumi.ir", " مشتری ", "۰۹۱۲۱۲۳۴۵۶۷"
			)

		self.assertEqual(result["order"], "ORDER-ADDON")
		self.assertEqual(len(checkout_calls), 1)
		snapshot = checkout_calls[0][0]
		self.assertEqual(snapshot["amount"], 250_000)
		self.assertEqual(snapshot["service_amount_toman"], 25_000)
		self.assertEqual(snapshot["site"], "tenant.asumi.ir")
		self.assertIsNone(snapshot["docker_site"])
		self.assertEqual(snapshot["service_quote_snapshot"]["addon_id"], "assistant_ai")
		self.assertEqual(snapshot["customer"], self.user)
		checkout.assert_called_once()

	def test_nonpaid_addon_cannot_start_checkout(self):
		with (
			self._addon_purchase_context(offers=api.default_addon_offers()),
			patch.object(api.frappe, "throw", side_effect=CheckoutRejected),
			patch.object(api, "_create_zarinpal_checkout") as checkout,
		):
			with self.assertRaises(CheckoutRejected):
				api.start_service_addon_purchase(
					"assistant_ai", "Site", "tenant.asumi.ir", "مشتری", "09123456789"
				)
		checkout.assert_not_called()

	def test_addon_purchase_reuses_pending_authority_for_same_site(self):
		pending = SimpleNamespace(
			name="ORDER-ADDON", status="Pending Payment", authority="AUTH-ADDON", sandbox_mode=0
		)
		with (
			self._addon_purchase_context(get_all=lambda *_a, **_k: [pending]),
			patch.object(api, "_create_zarinpal_checkout") as checkout,
		):
			result = api.start_service_addon_purchase(
				"assistant_ai", "Docker Control Site", "veederakht.ir", "مشتری", "09123456789"
			)
		self.assertEqual(
			result,
			{"order": "ORDER-ADDON", "checkout_url": "https://www.zarinpal.com/pg/StartPay/AUTH-ADDON"},
		)
		checkout.assert_not_called()

	def test_active_addon_order_does_not_block_a_manual_renewal_purchase(self):
		from unittest.mock import Mock

		get_all = Mock(return_value=[])
		with self._addon_purchase_context(get_all=get_all) as stack:
			stack.enter_context(patch.object(api, "_create_zarinpal_checkout", return_value={"order": "ORDER-RENEW"}))
			api.start_service_addon_purchase(
				"assistant_ai", "Site", "tenant.asumi.ir", "مشتری", "09123456789"
			)
		status_filter = get_all.call_args.kwargs["filters"]["status"]
		self.assertNotIn("Active", status_filter[1])

	def test_eligible_addon_sites_excludes_targets_without_accounts(self):
		sites = [
			{"name": "tenant.asumi.ir", "site_type": "Site", "key": "Site:tenant.asumi.ir", "label": "tenant.asumi.ir"},
			{"name": "veederakht.ir", "site_type": "Docker Control Site", "key": "Docker Control Site:veederakht.ir", "label": "veederakht.ir"},
		]
		with (
			patch.object(api.frappe, "session", SimpleNamespace(user=self.user)),
			patch.object(api, "my_purchase_sites", return_value=sites),
			patch.object(api, "_installed_apps_for_addon_site", side_effect=[["frappe", "accounts"], ["frappe"]]),
		):
			result = api.eligible_addon_sites()
		self.assertEqual(result, [sites[0]])

	def test_addon_target_requires_active_site_owned_by_team(self):
		with (
			patch.object(
				api.frappe.db,
				"get_value",
				return_value=SimpleNamespace(name="tenant.asumi.ir", team="TEAM-1", status="Active"),
			),
			patch.object(api, "_installed_apps_for_addon_site", return_value=["frappe", "accounts"]),
		):
			target = api._addon_purchase_site("tenant.asumi.ir", "Site", "TEAM-1")
		self.assertEqual(target["name"], "tenant.asumi.ir")
		self.assertEqual(target["installed_apps"], ["frappe", "accounts"])

	def test_addon_target_rejects_foreign_or_inactive_sites(self):
		for site in (
			SimpleNamespace(name="tenant.asumi.ir", team="TEAM-2", status="Active"),
			SimpleNamespace(name="tenant.asumi.ir", team="TEAM-1", status="Suspended"),
		):
			with (
				self.subTest(site=site),
				patch.object(api.frappe.db, "get_value", return_value=site),
				patch.object(api.frappe, "throw", side_effect=CheckoutRejected),
				self.assertRaises(CheckoutRejected),
			):
				api._addon_purchase_site("tenant.asumi.ir", "Site", "TEAM-1")

	def test_addon_target_rejects_sites_without_accounts(self):
		with (
			patch.object(
				api.frappe.db,
				"get_value",
				return_value=SimpleNamespace(name="tenant.asumi.ir", team="TEAM-1", status="Active"),
			),
			patch.object(api, "_installed_apps_for_addon_site", return_value=["frappe", "erpnext"]),
			patch.object(api.frappe, "throw", side_effect=CheckoutRejected),
			self.assertRaises(CheckoutRejected),
		):
			api._addon_purchase_site("tenant.asumi.ir", "Site", "TEAM-1")

	def test_verified_service_callback_marks_paid_but_never_queues_a_worker(self):
		order = FakeDocument(
			name="ORDER-SERVICE",
			order_type="Asumi Service",
			status="Pending Payment",
			amount=55_000_000,
			authority="AUTH-1",
			sandbox_mode=0,
			payment_error="",
		)
		local = SimpleNamespace(response={})
		with (
			patch.object(api.frappe, "form_dict", {"Status": "OK", "Authority": "AUTH-1"}),
			patch.object(api.frappe, "local", local),
			patch.object(api.frappe.db, "get_value", return_value=order.name),
			patch.object(api.frappe, "get_doc", return_value=order),
			patch.object(api, "_get_settings", return_value=self.settings),
			patch.object(api, "_merchant_id", return_value="merchant-secret"),
			patch.object(api.frappe.utils, "now_datetime", return_value="2026-10-13 12:00:00"),
			patch.object(api, "verify_payment", return_value={"data": {"code": "100", "ref_id": 12345}}),
			patch.object(api, "_enqueue_provision_paid_order") as enqueue,
		):
			api.zarinpal_callback()

		self.assertEqual(order.status, "Paid")
		self.assertEqual(order.payment_reference, "12345")
		enqueue.assert_not_called()
		self.assertIn("payment=paid", local.response["location"])

	def test_service_order_cannot_be_retried_through_app_or_site_provisioning(self):
		order = FakeDocument(name="ORDER-SERVICE", order_type="Asumi Service", status="Provisioning Failed")
		with (
			patch.object(api, "_require_commerce_admin"),
			patch.object(api.frappe, "get_doc", return_value=order),
			patch.object(api.frappe, "throw", side_effect=CheckoutRejected),
			patch.object(api, "_enqueue_provision_paid_order") as enqueue,
		):
			with self.assertRaises(CheckoutRejected):
				api.retry_provisioning(order.name)
			enqueue.assert_not_called()

	def test_service_order_is_never_processed_by_the_provisioning_worker(self):
		order = FakeDocument(name="ORDER-SERVICE", order_type="Asumi Service", status="Paid")
		with patch.object(api.frappe, "get_doc", return_value=order):
			self.assertEqual(api.provision_paid_order(order.name), "Paid")
		self.assertEqual(order.status, "Paid")
		self.assertFalse(hasattr(order, "provisioning_attempts"))

	def test_admin_settings_reads_and_saves_the_independent_service_sales_toggle(self):
		self.settings.allow_service_sales = 0
		with (
			patch.object(api, "_require_commerce_admin"),
			patch.object(api, "_get_settings", return_value=self.settings),
		):
			before = api.admin_settings()
			self.assertFalse(before["allow_service_sales"])
			result = api.save_admin_settings(
				enabled=True,
				allow_marketplace_app_sales=True,
				sandbox_mode=False,
				allow_service_sales=True,
			)

		self.assertTrue(result["allow_service_sales"])
		self.assertEqual(self.settings.allow_service_sales, 1)

	def test_manual_service_delivery_starts_one_month_only_when_marked_active(self):
		order = FakeDocument(name="ORDER-SERVICE", order_type="Asumi Service", interval="Monthly", status="Paid")
		with (
			patch.object(api, "_require_commerce_admin"),
			patch.object(api.frappe, "get_doc", return_value=order),
			patch.object(api.frappe.utils, "now_datetime", return_value=__import__("datetime").datetime(2026, 10, 13, 12)),
		):
			started = api.update_service_order_status(order.name, "Provisioning")
			self.assertEqual(started, {"name": order.name, "status": "Provisioning"})
			self.assertIsNone(getattr(order, "service_starts_at", None))
			activated = api.update_service_order_status(order.name, "Active")

		self.assertEqual(activated, {"name": order.name, "status": "Active"})
		self.assertEqual(str(order.service_starts_at), "2026-10-13 12:00:00")
		self.assertEqual(str(order.service_ends_at), "2026-11-13 12:00:00")

	def test_addon_order_activates_only_after_press_subscription_key_sync_succeeds(self):
		order = FakeDocument(
			name="ORDER-ADDON", order_type="Asumi Service", status="Provisioning",
			service_quote_snapshot='{"kind":"account_addon","addon_id":"assistant_ai"}',
		)
		starts_at = __import__("datetime").datetime(2026, 10, 14, 12)
		ends_at = __import__("datetime").datetime(2026, 11, 14, 12)
		with (
			patch.object(api, "_require_commerce_admin"),
			patch.object(api.frappe, "get_doc", return_value=order),
			patch.object(api, "issue_or_extend_addon_subscription", return_value=SimpleNamespace(starts_at=starts_at, ends_at=ends_at)) as issue,
		):
			result = api.update_service_order_status(order.name, "Active")

		self.assertEqual(result, {"name": order.name, "status": "Active"})
		issue.assert_called_once_with(order)
		self.assertEqual(order.status, "Active")
		self.assertEqual(order.service_starts_at, starts_at)
		self.assertEqual(order.service_ends_at, ends_at)

	def test_addon_key_sync_failure_leaves_order_pending_for_manual_retry(self):
		order = FakeDocument(
			name="ORDER-ADDON", order_type="Asumi Service", status="Provisioning",
			service_quote_snapshot='{"kind":"account_addon","addon_id":"assistant_ai"}',
		)
		with (
			patch.object(api, "_require_commerce_admin"),
			patch.object(api.frappe, "get_doc", return_value=order),
			patch.object(api, "issue_or_extend_addon_subscription", side_effect=api.AddonSubscriptionSyncError("همگام‌سازی ناموفق")),
			patch.object(api.frappe, "throw", side_effect=CheckoutRejected),
		):
			with self.assertRaises(CheckoutRejected):
				api.update_service_order_status(order.name, "Active")

		self.assertEqual(order.status, "Provisioning")
		self.assertEqual(order.provisioning_error, "همگام‌سازی ناموفق")
		self.assertFalse(hasattr(order, "service_starts_at"))

	def test_public_addon_validator_returns_only_access_state(self):
		with (
			patch.object(api, "_get_addon_offers", return_value={"assistant_ai": {"status": "Paid"}}),
			patch.object(api, "check_addon_subscription", return_value={
				"enabled": True, "status": "Paid", "expires_at": "2026-11-14 12:00:00"
			}) as check,
		):
			result = api.validate_addon_subscription("assistant_ai", "tenant.asumi.ir", "a" * 40)

		check.assert_called_once_with("assistant_ai", "tenant.asumi.ir", "a" * 40, {"status": "Paid"})
		self.assertEqual(set(result), {"enabled", "status", "expires_at"})
		self.assertNotIn("a" * 40, repr(result))

	def test_refund_revokes_only_the_subscription_created_by_that_order(self):
		order = FakeDocument(
			name="ORDER-ADDON", order_type="Asumi Service",
			service_quote_snapshot=(
				'{"kind":"account_addon","addon_id":"assistant_ai",'
				'"site_type":"Site","site_name":"tenant.asumi.ir"}'
			),
		)
		subscription = FakeDocument(name="ASAI-1", source_order=order.name)
		with (
			patch.object(api.frappe.db, "exists", return_value=True),
			patch.object(api.frappe, "get_doc", return_value=subscription),
			patch.object(api, "sync_addon_subscription_key") as sync,
		):
			api._revoke_refunded_addon(order)

		self.assertEqual(subscription.status, "Revoked")
		sync.assert_called_once_with(subscription, None)

	def test_refunding_an_older_addon_order_keeps_the_newer_renewal(self):
		order = FakeDocument(
			name="ORDER-OLD", order_type="Asumi Service",
			service_quote_snapshot=(
				'{"kind":"account_addon","addon_id":"assistant_ai",'
				'"site_type":"Site","site_name":"tenant.asumi.ir"}'
			),
		)
		subscription = FakeDocument(name="ASAI-1", source_order="ORDER-NEW", status="Active")
		with (
			patch.object(api.frappe.db, "exists", return_value=True),
			patch.object(api.frappe, "get_doc", return_value=subscription),
			patch.object(api, "sync_addon_subscription_key") as sync,
		):
			api._revoke_refunded_addon(order)

		self.assertEqual(subscription.status, "Active")
		sync.assert_not_called()

	@contextmanager
	def _purchase_context(self, *, prices=None, get_all=None):
		with ExitStack() as stack:
			for patcher in self.common_purchase_patches(prices=prices, get_all=get_all):
				stack.enter_context(patcher)
			yield stack

	@contextmanager
	def _addon_purchase_context(self, *, offers=None, get_all=None):
		if offers is None:
			offers = api.default_addon_offers()
			offers["assistant_ai"] = {"status": "Paid", "monthly_price_toman": 25_000}
		offers = {key: dict(value) for key, value in offers.items()}
		with ExitStack() as stack:
			for patcher in (
				patch.object(api.frappe, "session", SimpleNamespace(user=self.user)),
				patch.object(api, "get_current_team", return_value=self.team),
				patch.object(api, "is_user_part_of_team", return_value=True),
				patch.object(api, "_get_settings", return_value=self.settings),
				patch.object(api, "_get_addon_offers", return_value=offers),
				patch.object(api, "_addon_purchase_site", return_value={
					"name": "tenant.asumi.ir", "site_type": "Site", "installed_apps": ["accounts"]
				}),
				patch.object(api, "_acquire_transaction_lock", return_value=True),
				patch.object(api.frappe, "get_all", side_effect=get_all or (lambda *_a, **_k: [])),
				patch.object(
					api.frappe.db,
					"exists",
					side_effect=lambda doctype, name=None: doctype == "Currency" and name == "IRR",
				),
				patch.object(api.frappe.utils, "now_datetime", return_value="2026-10-13 12:00:00"),
			):
				stack.enter_context(patcher)
			yield stack


if __name__ == "__main__":
	unittest.main()


def run_mocked_tests():
	"""Run this module through Bench's initialized Python context."""
	suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	if not result.wasSuccessful():
		raise RuntimeError("Asumi service order API tests failed")
