import unittest

from press.saas.commerce.service_orders import build_service_order_snapshot
from press.saas.commerce.service_pricing import default_service_prices


class ServiceOrderSnapshotTests(unittest.TestCase):
	def test_builds_monthly_order_from_server_quote_and_converts_toman_to_rial(self):
		order = build_service_order_snapshot(
			module_ids=["finance"],
			addon_ids=[],
			prices=default_service_prices(),
			customer="buyer@example.com",
			team="TEAM-1",
			full_name="  سپهر مدیر  ",
			phone="۰۹۱۲۱۲۳۴۵۶۷",
			company=" وی‌درخت ",
			quoted_at="2026-10-13 12:00:00",
		)

		self.assertEqual(order["order_type"], "Asumi Service")
		self.assertEqual(order["interval"], "Monthly")
		self.assertEqual(order["currency"], "IRR")
		self.assertEqual(order["amount"], 55_000_000)
		self.assertEqual(order["service_amount_toman"], 5_500_000)
		self.assertEqual(order["service_contact_name"], "سپهر مدیر")
		self.assertEqual(order["service_contact_phone"], "09121234567")
		self.assertEqual(order["service_company"], "وی‌درخت")
		self.assertEqual(order["service_quote_snapshot"]["quoted_at"], "2026-10-13 12:00:00")
		self.assertEqual(order["service_quote_snapshot"]["lines"][0]["amount"], 5_500_000)
		self.assertTrue(order["service_fingerprint"])
		self.assertEqual(order, build_service_order_snapshot(
			module_ids=["finance"], addon_ids=[], prices=default_service_prices(),
			customer="buyer@example.com", team="TEAM-1", full_name="سپهر مدیر",
			phone="09121234567", company="وی‌درخت", quoted_at="2026-10-13 12:00:00",
		))

	def test_snapshots_exact_package_and_discount_from_server_prices(self):
		prices = default_service_prices()
		order = build_service_order_snapshot(
			module_ids=["finance", "sales", "procurement", "inventory", "crm", "projects", "manufacturing", "quality", "people", "assets", "pricing"],
			addon_ids=[],
			prices=prices,
			customer="buyer@example.com",
			team="TEAM-1",
			full_name="مشتری",
			phone="09123456789",
			quoted_at="2026-10-13 12:00:00",
		)

		self.assertEqual(order["service_quote_snapshot"]["package_id"], "professional")
		self.assertGreater(order["service_quote_snapshot"]["discount"], 0)
		self.assertEqual(order["service_amount_toman"], 9_900_000)
		self.assertEqual(order["amount"], 99_000_000)

	def test_accepts_zero_price_and_keeps_free_order_amount_zero(self):
		prices = default_service_prices()
		prices["modules"]["finance"] = 0
		order = build_service_order_snapshot(
			module_ids=["finance"], addon_ids=[], prices=prices,
			customer="buyer@example.com", team="TEAM-1", full_name="مشتری",
			phone="09123456789",
		)

		self.assertEqual(order["amount"], 0)
		self.assertEqual(order["service_amount_toman"], 0)

	def test_rejects_a_positive_toman_total_below_zarinpal_minimum(self):
		prices = default_service_prices()
		prices["modules"]["finance"] = 999

		with self.assertRaisesRegex(ValueError, "۱۰٬۰۰۰"):
			build_service_order_snapshot(
				module_ids=["finance"], addon_ids=[], prices=prices,
				customer="buyer@example.com", team="TEAM-1", full_name="مشتری",
				phone="09123456789",
			)

	def test_rejects_unknown_duplicate_and_invalid_selections(self):
		cases = (
			({"module_ids": ["finance", "unknown"], "addon_ids": []}, "unknown"),
			({"module_ids": ["finance", "finance"], "addon_ids": []}, "duplicate"),
			({"module_ids": ["restaurant"], "addon_ids": ["restaurantMenu", "restaurantMenu"]}, "duplicate"),
			({"module_ids": ["finance"], "addon_ids": ["restaurantMenu"]}, "requires restaurant"),
		)
		for selection, message in cases:
			with self.subTest(selection=selection), self.assertRaisesRegex(ValueError, message):
				build_service_order_snapshot(
					**selection, prices=default_service_prices(), customer="buyer@example.com",
					team="TEAM-1", full_name="مشتری", phone="09123456789",
				)

	def test_rejects_invalid_contact_and_missing_quote_timestamp(self):
		for values, message in (
			({"full_name": " ", "phone": "09123456789"}, "name"),
			({"full_name": "مشتری", "phone": "invalid"}, "phone"),
		):
			with self.subTest(values=values), self.assertRaisesRegex(ValueError, message):
				build_service_order_snapshot(
					module_ids=["finance"], addon_ids=[], prices=default_service_prices(),
					customer="buyer@example.com", team="TEAM-1", **values,
				)

		order = build_service_order_snapshot(
			module_ids=["finance"], addon_ids=[], prices=default_service_prices(),
			customer="buyer@example.com", team="TEAM-1", full_name="مشتری",
			phone="09123456789",
		)
		self.assertIsNone(order["service_quote_snapshot"]["quoted_at"])

	def test_fingerprint_changes_with_customer_team_or_selected_service(self):
		base = dict(
			module_ids=["finance"], addon_ids=[], prices=default_service_prices(),
			customer="buyer@example.com", team="TEAM-1", full_name="مشتری",
			phone="09123456789", quoted_at="2026-10-13 12:00:00",
		)
		fingerprint = build_service_order_snapshot(**base)["service_fingerprint"]
		self.assertNotEqual(fingerprint, build_service_order_snapshot(**{**base, "team": "TEAM-2"})["service_fingerprint"])
		self.assertNotEqual(fingerprint, build_service_order_snapshot(**{**base, "customer": "other@example.com"})["service_fingerprint"])
		self.assertNotEqual(fingerprint, build_service_order_snapshot(**{**base, "module_ids": ["sales"]})["service_fingerprint"])


if __name__ == "__main__":
	unittest.main()
