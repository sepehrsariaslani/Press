import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from press.saas.commerce import api
from press.press.doctype.deploy_candidate.deploy_candidate import DeployCandidate


class FakeDoc(dict):
	def __getattr__(self, key):
		try:
			return self[key]
		except KeyError as error:
			raise AttributeError(key) from error

	def __setattr__(self, key, value):
		self[key] = value

	def as_dict(self):
		return dict(self)

	def db_set(self, values, value=None):
		if isinstance(values, dict):
			self.update(values)
		else:
			self[values] = value

	def reload(self):
		return self

	def save(self, **kwargs):
		return self


def make_order(**changes):
	return FakeDoc(
		{
			"name": "ORDER-1",
			"status": "Paid",
			"order_type": "Hosting",
			"service_delivery_mode": "Create New Site",
			"provider": "ZarinPal",
			"sandbox_mode": 0,
			"payment_reference": "ZP-REF-1",
			"paid_at": "2026-10-13 12:00:00",
			"plan": "HOSTIRAN-PLAN",
			"amount": 600_000_000,
			"currency": "IRR",
			"interval": "Monthly",
			"team": "CUSTOMER-TEAM",
			"customer": "buyer@example.com",
			"subdomain": "my-business",
			"site": None,
			"docker_site": None,
			"apps": '["accounts"]',
			"hostiran_product_code_snapshot": "VPS-3-IR",
			"hostiran_monthly_cost_irr_snapshot": 24_900_000,
			"hostiran_fulfillment_status": "Awaiting VPS",
			"hostiran_server": None,
			"hostiran_order_reference": None,
			"hostiran_site_group_deploy": None,
			"provisioning_attempts": 0,
			**changes,
		}
	)


def make_plan():
	return FakeDoc(
		{
			"name": "HOSTIRAN-PLAN",
			"enabled": 1,
			"document_type": "Site",
			"commerce_delivery_mode": "Create New Site",
			"dedicated_server_plan": 1,
			"private_bench_support": 1,
			"price_irr": 600_000_000,
			"interval": "Monthly",
			"hostiran_product_code": "VPS-3-IR",
			"hostiran_monthly_cost_irr": 24_900_000,
		}
	)


def make_server(**changes):
	return FakeDoc(
		{
			"name": "HOSTIRAN-SERVER-1",
			"title": "Customer VPS",
			"ip": "203.0.113.10",
			"team": "CUSTOMER-TEAM",
			"status": "Active",
			"public": 0,
			"is_server_setup": 1,
			"is_standalone": 1,
			"is_standalone_setup": 1,
			"is_self_hosted": 1,
			"cluster": "IR-CLUSTER",
			"provider": "Generic",
			"ram": 4,
			**changes,
		}
	)


