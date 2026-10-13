import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from press.saas.commerce import api


class NativeHostingOrderTest(unittest.TestCase):
	def setUp(self):
		api.frappe.local.db = MagicMock()
		api.frappe.local.session = SimpleNamespace(user="Administrator")

	def make_order(self, **changes):
		values = {
			"name": "ASUMI-ORDER-1",
			"status": "Provisioning",
			"order_type": "Hosting",
			"service_delivery_mode": "Create New Site",
			"provider": "ZarinPal",
			"sandbox_mode": 0,
			"currency": "IRR",
			"amount": 25_000,
			"payment_reference": "ZP-VERIFIED-1",
			"paid_at": "2026-10-13 12:00:00",
			"customer": "buyer@example.com",
			"team": "TEAM-1",
			"plan": "ASUMI-PUBLIC",
			"interval": "Monthly",
			"subdomain": "my-shop",
			"apps": '["accounts"]',
			"site": None,
			"docker_site": None,
		}
		values.update(changes)
		order = MagicMock()
		for key, value in values.items():
			setattr(order, key, value)
		order.as_dict.return_value = values
		order.db_set.side_effect = lambda update: [setattr(order, key, value) for key, value in update.items()]
		return order

	def configure_creation(self, order):
		plan = SimpleNamespace(
			document_type="Site",
			enabled=1,
			price_irr=25_000,
			interval="Monthly",
			commerce_delivery_mode="Create New Site",
			name="ASUMI-PUBLIC",
		)
		target = {
			"domain": "asumi.ir", "cluster": "IR", "group": "PUBLIC-V16", "version": "version-16",
			"apps": ["frappe", "accounts"], "bench": "PUBLIC-BENCH", "server": "PUBLIC-SERVER",
		}
		doc_exists = MagicMock(return_value=False)
		return plan, target, doc_exists

	def test_verified_order_creates_exactly_one_native_press_site_and_links_agent_job(self):
		order = self.make_order()
		plan, target, doc_exists = self.configure_creation(order)
		with (
			patch.object(api.frappe, "get_doc", side_effect=[plan, SimpleNamespace(enabled=1)]),
			patch.object(api.frappe.local.db, "exists", doc_exists),
			patch.object(api, "_hosting_access_email_ready", return_value=True),
			patch.object(api, "_new_site_plan_config", return_value=target),
			patch.object(api, "_acquire_transaction_lock", return_value=True),
			patch.object(api.frappe, "set_user"),
			patch("press.api.site._new", return_value={"site": "my-shop.asumi.ir", "job": "AGENT-JOB-1"}) as create_site,
		):
			result = api._provision_hosting_order(order)

		self.assertEqual(result, "Provisioning")
		self.assertEqual(order.site, "my-shop.asumi.ir")
		self.assertEqual(order.agent_job, "AGENT-JOB-1")
		create_site.assert_called_once()
		args, kwargs = create_site.call_args
		self.assertEqual(
			args[0],
			{
				"name": "my-shop", "domain": "asumi.ir", "cluster": "IR", "group": "PUBLIC-V16",
				"version": "version-16", "plan": "ASUMI-PUBLIC", "apps": ["frappe", "accounts"],
			},
		)
		self.assertEqual(kwargs, {"server": "PUBLIC-SERVER", "commerce_hosting_order": "ASUMI-ORDER-1"})
		self.assertNotIn("docker_site", order.db_set.call_args.args[0])

	def test_unverified_payment_or_unsupported_app_never_creates_a_press_site(self):
		for changes in ({"sandbox_mode": 1}, {"payment_reference": ""}, {"apps": '["unsupported"]'}):
			with self.subTest(changes=changes):
				order = self.make_order(**changes)
				plan, target, doc_exists = self.configure_creation(order)
				with (
					patch.object(api.frappe, "get_doc", side_effect=[plan, SimpleNamespace(enabled=1)]),
					patch.object(api.frappe.local.db, "exists", doc_exists),
					patch.object(api, "_hosting_access_email_ready", return_value=True),
					patch.object(api, "_new_site_plan_config", return_value=target),
					patch.object(api, "_acquire_transaction_lock", return_value=True),
					patch.object(api.frappe, "set_user"),
					patch("press.api.site._new") as create_site,
					patch.object(api.frappe, "throw", side_effect=ValueError("rejected")),
				):
					with self.assertRaises(ValueError):
						api._provision_hosting_order(order)
				create_site.assert_not_called()

	def test_an_existing_pending_site_is_waited_on_without_creating_a_duplicate(self):
		order = self.make_order(site="my-shop.asumi.ir")
		site = SimpleNamespace(
			status="Pending", team="TEAM-1", plan="ASUMI-PUBLIC", subdomain="my-shop",
			domain="asumi.ir", name="my-shop.asumi.ir", as_dict=lambda: {
				"status": "Pending", "team": "TEAM-1", "plan": "ASUMI-PUBLIC", "subdomain": "my-shop",
				"domain": "asumi.ir", "name": "my-shop.asumi.ir",
			},
			reload=lambda: None,
		)
		plan = SimpleNamespace(
			document_type="Site", enabled=1, price_irr=25_000, interval="Monthly",
			commerce_delivery_mode="Create New Site",
		)
		with patch.object(api.frappe, "get_doc", side_effect=[plan, site]), patch("press.api.site._new") as create_site:
			self.assertEqual(api._provision_hosting_order(order), "Provisioning")
		create_site.assert_not_called()

	def test_agent_callback_activates_only_the_exact_linked_site_and_plan(self):
		doc = SimpleNamespace(
			doctype="Site", status="Active", name="my-shop.asumi.ir", team="TEAM-1",
			plan="ASUMI-PUBLIC", subdomain="my-shop", domain="asumi.ir",
		)
		matching_order = SimpleNamespace(
			name="ASUMI-ORDER-1", status="Provisioning", site=doc.name, team=doc.team,
			plan=doc.plan, subdomain=doc.subdomain, db_set=MagicMock(),
		)
		self.assertEqual(api.new_site_hosting_order_action(doc.status, matching_order.status), "activate")
		self.assertEqual(doc.name, f"{doc.subdomain}.{api.ASUMI_ROOT_DOMAIN}")
		self.assertTrue(
			matching_order.site == doc.name
			and matching_order.team == doc.team
			and matching_order.plan == doc.plan
			and matching_order.subdomain == doc.subdomain
		)

		with (
			patch.object(api.frappe, "get_all", return_value=[SimpleNamespace(name=matching_order.name)]),
			patch.object(api.frappe, "get_doc", return_value=matching_order),
			patch.object(api, "_activate_hosting_order") as activate,
		):
			api.activate_new_site_commerce_orders(doc)

		activate.assert_called_once_with(matching_order)
		matching_order.db_set.assert_not_called()

	def test_agent_callback_fails_a_mismatched_order_instead_of_leaving_it_pending(self):
		doc = SimpleNamespace(
			doctype="Site", status="Active", name="my-shop.asumi.ir", team="TEAM-1",
			plan="ASUMI-PUBLIC", subdomain="my-shop", domain="asumi.ir",
		)
		for field, value in (
			("site", "other-shop.asumi.ir"), ("team", "OTHER-TEAM"),
			("plan", "OTHER-PLAN"), ("subdomain", "other-shop"),
		):
			with self.subTest(field=field):
				order_values = {
					"name": "ASUMI-ORDER-1", "status": "Provisioning", "site": doc.name,
					"team": doc.team, "plan": doc.plan, "subdomain": doc.subdomain,
				}
				order_values[field] = value
				order = SimpleNamespace(**order_values, db_set=MagicMock())

				with (
					patch.object(api.frappe, "get_all", return_value=[SimpleNamespace(name=order.name)]),
					patch.object(api.frappe, "get_doc", return_value=order),
					patch.object(api, "_activate_hosting_order") as activate,
				):
					api.activate_new_site_commerce_orders(doc)

				activate.assert_not_called()
				order.db_set.assert_called_once()
				self.assertEqual(order.db_set.call_args.args[0]["status"], "Provisioning Failed")

	def test_agent_callback_fails_a_site_outside_the_asumi_root_domain(self):
		doc = SimpleNamespace(
			doctype="Site", status="Active", name="my-shop.other.example", team="TEAM-1",
			plan="ASUMI-PUBLIC", subdomain="my-shop", domain="other.example",
		)
		order = SimpleNamespace(
			name="ASUMI-ORDER-1", status="Provisioning", site=doc.name, team=doc.team,
			plan=doc.plan, subdomain=doc.subdomain, db_set=MagicMock(),
		)
		with (
			patch.object(api.frappe, "get_all", return_value=[SimpleNamespace(name=order.name)]),
			patch.object(api.frappe, "get_doc", return_value=order),
			patch.object(api, "_activate_hosting_order") as activate,
		):
			api.activate_new_site_commerce_orders(doc)

		activate.assert_not_called()
		self.assertEqual(order.db_set.call_args.args[0]["status"], "Provisioning Failed")

	def test_agent_callback_marks_a_broken_site_as_provisioning_failed(self):
		doc = SimpleNamespace(
			doctype="Site", status="Broken", name="my-shop.asumi.ir", team="TEAM-1",
			plan="ASUMI-PUBLIC", subdomain="my-shop", domain="asumi.ir",
		)
		order = SimpleNamespace(
			name="ASUMI-ORDER-1", status="Provisioning", site=doc.name, team=doc.team,
			plan=doc.plan, subdomain=doc.subdomain, db_set=MagicMock(),
		)
		with (
			patch.object(api.frappe, "get_all", return_value=[SimpleNamespace(name=order.name)]),
			patch.object(api.frappe, "get_doc", return_value=order),
			patch.object(api, "_activate_hosting_order") as activate,
		):
			api.activate_new_site_commerce_orders(doc)

		activate.assert_not_called()
		self.assertEqual(order.db_set.call_args.args[0]["status"], "Provisioning Failed")

	def test_admin_site_plan_payload_keeps_required_frappe_app(self):
		plan = SimpleNamespace(name="ASUMI-PUBLIC", commerce_delivery_mode="Create New Site")
		rows = [
			[plan],
			[SimpleNamespace(parent=plan.name, release_group="PUBLIC-V16")],
			[
				SimpleNamespace(parent=plan.name, app="frappe"),
				SimpleNamespace(parent=plan.name, app="accounts"),
			],
		]
		with (
			patch.object(api, "_require_commerce_admin"),
			patch.object(api.frappe, "get_all", side_effect=rows),
		):
			result = api.admin_site_plans()

		self.assertEqual(result[0].allowed_apps, ["frappe", "accounts"])


if __name__ == "__main__":
	unittest.main()
