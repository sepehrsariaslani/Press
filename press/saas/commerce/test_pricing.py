import unittest

from press.saas.commerce.pricing import (
	normalize_interval,
	normalize_marketplace_app_plan_prices,
	normalize_price,
)


class PriceValidationTest(unittest.TestCase):
	def test_billing_intervals_are_validated_and_default_to_daily(self):
		for interval in ("Daily", "Monthly", "Yearly"):
			with self.subTest(interval=interval):
				self.assertEqual(normalize_interval(interval), interval)
		self.assertEqual(normalize_interval(None), "Daily")
		with self.assertRaises(ValueError):
			normalize_interval("Hourly")

	def test_accepts_zero_prices_and_decimal_inr_usd_prices(self):
		self.assertEqual(normalize_price("0", "IRR"), 0)
		self.assertEqual(normalize_price("125.50", "INR"), 125.5)
		self.assertEqual(normalize_price("9.99", "USD"), 9.99)

	def test_irr_price_must_be_whole_and_nonnegative(self):
		self.assertEqual(normalize_price("125000.0", "IRR"), 125000)
		with self.assertRaises(ValueError):
			normalize_price("125000.5", "IRR")
		with self.assertRaises(ValueError):
			normalize_price("-1", "USD")

	def test_rejects_invalid_or_infinite_prices(self):
		for value in ("nope", "NaN", "Infinity"):
			with self.subTest(value=value), self.assertRaises(ValueError):
				normalize_price(value, "USD")

	def test_marketplace_plan_prices_validate_all_currencies(self):
		prices = normalize_marketplace_app_plan_prices(
			{"price_inr": "12.50", "price_usd": "2.99", "price_irr": "125000"}
		)
		self.assertEqual(prices, {"price_inr": 12.5, "price_usd": 2.99, "price_irr": 125000})

		for invalid_prices in (
			{"price_inr": -1, "price_usd": 0, "price_irr": 0},
			{"price_inr": 0, "price_usd": -1, "price_irr": 0},
			{"price_inr": 0, "price_usd": 0, "price_irr": 125000.5},
			{"price_inr": 0, "price_usd": 0, "price_irr": -1},
		):
			with self.subTest(prices=invalid_prices), self.assertRaises(ValueError):
				normalize_marketplace_app_plan_prices(invalid_prices)


if __name__ == "__main__":
	unittest.main()
