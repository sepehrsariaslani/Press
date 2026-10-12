import unittest

from press.saas.commerce.order_snapshot import hosting_order_snapshot, marketplace_app_order_snapshot


class MarketplaceAppOrderSnapshotTest(unittest.TestCase):
	def setUp(self):
		self.plan = {
			"name": "PLAN-1",
			"app": "MARKETPLACE-APP-1",
			"enabled": 1,
			"price_irr": 125000,
			"interval": "Monthly",
		}
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

	def test_marketplace_order_can_target_an_owned_docker_control_site(self):
		docker_site = {
			"name": "veederakht.ir",
			"team": "team-1",
			"status": "Active",
			"enabled": 1,
			"site_type": "Docker Control Site",
			"installed_apps": ["APP-1"],
		}
		snapshot = marketplace_app_order_snapshot(
			self.plan, self.app, docker_site, self.team, "buyer@example.com"
		)
		self.assertEqual(snapshot["docker_site"], "veederakht.ir")
		self.assertNotIn("site", snapshot)

	def test_marketplace_order_rejects_disabled_or_unowned_docker_site(self):
		docker_site = {
			"name": "veederakht.ir",
			"team": "team-1",
			"status": "Active",
			"enabled": 0,
			"site_type": "Docker Control Site",
			"installed_apps": ["APP-1"],
		}
		with self.assertRaises(ValueError):
			marketplace_app_order_snapshot(
				self.plan, self.app, docker_site, self.team, "buyer@example.com"
			)
		docker_site.update(enabled=1, team="another-team")
		with self.assertRaises(ValueError):
			marketplace_app_order_snapshot(
				self.plan, self.app, docker_site, self.team, "buyer@example.com"
			)

	def test_accepts_whole_number_currency_values_from_database(self):
		self.plan["price_irr"] = 125000.0
		snapshot = marketplace_app_order_snapshot(self.plan, self.app, self.site, self.team, "buyer@example.com")
		self.assertEqual(snapshot["amount"], 125000)

	def test_accepts_zarinpal_minimum_and_rejects_lower_positive_prices(self):
		self.plan["price_irr"] = 10000
		self.assertEqual(
			marketplace_app_order_snapshot(self.plan, self.app, self.site, self.team, "buyer@example.com")["amount"],
			10000,
		)
		for amount in (1, 9999):
			with self.subTest(amount=amount):
				self.plan["price_irr"] = amount
				with self.assertRaises(ValueError):
					marketplace_app_order_snapshot(self.plan, self.app, self.site, self.team, "buyer@example.com")

	def test_zero_price_plan_can_be_claimed_without_payment(self):
		self.plan["price_irr"] = 0
		snapshot = marketplace_app_order_snapshot(
			self.plan, self.app, self.site, self.team, "buyer@example.com"
		)
		self.assertEqual(snapshot["amount"], 0)
		self.assertEqual(snapshot["currency"], "IRR")

	def test_free_plan_still_rejects_negative_or_fractional_prices(self):
		for amount in (-1, 0.5):
			with self.subTest(amount=amount):
				self.plan["price_irr"] = amount
				with self.assertRaises(ValueError):
					marketplace_app_order_snapshot(
						self.plan, self.app, self.site, self.team, "buyer@example.com"
					)

	def test_rejects_missing_billing_interval(self):
		self.plan["interval"] = None
		with self.assertRaises(ValueError):
			marketplace_app_order_snapshot(self.plan, self.app, self.site, self.team, "buyer@example.com")
		self.team["currency"] = "IRR"
		self.plan["price_irr"] = 1000.5
		with self.assertRaises(ValueError):
			marketplace_app_order_snapshot(self.plan, self.app, self.site, self.team, "buyer@example.com")


