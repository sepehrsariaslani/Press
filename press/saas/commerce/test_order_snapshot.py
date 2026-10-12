import unittest

from press.saas.commerce.order_snapshot import marketplace_app_order_snapshot


class MarketplaceAppOrderSnapshotTest(unittest.TestCase):
	def setUp(self):
		self.plan = {"name": "PLAN-1", "app": "MARKETPLACE-APP-1", "enabled": 1, "price_irr": 125000, "interval": "Monthly"}
		self.app = {"name": "MARKETPLACE-APP-1", "app": "APP-1", "status": "Published"}
		self.site = {"name": "site-1", "team": "team-1", "status": "Active", "installed_apps": ["APP-1"]}
		self.team = {"name": "team-1", "currency": "IRR"}

	def test_uses_server_price_and_ignores_no_client_amount(self):
		snapshot = marketplace_app_order_snapshot(self.plan, self.app, self.site, self.team, "buyer@example.com")
		self.assertEqual(snapshot["amount"], 125000)
		self.assertEqual(snapshot["currency"], "IRR")
		self.assertNotIn("client_amount", snapshot)

	def test_rejects_unpublished_or_disabled_products(self):
		self.plan["enabled"] = 0
		with self.assertRaises(ValueError):
			marketplace_app_order_snapshot(self.plan, self.app, self.site, self.team, "buyer@example.com")
		self.plan["enabled"] = 1
		self.app["status"] = "Draft"
		with self.assertRaises(ValueError):
			marketplace_app_order_snapshot(self.plan, self.app, self.site, self.team, "buyer@example.com")

	def test_rejects_unowned_site_or_missing_app(self):
		self.site["team"] = "another-team"
		with self.assertRaises(ValueError):
			marketplace_app_order_snapshot(self.plan, self.app, self.site, self.team, "buyer@example.com")
		self.site["team"] = "team-1"
		self.site["installed_apps"] = []
		with self.assertRaises(ValueError):
			marketplace_app_order_snapshot(self.plan, self.app, self.site, self.team, "buyer@example.com")

	def test_checkout_uses_irr_independent_of_team_accounting_currency(self):
		self.team["currency"] = "USD"
		snapshot = marketplace_app_order_snapshot(self.plan, self.app, self.site, self.team, "buyer@example.com")
		self.assertEqual(snapshot["currency"], "IRR")
		self.assertEqual(snapshot["amount"], 125000)

	def test_accepts_whole_number_currency_values_from_database(self):
		self.plan["price_irr"] = 125000.0
		snapshot = marketplace_app_order_snapshot(self.plan, self.app, self.site, self.team, "buyer@example.com")
		self.assertEqual(snapshot["amount"], 125000)

	def test_rejects_missing_billing_interval(self):
		self.plan["interval"] = None
		with self.assertRaises(ValueError):
			marketplace_app_order_snapshot(self.plan, self.app, self.site, self.team, "buyer@example.com")
		self.team["currency"] = "IRR"
		self.plan["price_irr"] = 1000.5
		with self.assertRaises(ValueError):
			marketplace_app_order_snapshot(self.plan, self.app, self.site, self.team, "buyer@example.com")


if __name__ == "__main__":
	unittest.main()
