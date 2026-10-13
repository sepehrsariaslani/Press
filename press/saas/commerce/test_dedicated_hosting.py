import unittest

from press.saas.commerce.dedicated_hosting import (
	is_verified_hostiran_deployment,
	validate_hostiran_fulfillment,
)


class DedicatedHostingTest(unittest.TestCase):
	def setUp(self):
		self.order = {
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
			"subdomain": "my-business",
			"site": None,
			"docker_site": None,
			"hostiran_product_code_snapshot": "VPS-3-IR",
			"hostiran_monthly_cost_irr_snapshot": 24_900_000,
		}
		self.plan = {
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
		self.server = {
			"name": "HOSTIRAN-SERVER-1",
			"team": "CUSTOMER-TEAM",
			"status": "Active",
			"public": 0,
			"is_server_setup": 1,
			"is_standalone": 1,
			"is_standalone_setup": 1,
			"is_self_hosted": 1,
			"cluster": "IR-CLUSTER",
		}

	def test_accepts_a_paid_new_site_order_and_ready_private_server(self):
		result = validate_hostiran_fulfillment(
			self.order, self.plan, self.server, "HOSTIRAN-ORDER-123"
		)

		self.assertEqual(result["provider_reference"], "HOSTIRAN-ORDER-123")
		self.assertEqual(result["server"], "HOSTIRAN-SERVER-1")
		self.assertEqual(result["cluster"], "IR-CLUSTER")

	def test_accepts_the_deploying_state_while_press_creates_the_private_bench(self):
		result = validate_hostiran_fulfillment(
			self.order | {"status": "Provisioning", "hostiran_fulfillment_status": "Deploying Bench"},
			self.plan,
			self.server,
			"HOSTIRAN-ORDER-123",
		)

		self.assertEqual(result["server"], "HOSTIRAN-SERVER-1")

	def test_verifies_order_progress_after_private_bench_deployment_enters_site_creation(self):
		order = self.order | {
			"status": "Provisioning",
			"hostiran_fulfillment_status": "Creating Site",
			"hostiran_server": self.server["name"],
			"hostiran_order_reference": "HOSTIRAN-ORDER-123",
		}
		deployment = {
			"commerce_order": order["name"],
			"team": order["team"],
			"site_plan": order["plan"],
			"subdomain": order["subdomain"],
			"server": self.server["name"],
			"cluster": self.server["cluster"],
		}

		self.assertTrue(is_verified_hostiran_deployment(order, deployment))

	def test_rejects_unverified_payment_or_sandbox_order(self):
		for changes in (
			{"payment_reference": ""},
			{"provider": "Free"},
			{"sandbox_mode": 1},
			{"status": "Pending Payment"},
		):
			with self.subTest(changes=changes), self.assertRaises(ValueError):
				validate_hostiran_fulfillment(self.order | changes, self.plan, self.server, "REF")

	def test_rejects_server_from_another_team_or_shared_public_pool(self):
		for changes in (
			{"team": "OTHER-TEAM"},
			{"public": 1},
			{"is_server_setup": 0},
			{"is_standalone_setup": 0},
			{"is_self_hosted": 0},
		):
			with self.subTest(changes=changes), self.assertRaises(ValueError):
				validate_hostiran_fulfillment(self.order, self.plan, self.server | changes, "REF")

	def test_rejects_plan_snapshot_mismatch_and_invalid_hostiran_reference(self):
		with self.assertRaises(ValueError):
			validate_hostiran_fulfillment(self.order, self.plan | {"hostiran_product_code": "VPS-4-IR"}, self.server, "REF")
		for reference in ("", "x" * 121, "ref\nsecret"):
			with self.subTest(reference=reference), self.assertRaises(ValueError):
				validate_hostiran_fulfillment(self.order, self.plan, self.server, reference)


if __name__ == "__main__":
	unittest.main()
