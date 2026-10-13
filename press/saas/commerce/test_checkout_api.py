"""Mock-isolated tests for Asumi marketplace checkout and payment callbacks."""

import sys
import unittest
from contextlib import ExitStack, contextmanager
from types import SimpleNamespace
from unittest.mock import patch

from press.saas.commerce import api


class FakeDocument(SimpleNamespace):
	def as_dict(self):
		return dict(self.__dict__)

	def insert(self, **_kwargs):
		return self

	def db_set(self, fieldname, value=None, **_kwargs):
		if isinstance(fieldname, dict):
			self.__dict__.update(fieldname)
		else:
			setattr(self, fieldname, value)


class CheckoutRejected(Exception):
	pass


class MarketplaceCheckoutApiTest(unittest.TestCase):
	def setUp(self):
		self.user = "buyer@example.com"
		self.team = FakeDocument(name="TEAM-1", user=self.user, currency="USD")
		self.plan = FakeDocument(
			name="PLAN-1", app="MARKETPLACE-APP-1", enabled=1, interval="Monthly", title="Demo"
		)
		self.app = FakeDocument(name="MARKETPLACE-APP-1", app="demo_app", status="Published")
		self.snapshot = {
			"order_type": "Marketplace App",
			"plan_type": "Marketplace App Plan",
			"plan": "PLAN-1",
			"marketplace_app": "MARKETPLACE-APP-1",
			"app": "demo_app",
			"team": "TEAM-1",
			"customer": self.user,
			"currency": "IRR",
			"amount": 0,
			"site": "store.example.test",
			"installation_required": 1,
		}
		self.settings = FakeDocument(
			enabled=1,
			allow_marketplace_app_sales=1,
			allow_site_plan_sales=0,
			sandbox_mode=0,
		)
		self.settings.get_password = lambda *_args, **_kwargs: None
		self.order = FakeDocument(
			name="ORDER-1",
			status="Pending Payment",
			amount=55000,
			authority="AUTH-1",
			sandbox_mode=1,
			payment_error="",
			payment_reference=None,
			order_type="Marketplace App",
		)

	def purchase_patches(self, *, snapshot=None, db_exists=None, db_get_value=None, get_all=None):
		return (
			patch.object(api.frappe, "session", SimpleNamespace(user=self.user)),
			patch.object(api.frappe, "get_all", side_effect=get_all or (lambda *_a, **_k: [])),
			patch.object(api.frappe.db, "exists", side_effect=db_exists or (lambda doctype, name=None: doctype == "Currency" and name == "IRR")),
			patch.object(api.frappe.db, "get_value", side_effect=db_get_value or (lambda *_a, **_k: None)),
			patch.object(api, "get_current_team", return_value=self.team),
			patch.object(api, "_get_settings", return_value=self.settings),
			patch.object(api, "_marketplace_purchase_site", return_value={"name": "store.example.test"}),
			patch.object(api, "marketplace_app_order_snapshot", return_value=snapshot or self.snapshot),
			patch.object(api, "_acquire_transaction_lock", return_value=True),
		)

	def test_admin_marketplace_plan_choices_exclude_apps_blocked_from_storefront(self):
		apps = [
			SimpleNamespace(name="accounts", app="accounts", title="Hesabyar"),
			SimpleNamespace(name="frappe", app="frappe", title="Frappe Framework"),
			SimpleNamespace(name="raven", app="raven", title="Raven"),
			SimpleNamespace(name="sales", app="sales", title="Sales"),
		]
		with patch.object(api.frappe, "get_all", return_value=apps) as get_all:
			result = api._sellable_marketplace_app_rows(published_only=True)

		self.assertEqual([app.app for app in result], ["accounts"])
		self.assertEqual(get_all.call_args.kwargs["filters"], {"status": "Published"})

	def test_admin_cannot_assign_a_price_to_apps_excluded_from_the_storefront(self):
		for app in ("frappe", "raven", "sales"):
			with self.subTest(app=app):
				plan = FakeDocument(name=f"PLAN-{app.upper()}", app=app)
				with (
					patch.object(api, "_require_commerce_admin"),
					patch.object(api.frappe, "get_doc", return_value=plan),
					patch.object(api.frappe.db, "get_value", return_value=app),
					patch.object(api.frappe, "throw", side_effect=CheckoutRejected),
				):
					with self.assertRaises(CheckoutRejected):
						api.save_marketplace_plan_prices(
							plan.name, price_inr=0, price_usd=0, price_irr=10000
						)

	@contextmanager
	def purchase_context(self, **kwargs):
		with ExitStack() as stack:
			for context in self.purchase_patches(**kwargs):
				stack.enter_context(context)
			yield stack

	def test_free_purchase_marks_order_paid_and_queues_provisioning_without_gateway(self):
		created = []
		queued = []

		with self.purchase_context() as stack:
			stack.enter_context(patch.object(api.frappe, "get_doc", side_effect=self._purchase_get_doc(created)))
			stack.enter_context(patch.object(api.frappe.utils, "now_datetime", return_value="2026-10-13 12:00:00"))
			stack.enter_context(patch.object(api, "_enqueue_provision_paid_order", side_effect=queued.append))
			create_payment = stack.enter_context(patch.object(api, "create_payment"))
			result = api.start_marketplace_app_purchase("PLAN-1", "store.example.test")

		self.assertEqual(result, {"order": "ORDER-NEW", "free": True})
		self.assertEqual(len(created), 1)
		self.assertEqual(created[0].provider, "Free")
		self.assertEqual(created[0].status, "Paid")
		self.assertEqual(created[0].paid_at, "2026-10-13 12:00:00")
		self.assertEqual(queued, ["ORDER-NEW"])
		create_payment.assert_not_called()

	def test_paid_purchase_without_merchant_id_is_rejected_before_order_or_payment(self):
		paid_snapshot = {**self.snapshot, "amount": 55000}
		created = []

		with self.purchase_context(snapshot=paid_snapshot) as stack:
			stack.enter_context(patch.object(api.frappe, "get_doc", side_effect=self._purchase_get_doc(created)))
			stack.enter_context(patch.object(api.frappe, "throw", side_effect=CheckoutRejected))
			create_payment = stack.enter_context(patch.object(api, "create_payment"))
			with self.assertRaises(CheckoutRejected):
				api.start_marketplace_app_purchase("PLAN-1", "store.example.test")

		self.assertEqual(created, [])
		create_payment.assert_not_called()

	def test_free_purchase_returns_existing_active_order_without_duplicate_work(self):
		get_all_calls = []
		get_doc_calls = []

		def get_all(*args, **kwargs):
			get_all_calls.append((args, kwargs))
			return []

		with self.purchase_context(
			db_get_value=lambda *_a, **_k: "ORDER-ACTIVE",
			get_all=get_all,
		) as stack:
			stack.enter_context(patch.object(api.frappe, "get_doc", side_effect=self._purchase_get_doc(get_doc_calls)))
			enqueue = stack.enter_context(patch.object(api, "_enqueue_provision_paid_order"))
			result = api.start_marketplace_app_purchase("PLAN-1", "store.example.test")

		self.assertEqual(result, {"order": "ORDER-ACTIVE", "free": True, "already_active": True})
		self.assertEqual(get_doc_calls, [])
		self.assertEqual(get_all_calls, [])
		enqueue.assert_not_called()

	def test_callback_verifies_saved_order_amount_then_marks_paid_and_queues_once(self):
		response = {"data": {"code": "100", "ref_id": 12345}}
		local = SimpleNamespace(response={})

		with (
			patch.object(
				api.frappe,
				"form_dict",
				{"Status": "OK", "Authority": "AUTH-1", "Amount": "1"},
			),
			patch.object(api.frappe, "local", local),
			patch.object(api.frappe.db, "get_value", return_value="ORDER-1"),
			patch.object(api.frappe, "get_doc", return_value=self.order),
			patch.object(api, "_get_settings", return_value=self.settings),
			patch.object(api, "_merchant_id", return_value="merchant-secret"),
			patch.object(api.frappe.utils, "now_datetime", return_value="2026-10-13 12:00:00"),
			patch.object(api, "verify_payment", return_value=response) as verify,
			patch.object(api, "_enqueue_provision_paid_order") as enqueue,
		):
			api.zarinpal_callback()

		verify.assert_called_once_with(
			merchant_id="merchant-secret", amount=55000, authority="AUTH-1", sandbox=True
		)
		self.assertEqual(self.order.status, "Paid")
		self.assertEqual(self.order.payment_reference, "12345")
		self.assertEqual(self.order.payment_error, "")
		enqueue.assert_called_once_with("ORDER-1")
		self.assertEqual(local.response["location"], "/dashboard/orders?payment=paid&order=ORDER-1")

	def test_cancel_callback_does_not_change_order_or_call_gateway(self):
		local = SimpleNamespace(response={})
		with (
			patch.object(api.frappe, "form_dict", {"Status": "NOK", "Authority": "AUTH-1"}),
			patch.object(api.frappe, "local", local),
			patch.object(api.frappe.db, "get_value", return_value="ORDER-1"),
			patch.object(api.frappe, "get_doc", return_value=self.order),
			patch.object(api, "verify_payment") as verify,
			patch.object(api, "_enqueue_provision_paid_order") as enqueue,
		):
			api.zarinpal_callback()

		self.assertEqual(self.order.status, "Pending Payment")
		verify.assert_not_called()
		enqueue.assert_not_called()
		self.assertIn("payment=cancelled", local.response["location"])

	def test_callback_does_not_trust_cancel_or_failed_verification_and_retries_idempotently(self):
		local = SimpleNamespace(response={})
		with (
			patch.object(api.frappe, "form_dict", {"Status": "OK", "Authority": "AUTH-1"}),
			patch.object(api.frappe, "local", local),
			patch.object(api.frappe.db, "get_value", return_value="ORDER-1"),
			patch.object(api.frappe, "get_doc", return_value=self.order),
			patch.object(api, "_get_settings", return_value=self.settings),
			patch.object(api, "_merchant_id", return_value="merchant-secret"),
			patch.object(api.frappe.utils, "now_datetime", return_value="2026-10-13 12:00:00"),
			patch.object(api, "verify_payment", return_value={"data": {"code": "101", "ref_id": None}}),
			patch.object(api, "_enqueue_provision_paid_order") as enqueue,
		):
			api.zarinpal_callback()

		self.assertEqual(self.order.status, "Pending Payment")
		self.assertTrue(self.order.payment_error)
		enqueue.assert_not_called()
		self.assertIn("payment=not-verified", local.response["location"])

		self.order.status = "Paid"
		local.response.clear()
		with (
			patch.object(api.frappe, "form_dict", {"Status": "OK", "Authority": "AUTH-1"}),
			patch.object(api.frappe, "local", local),
			patch.object(api.frappe.db, "get_value", return_value="ORDER-1"),
			patch.object(api.frappe, "get_doc", return_value=self.order),
			patch.object(api, "verify_payment") as verify,
			patch.object(api, "_enqueue_provision_paid_order") as enqueue,
		):
			api.zarinpal_callback()

		verify.assert_not_called()
		enqueue.assert_called_once_with("ORDER-1")

	def _purchase_get_doc(self, created):
		def get_doc(doctype, name=None, **_kwargs):
			if isinstance(doctype, dict):
				order = FakeDocument(name="ORDER-NEW", status="Pending Payment", **doctype)
				created.append(order)
				return order
			if doctype == "Marketplace App Plan":
				return self.plan
			if doctype == "Marketplace App":
				return self.app
			raise AssertionError(f"Unexpected get_doc: {doctype} {name}")

		return get_doc


if __name__ == "__main__":
	unittest.main()


def run_mocked_tests():
	"""Run this module through Bench's initialized Python context."""
	suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	if not result.wasSuccessful():
		raise RuntimeError("Commerce checkout API tests failed")