class HostingOrderSnapshotTest(unittest.TestCase):
	def setUp(self):
		self.plan = {
			"name": "SITE-PLAN-1",
			"plan_title": "Asumi Hosting",
			"document_type": "Site",
			"enabled": 1,
			"price_irr": 250000,
			"interval": "Monthly",
			"commerce_delivery_mode": "Upgrade Existing Site",
		}
		self.team = {"name": "team-1", "currency": "USD"}
		self.site = {
			"name": "team1.asumi.ir",
			"team": "team-1",
			"status": "Active",
			"plan": "FREE-PLAN",
		}

	def test_snapshots_paid_existing_site_upgrade_from_server_values(self):
		snapshot = hosting_order_snapshot(self.plan, self.team, "buyer@example.com", site=self.site)
		self.assertEqual(snapshot["order_type"], "Hosting")
		self.assertEqual(snapshot["plan_type"], "Site Plan")
		self.assertEqual(snapshot["site"], self.site["name"])
		self.assertEqual(snapshot["original_plan"], "FREE-PLAN")
		self.assertEqual(snapshot["amount"], 250000)
		self.assertEqual(snapshot["currency"], "IRR")
		self.assertEqual(snapshot["interval"], "Monthly")

	def test_snapshots_new_subdomain_and_selected_apps(self):
		self.plan["commerce_delivery_mode"] = "Create New Site"
		snapshot = hosting_order_snapshot(
			self.plan,
			self.team,
			"buyer@example.com",
			subdomain="my-company",
			apps=["erpnext", "hrms"],
		)
		self.assertIsNone(snapshot["site"])
		self.assertEqual(snapshot["subdomain"], "my-company")
		self.assertEqual(snapshot["apps"], ["erpnext", "hrms"])
		self.assertEqual(snapshot["service_delivery_mode"], "Create New Site")
		self.assertIsNone(snapshot["original_plan"])

	def test_snapshots_renewal_for_a_site_created_by_the_same_plan(self):
		self.plan["commerce_delivery_mode"] = "Create New Site"
		renewal_site = {
			"name": "shops.asumi.ir",
			"team": "team-1",
			"status": "Suspended",
			"plan": "SITE-PLAN-1",
			"subdomain": "shops",
			"domain": "asumi.ir",
		}
		snapshot = hosting_order_snapshot(
			self.plan,
			self.team,
			"buyer@example.com",
			site=renewal_site,
			renew_new_site=True,
		)
		self.assertEqual(snapshot["site"], renewal_site["name"])
		self.assertEqual(snapshot["subdomain"], "shops")
		self.assertEqual(snapshot["apps"], [])

	def test_rejects_unverified_new_site_renewal(self):
		self.plan["commerce_delivery_mode"] = "Create New Site"
		with self.assertRaises(ValueError):
			hosting_order_snapshot(
				self.plan,
				self.team,
				"buyer@example.com",
				site=self.site,
				renew_new_site=True,
			)

	def test_maps_annual_site_plan_interval(self):
		self.plan["interval"] = "Annually"
		snapshot = hosting_order_snapshot(self.plan, self.team, "buyer@example.com", site=self.site)
		self.assertEqual(snapshot["interval"], "Yearly")

	def test_rejects_invalid_plan_price_interval_and_delivery_input(self):
		for amount in (0, 9999, -1):
			with self.subTest(amount=amount):
				self.plan["price_irr"] = amount
				with self.assertRaises(ValueError):
					hosting_order_snapshot(self.plan, self.team, "buyer@example.com", site=self.site)
		self.plan["price_irr"] = 250000
		self.plan["interval"] = "Quarterly"
		with self.assertRaises(ValueError):
			hosting_order_snapshot(self.plan, self.team, "buyer@example.com", site=self.site)
		self.plan["interval"] = "Monthly"
		self.plan["commerce_delivery_mode"] = "Run arbitrary command"
		with self.assertRaises(ValueError):
			hosting_order_snapshot(self.plan, self.team, "buyer@example.com", site=self.site)

	def test_rejects_wrong_owner_or_inactive_existing_site(self):
		self.site["team"] = "another-team"
		with self.assertRaises(ValueError):
			hosting_order_snapshot(self.plan, self.team, "buyer@example.com", site=self.site)
		self.site["team"] = "team-1"
		self.site["status"] = "Suspended"
		with self.assertRaises(ValueError):
			hosting_order_snapshot(self.plan, self.team, "buyer@example.com", site=self.site)

	def test_validates_new_site_slug_and_rejects_mixed_delivery_inputs(self):
		self.plan["commerce_delivery_mode"] = "Create New Site"
		for subdomain in ("abc", "has space", "Uppercase", "ends-"):
			with self.subTest(subdomain=subdomain):
				with self.assertRaises(ValueError):
					hosting_order_snapshot(self.plan, self.team, "buyer@example.com", subdomain=subdomain)
		with self.assertRaises(ValueError):
			hosting_order_snapshot(
				self.plan,
				self.team,
				"buyer@example.com",
				site=self.site,
				subdomain="my-company",
			)