class HostIranAdminApiTest(unittest.TestCase):
	def setUp(self):
		self.previous_db = getattr(api.frappe.local, "db", None)
		self.previous_session = getattr(api.frappe.local, "session", None)
		api.frappe.local.db = MagicMock()
		api.frappe.local.session = FakeDoc({"user": "admin@example.com"})

	def tearDown(self):
		if self.previous_db is None:
			del api.frappe.local.db
		else:
			api.frappe.local.db = self.previous_db
		if self.previous_session is None:
			try:
				delattr(api.frappe.local, "session")
			except AttributeError:
				pass
		else:
			api.frappe.local.session = self.previous_session

	def test_server_options_only_include_ready_unassigned_self_hosted_servers_for_order_team(self):
		order = make_order()
		candidate = make_server()
		shared_server = make_server(name="SHARED", is_self_hosted=0)

		def get_all(doctype, **kwargs):
			if doctype == "Server":
				self.assertEqual(kwargs["filters"]["team"], order.team)
				return [candidate, shared_server]
			if doctype in {"Commerce Order", "Bench"}:
				return []
			self.fail(f"Unexpected DocType: {doctype}")

		with (
			patch.object(api, "_require_commerce_admin"),
			patch.object(api.frappe, "get_doc", return_value=order),
			patch.object(api.frappe, "get_all", side_effect=get_all),
		):
			result = api.admin_hostiran_server_options(order.name)

		self.assertEqual([server["name"] for server in result["servers"]], [candidate.name])
		self.assertEqual(result["servers"][0]["ip"], candidate.ip)

	def test_prepare_hostiran_site_connects_paid_order_to_one_private_bench_deployment(self):
		order = make_order()
		plan = make_plan()
		server = make_server()
		team = FakeDoc({"name": order.team, "user": "owner@example.com", "enabled": 1})
		stable_version = FakeDoc({"name": "Version 16"})
		created = {}

		def get_doc(doctype, name=None, **kwargs):
			return {
				"Commerce Order": order,
				"Site Plan": plan,
				"Server": server,
				"Team": team,
			}[doctype]

		def get_all(doctype, **kwargs):
			if doctype == "Commerce Order":
				return []
			if doctype == "Bench":
				return []
			if doctype == "Frappe Version":
				return [stable_version]
			self.fail(f"Unexpected DocType: {doctype}")

		def create_deployment(**kwargs):
			created.update(kwargs)
			return {"site_group_deploy": "SGD-1"}

		previous_team_name = getattr(api.frappe.local, "team_name", None)
		with (
			patch.object(api, "_require_commerce_admin"),
			patch.object(api, "_acquire_transaction_lock", return_value=True),
			patch.object(api, "_new_site_plan_config", return_value={"domain": "asumi.ir", "apps": ["frappe", "accounts"]}),
			patch.object(api.frappe, "get_doc", side_effect=get_doc),
			patch.object(api.frappe, "get_all", side_effect=get_all),
			patch.object(api.frappe.db, "exists", return_value=False),
			patch.object(api.frappe.db, "get_single_value", return_value="asumi.ir"),
			patch.object(api.frappe.db, "count", return_value=0),
			patch.object(api.frappe.db, "savepoint"),
			patch.object(api.frappe, "set_user"),
			patch("press.api.site.create_site_on_private_bench", side_effect=create_deployment),
		):
			try:
				result = api.admin_prepare_hostiran_site(order.name, server.name, "HOSTIRAN-ORDER-123")
			finally:
				if previous_team_name is None:
					try:
						delattr(api.frappe.local, "team_name")
					except AttributeError:
						pass
				else:
					api.frappe.local.team_name = previous_team_name

		self.assertEqual(result["hostiran_site_group_deploy"], "SGD-1")
		self.assertEqual(created["server"], server.name)
		self.assertEqual(created["apps"], ["frappe", "accounts"])
		self.assertEqual(created["commerce_order"], order.name)
		self.assertEqual(order.status, "Provisioning")
		self.assertEqual(order.hostiran_fulfillment_status, "Deploying Bench")
		self.assertEqual(order.hostiran_server, server.name)
		self.assertEqual(order.hostiran_order_reference, "HOSTIRAN-ORDER-123")

	def test_site_group_deploy_failure_is_reflected_as_safe_order_failure(self):
		order = make_order(
			status="Provisioning",
			hostiran_fulfillment_status="Deploying Bench",
			hostiran_server="HOSTIRAN-SERVER-1",
			hostiran_order_reference="HOSTIRAN-ORDER-123",
			hostiran_site_group_deploy="SGD-1",
		)
		deployment = FakeDoc(
			{
				"doctype": "Site Group Deploy",
				"name": "SGD-1",
				"commerce_order": order.name,
				"team": order.team,
				"site_plan": order.plan,
				"subdomain": order.subdomain,
				"server": order.hostiran_server,
				"cluster": "IR-CLUSTER",
				"status": "Bench Deploy Failed",
				"site": None,
			}
		)
		with patch.object(api.frappe, "get_doc", return_value=order):
			api.update_hostiran_order_from_site_group_deploy(deployment)

		self.assertEqual(order.status, "Provisioning Failed")
		self.assertEqual(order.hostiran_fulfillment_status, "Failed")
		self.assertIn("راه‌اندازی", order.provisioning_error)

	def test_site_group_deploy_progress_updates_link_and_customer_safe_stage(self):
		order = make_order(
			status="Provisioning",
			hostiran_fulfillment_status="Deploying Bench",
			hostiran_server="HOSTIRAN-SERVER-1",
			hostiran_order_reference="HOSTIRAN-ORDER-123",
		)
		deployment = FakeDoc(
			{
				"doctype": "Site Group Deploy",
				"name": "SGD-1",
				"commerce_order": order.name,
				"team": order.team,
				"site_plan": order.plan,
				"subdomain": order.subdomain,
				"server": order.hostiran_server,
				"cluster": "IR-CLUSTER",
				"status": "Creating Site",
				"site": "my-business.asumi.ir",
			}
		)
		with (
			patch.object(api.frappe, "get_doc", return_value=order),
			patch.object(api.frappe.db, "get_value", return_value=FakeDoc({
				"name": "my-business.asumi.ir",
				"team": order.team,
				"plan": order.plan,
				"subdomain": order.subdomain,
				"domain": "asumi.ir",
				"status": "Installing",
			})),
		):
			api.update_hostiran_order_from_site_group_deploy(deployment)

		self.assertEqual(order.site, deployment.site)
		self.assertEqual(order.hostiran_site_group_deploy, deployment.name)
		self.assertEqual(order.hostiran_fulfillment_status, "Creating Site")
		self.assertEqual(order.status, "Provisioning")

	def test_retry_after_bench_failure_reuses_the_same_hostiran_deployment(self):
		order = make_order(
			status="Provisioning Failed",
			hostiran_fulfillment_status="Failed",
			hostiran_server="HOSTIRAN-SERVER-1",
			hostiran_order_reference="HOSTIRAN-ORDER-123",
			hostiran_site_group_deploy="SGD-1",
		)
		deployment = FakeDoc(
			{
				"doctype": "Site Group Deploy",
				"name": "SGD-1",
				"status": "Bench Deploy Failed",
				"release_group": "RG-1",
				"site": None,
				"server": order.hostiran_server,
				"commerce_order": order.name,
				"team": order.team,
				"site_plan": order.plan,
				"subdomain": order.subdomain,
			}
		)
		plan = make_plan()
		server = make_server()
		release_group = FakeDoc(
			{"name": "RG-1", "team": order.team, "server": server.name, "initial_deploy": MagicMock()}
		)
		get_doc = MagicMock(side_effect=[order, deployment, plan, server, release_group])
		with (
			patch.object(api, "_require_commerce_admin"),
			patch.object(api.frappe, "get_doc", get_doc),
			patch.object(api, "_acquire_transaction_lock", return_value=True),
			patch.object(api, "_enqueue_provision_paid_order"),
		):
			result = api.retry_provisioning(order.name)

		self.assertTrue(result["queued"])
		release_group.initial_deploy.assert_called_once_with()
		self.assertEqual(order.status, "Provisioning")
		self.assertEqual(order.hostiran_fulfillment_status, "Deploying Bench")

	def test_deploy_candidate_failure_saves_site_group_deploy_so_order_hook_runs(self):
		deployment = SimpleNamespace(name="SGD-1", status="Deploying Bench", save=MagicMock())
		candidate = SimpleNamespace(group="RG-1")
		with (
			patch.object(api.frappe.db, "get_value", return_value=deployment.name),
			patch.object(api.frappe.db, "set_value") as set_value,
			patch.object(api.frappe, "get_doc", return_value=deployment),
		):
			DeployCandidate._fail_site_group_deploy_if_exists(candidate)

		self.assertEqual(deployment.status, "Bench Deploy Failed")
		deployment.save.assert_called_once_with(ignore_permissions=True)
		set_value.assert_not_called()

	def test_customer_orders_expose_fulfillment_stage_without_hostiran_internal_fields(self):
		with (
			patch.object(api, "get_current_team", return_value="CUSTOMER-TEAM"),
			patch.object(api.frappe, "get_all", return_value=[]) as get_all,
		):
			api.my_orders()

		fields = set(get_all.call_args.kwargs["fields"])
		self.assertIn("hostiran_fulfillment_status", fields)
		self.assertTrue(
			{"hostiran_server", "hostiran_order_reference", "hostiran_site_group_deploy"}.isdisjoint(fields)
		)

	def test_admin_orders_include_hostiran_delivery_audit_fields(self):
		with (
			patch.object(api, "_require_commerce_admin"),
			patch.object(api.frappe, "get_all", return_value=[]) as get_all,
		):
			api.admin_orders()

		fields = set(get_all.call_args.kwargs["fields"])
		self.assertTrue(
			{
				"hostiran_fulfillment_status",
				"hostiran_product_code_snapshot",
				"hostiran_monthly_cost_irr_snapshot",
				"hostiran_server",
				"hostiran_order_reference",
				"hostiran_site_group_deploy",
			}.issubset(fields)
		)


if __name__ == "__main__":
	unittest.main()
