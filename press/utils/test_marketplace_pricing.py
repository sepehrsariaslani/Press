from unittest import TestCase

from press.utils.marketplace_pricing import (
	has_paid_marketplace_app_plan,
	is_marketplace_app_plan_free,
)


class TestMarketplacePricing(TestCase):
	def test_inr_paid_plan_is_not_free_when_usd_price_is_zero(self):
		self.assertFalse(is_marketplace_app_plan_free({"price_inr": 1200, "price_usd": 0}, "INR"))

	def test_inr_free_plan_is_free_when_usd_price_is_paid(self):
		self.assertTrue(is_marketplace_app_plan_free({"price_inr": 0, "price_usd": 9}, "INR"))

	def test_usd_uses_usd_price(self):
		self.assertFalse(is_marketplace_app_plan_free({"price_inr": 0, "price_usd": 9}, "USD"))

	def test_paid_plan_requires_a_plan_selection(self):
		self.assertTrue(has_paid_marketplace_app_plan([{"price_inr": 0, "price_usd": 9}], "USD"))

	def test_plan_selection_is_not_required_when_app_is_free_in_team_currency(self):
		self.assertFalse(has_paid_marketplace_app_plan([{"price_inr": 0, "price_usd": 9}], "INR"))

	def test_free_only_plans_do_not_require_a_plan_selection(self):
		self.assertFalse(has_paid_marketplace_app_plan([{"price_inr": 0, "price_usd": 0}], "USD"))
