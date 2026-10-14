import copy
import unittest

from press.saas.commerce.service_pricing import (
	MAX_SERVICE_PRICE_TOMAN,
	default_addon_offers,
	default_service_prices,
	normalize_addon_offers,
)


class AddonOfferCatalogTests(unittest.TestCase):
	def test_defaults_are_unconfigured_and_keep_legacy_price_maps_unchanged(self):
		self.assertEqual(
			default_addon_offers(),
			{
				"assistant_ai": {"status": "Unconfigured", "monthly_price_toman": 0},
				"internal_chat": {"status": "Unconfigured", "monthly_price_toman": 0},
			},
		)
		prices = default_service_prices()
		self.assertEqual(len(prices["modules"]), 15)
		self.assertEqual(prices["addons"], {"restaurantMenu": 2_500_000})
		self.assertEqual(len(prices["packages"]), 5)

	def test_normalizes_all_documented_statuses(self):
		offers = default_addon_offers()
		offers["assistant_ai"] = {"status": "Paid", "monthly_price_toman": 10_000}
		offers["internal_chat"] = {"status": "Free", "monthly_price_toman": 0}

		self.assertEqual(normalize_addon_offers(offers), offers)

	def test_accepts_disabled_and_unconfigured_without_a_price(self):
		offers = default_addon_offers()
		offers["assistant_ai"] = {"status": "Disabled", "monthly_price_toman": 0}

		self.assertEqual(normalize_addon_offers(offers)["assistant_ai"]["status"], "Disabled")

	def test_rejects_unknown_or_missing_addon_ids_and_fields(self):
		for invalid in (
			{"assistant_ai": {"status": "Paid", "monthly_price_toman": 10_000}},
			{**default_addon_offers(), "other": {"status": "Free", "monthly_price_toman": 0}},
			{
				**default_addon_offers(),
				"assistant_ai": {"status": "Free", "monthly_price_toman": 0, "extra": True},
			},
		):
			with self.subTest(invalid=invalid), self.assertRaises(ValueError):
				normalize_addon_offers(invalid)

	def test_rejects_unknown_statuses_and_invalid_prices(self):
		invalid_values = (
			{"status": "Trial", "monthly_price_toman": 0},
			{"status": ["Paid"], "monthly_price_toman": 10_000},
			{"status": "Paid", "monthly_price_toman": 9_999},
			{"status": "Free", "monthly_price_toman": 1},
			{"status": "Paid", "monthly_price_toman": -1},
			{"status": "Paid", "monthly_price_toman": 1.5},
			{"status": "Paid", "monthly_price_toman": True},
			{"status": "Paid", "monthly_price_toman": MAX_SERVICE_PRICE_TOMAN + 1},
		)
		for invalid_offer in invalid_values:
			with self.subTest(invalid_offer=invalid_offer):
				offers = copy.deepcopy(default_addon_offers())
				offers["assistant_ai"] = invalid_offer
				with self.assertRaises(ValueError):
					normalize_addon_offers(offers)

	def test_rejects_non_dictionary_offer_data(self):
		offers = default_addon_offers()
		offers["assistant_ai"] = "Paid"
		with self.assertRaises(ValueError):
			normalize_addon_offers(offers)


if __name__ == "__main__":
	unittest.main()
