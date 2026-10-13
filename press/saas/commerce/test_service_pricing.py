import copy
import unittest

from press.saas.commerce.service_pricing import (
	MAX_SERVICE_PRICE_TOMAN,
	calculate_service_quote,
	default_service_prices,
	normalize_service_prices,
)


class ServicePricingTests(unittest.TestCase):
	def setUp(self):
		self.prices = default_service_prices()

	def test_default_prices_preserve_all_current_catalog_amounts(self):
		self.assertEqual(
			self.prices,
			{
				"modules": {
					"finance": 5_500_000,
					"sales": 5_500_000,
					"crm": 2_500_000,
					"procurement": 6_000_000,
					"inventory": 6_000_000,
					"projects": 3_200_000,
					"manufacturing": 5_500_000,
					"quality": 2_500_000,
					"people": 3_600_000,
					"assets": 3_200_000,
					"fleet": 3_200_000,
					"pricing": 3_000_000,
					"growth": 3_500_000,
					"business": 3_800_000,
					"restaurant": 6_500_000,
				},
				"addons": {"restaurantMenu": 2_500_000},
				"packages": {
					"restaurant": 6_500_000,
					"restaurantPurchasing": 12_500_000,
					"professional": 9_900_000,
					"completeWithoutMenu": 47_500_000,
					"complete": 50_000_000,
				},
			},
		)

	def test_calculates_individual_module_and_addon_prices(self):
		quote = calculate_service_quote(["finance", "sales", "restaurant"], ["restaurantMenu"], self.prices)

		self.assertEqual(quote["module_total"], 17_500_000)
		self.assertEqual(quote["addon_total"], 2_500_000)
		self.assertEqual(quote["listed_total"], 20_000_000)
		self.assertEqual(quote["discount"], 0)
		self.assertEqual(quote["total"], 20_000_000)
		self.assertEqual(quote["package_id"], None)
		self.assertEqual(
			[(line["kind"], line["id"], line["amount"]) for line in quote["lines"]],
			[
				("module", "finance", 5_500_000),
				("module", "sales", 5_500_000),
				("module", "restaurant", 6_500_000),
				("addon", "restaurantMenu", 2_500_000),
			],
		)

	def test_exact_package_selection_uses_package_amount_and_reports_discount(self):
		module_ids = [
			"finance", "sales", "procurement", "inventory", "crm", "projects",
			"manufacturing", "quality", "people", "assets", "pricing",
		]
		quote = calculate_service_quote(module_ids, [], self.prices)

		self.assertEqual(quote["package_id"], "professional")
		self.assertEqual(quote["total"], 9_900_000)
		self.assertEqual(quote["discount"], quote["listed_total"] - 9_900_000)

	def test_exact_package_above_individual_total_does_not_create_negative_discount(self):
		prices = copy.deepcopy(self.prices)
		prices["packages"]["restaurant"] = 7_000_000
		quote = calculate_service_quote(["restaurant"], [], prices)

		self.assertEqual(quote["package_id"], "restaurant")
		self.assertEqual(quote["listed_total"], 6_500_000)
		self.assertEqual(quote["discount"], 0)
		self.assertEqual(quote["total"], 7_000_000)

	def test_complete_package_includes_the_menu_addon(self):
		module_ids = list(self.prices["modules"])
		quote = calculate_service_quote(module_ids, ["restaurantMenu"], self.prices)

		self.assertEqual(quote["package_id"], "complete")
		self.assertEqual(quote["total"], 50_000_000)

	def test_package_prices_are_independent_of_module_price_changes(self):
		prices = copy.deepcopy(self.prices)
		prices["modules"]["restaurant"] = 8_000_000
		quote = calculate_service_quote(["restaurant"], [], prices)

		self.assertEqual(quote["module_total"], 8_000_000)
		self.assertEqual(quote["total"], 6_500_000)

	def test_rejects_empty_unknown_duplicate_and_prerequisite_invalid_selections(self):
		invalid_selections = (
			([], []),
			(["not-a-module"], []),
			(["finance", "finance"], []),
			(["finance"], ["restaurantMenu"]),
			(["manufacturing"], []),
			(["assets"], []),
			(["business"], []),
		)
		for module_ids, addon_ids in invalid_selections:
			with self.subTest(module_ids=module_ids, addon_ids=addon_ids):
				with self.assertRaises(ValueError):
					calculate_service_quote(module_ids, addon_ids, self.prices)

	def test_rejects_duplicate_or_unknown_addons(self):
		for addon_ids in (["restaurantMenu", "restaurantMenu"], ["other-addon"]):
			with self.subTest(addon_ids=addon_ids):
				with self.assertRaises(ValueError):
					calculate_service_quote(["restaurant"], addon_ids, self.prices)

	def test_price_maps_require_exact_catalog_keys_and_integer_amounts(self):
		invalid_maps = []
		missing_module = copy.deepcopy(self.prices)
		del missing_module["modules"]["finance"]
		invalid_maps.append(missing_module)
		unknown_addon = copy.deepcopy(self.prices)
		unknown_addon["addons"]["other-addon"] = 1
		invalid_maps.append(unknown_addon)
		missing_package = copy.deepcopy(self.prices)
		del missing_package["packages"]["complete"]
		invalid_maps.append(missing_package)
		for invalid_value in (-1, 1.5, "100", True, MAX_SERVICE_PRICE_TOMAN + 1):
			invalid_amount = copy.deepcopy(self.prices)
			invalid_amount["modules"]["finance"] = invalid_value
			invalid_maps.append(invalid_amount)

		for invalid in invalid_maps:
			with self.subTest(invalid=invalid):
				with self.assertRaises(ValueError):
					normalize_service_prices(invalid["modules"], invalid["addons"], invalid["packages"])

	def test_normalizes_zero_as_free_and_accepts_the_documented_maximum(self):
		prices = copy.deepcopy(self.prices)
		prices["modules"]["finance"] = 0
		prices["addons"]["restaurantMenu"] = MAX_SERVICE_PRICE_TOMAN

		normalized = normalize_service_prices(prices["modules"], prices["addons"], prices["packages"])

		self.assertEqual(normalized["modules"]["finance"], 0)
		self.assertEqual(normalized["addons"]["restaurantMenu"], MAX_SERVICE_PRICE_TOMAN)


if __name__ == "__main__":
	unittest.main()
