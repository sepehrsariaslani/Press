import unittest

from press.saas.commerce.marketplace_plan_admin import build_marketplace_plan_draft


class MarketplacePlanAdminTest(unittest.TestCase):
	def test_new_marketplace_plan_is_a_disabled_zero_price_draft(self):
		plan = build_marketplace_plan_draft(
			app="restaurant",
			title="Restaurant Pro Monthly",
			interval="Monthly",
			available_apps=["accounts", "restaurant"],
		)

		self.assertEqual(plan["app"], "restaurant")
		self.assertEqual(plan["title"], "Restaurant Pro Monthly")
		self.assertEqual(plan["interval"], "Monthly")
		self.assertEqual(plan["enabled"], 0)
		self.assertEqual(plan["price_inr"], 0)
		self.assertEqual(plan["price_usd"], 0)
		self.assertEqual(plan["price_irr"], 0)

	def test_marketplace_plan_draft_requires_a_published_app_and_valid_fields(self):
		base = {
			"app": "restaurant",
			"title": "Restaurant Pro",
			"interval": "Monthly",
			"available_apps": ["restaurant"],
		}
		for changes in (
			{"app": "unknown"},
			{"title": " "},
			{"title": "x" * 141},
			{"interval": "Every hour"},
		):
			with self.subTest(changes=changes), self.assertRaises(ValueError):
				build_marketplace_plan_draft(**(base | changes))

	def test_marketplace_plan_draft_rejects_apps_excluded_from_asumi_sales(self):
		for app in ("frappe", "raven", "sales"):
			with self.subTest(app=app), self.assertRaises(ValueError):
				build_marketplace_plan_draft(
					app=app,
					title="Not for sale",
					interval="Monthly",
					available_apps=[app],
				)


if __name__ == "__main__":
	unittest.main()
