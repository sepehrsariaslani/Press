from pathlib import Path
import unittest

from press.www.saas.catalog import (
	build_marketplace_catalog,
	format_plan_prices,
	get_catalog_page_context,
	get_public_marketplace_catalog,
)


class MarketplaceCatalogTest(unittest.TestCase):
	def test_page_context_has_real_apps_and_does_not_invent_hosting_offers(self):
		def get_all(doctype, **kwargs):
			if doctype == "Marketplace App":
				return [
					{
						"name": "app-a",
						"status": "Published",
						"title": "A",
						"route": "marketplace/apps/app-a",
					}
				]
			return [
				{
					"name": "plan-a",
					"app": "app-a",
					"title": "Free",
					"interval": "Monthly",
					"enabled": 1,
					"price_inr": 0,
					"price_usd": 0,
				}
			]

		context = get_catalog_page_context(get_all, can_manage_prices=True)

		self.assertEqual(len(context["marketplace_apps"]), 1)
		self.assertFalse(context["hosting_available"])
		self.assertTrue(context["can_manage_prices"])
		self.assertNotIn("resource_hint", context)

	def test_catalog_loads_only_published_apps_and_their_enabled_plans(self):
		queries = []
		rows = {
			"Marketplace App": [
				{
					"name": "app-a",
					"status": "Published",
					"title": "A",
					"route": "marketplace/apps/app-a",
					"description": "A public app",
				}
			],
			"Marketplace App Plan": [
				{
					"name": "plan-a",
					"app": "app-a",
					"title": "Monthly",
					"interval": "Monthly",
					"enabled": 1,
					"price_inr": 0,
					"price_usd": 0,
				}
			],
		}

		def get_all(doctype, **kwargs):
			queries.append((doctype, kwargs))
			return rows[doctype]

		catalog = get_public_marketplace_catalog(get_all)

		self.assertEqual([app["id"] for app in catalog], ["app-a"])
		self.assertEqual(queries[0][0], "Marketplace App")
		self.assertEqual(queries[0][1]["filters"], {"status": "Published"})
		self.assertEqual(queries[1][0], "Marketplace App Plan")
		self.assertEqual(
			queries[1][1]["filters"],
			{"enabled": 1, "app": ["in", ["app-a"]]},
		)

	def test_only_published_apps_with_enabled_plans_are_listed(self):
		apps = [
			{
				"name": "app-ready",
				"status": "Published",
				"title": "Ready",
				"route": "marketplace/apps/app-ready",
			},
			{
				"name": "app-draft",
				"status": "Draft",
				"title": "Draft",
				"route": "marketplace/apps/app-draft",
			},
			{
				"name": "app-unpriced",
				"status": "Published",
				"title": "Unpriced",
				"route": "marketplace/apps/app-unpriced",
			},
		]
		plans = [
			{
				"name": "enabled-free",
				"app": "app-ready",
				"title": "Free",
				"interval": "Monthly",
				"enabled": 1,
				"price_inr": 0,
				"price_usd": 0,
			},
			{
				"name": "disabled-paid",
				"app": "app-ready",
				"title": "Disabled",
				"interval": "Monthly",
				"enabled": 0,
				"price_inr": 500,
				"price_usd": 5,
			},
		]

		catalog = build_marketplace_catalog(apps, plans)

		self.assertEqual([app["id"] for app in catalog], ["app-ready"])
		self.assertEqual([plan["id"] for plan in catalog[0]["plans"]], ["enabled-free"])

	def test_zero_prices_are_free_without_replacing_the_stored_amounts(self):
		catalog = build_marketplace_catalog(
			[
				{
					"name": "app-free",
					"status": "Published",
					"title": "Free app",
					"route": "marketplace/apps/app-free",
				}
			],
			[
				{
					"name": "free-plan",
					"app": "app-free",
					"title": "Free",
					"interval": "Monthly",
					"enabled": 1,
					"price_inr": 0,
					"price_usd": 0,
				}
			],
		)

		self.assertTrue(catalog[0]["plans"][0]["is_free"])
		self.assertEqual(catalog[0]["plans"][0]["price_inr"], 0)
		self.assertEqual(catalog[0]["plans"][0]["price_usd"], 0)

	def test_paid_plans_preserve_each_stored_currency(self):
		catalog = build_marketplace_catalog(
			[
				{
					"name": "app-paid",
					"status": "Published",
					"title": "Paid app",
					"route": "marketplace/apps/app-paid",
				}
			],
			[
				{
					"name": "paid-plan",
					"app": "app-paid",
					"title": "Monthly",
					"interval": "Monthly",
					"enabled": 1,
					"price_inr": 1250,
					"price_usd": 12.5,
				}
			],
		)

		plan = catalog[0]["plans"][0]
		self.assertFalse(plan["is_free"])
		self.assertEqual(plan["price_inr"], 1250)
		self.assertEqual(plan["price_usd"], 12.5)
		self.assertEqual(plan["interval"], "Monthly")
		self.assertEqual(plan["interval_label"], "ماهانه")
		self.assertEqual(
			[(price["currency"], price["amount"]) for price in plan["prices"]],
			[("INR", 1250), ("USD", 12.5)],
		)

	def test_plans_with_unknown_period_or_missing_prices_are_not_listed(self):
		app = {
			"name": "app-checkout",
			"status": "Published",
			"title": "Checkout",
			"route": "marketplace/apps/app-checkout",
		}
		plans = [
			{
				"name": "unknown-period",
				"app": "app-checkout",
				"title": "Unknown",
				"interval": "Weekly",
				"enabled": 1,
				"price_inr": 0,
				"price_usd": 0,
			},
			{
				"name": "missing-price",
				"app": "app-checkout",
				"title": "Incomplete",
				"interval": "Monthly",
				"enabled": 1,
				"price_inr": None,
				"price_usd": 0,
			},
		]

		self.assertEqual(build_marketplace_catalog([app], plans), [])

	def test_display_prices_keep_currency_and_interval_labels(self):
		formatted = format_plan_prices(
			{"interval": "Yearly", "price_inr": 2400, "price_usd": 24}
		)

		self.assertEqual(formatted["interval_label"], "سالانه")
		self.assertEqual(formatted["price_inr"], 2400)
		self.assertEqual(formatted["price_usd"], 24)
		self.assertEqual([price["symbol"] for price in formatted["prices"]], ["₹", "$"])

class LegacyPricingTemplateTest(unittest.TestCase):
	def test_template_contains_no_fixed_infrastructure_rates_or_dynamic_html(self):
		template = Path(__file__).with_name("index.html").read_text()

		for stale_value in ("390000", "160000", "4200", "DEN Cloud", "DEN SaaS"):
			with self.subTest(value=stale_value):
				self.assertNotIn(stale_value, template)
		self.assertNotIn("innerHTML", template)
		self.assertIn("{{ app.title | e }}", template)
		self.assertIn("{{ app.description | e }}", template)


if __name__ == "__main__":
	unittest.main()
