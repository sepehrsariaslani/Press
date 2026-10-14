import unittest

from press.saas.commerce.service_orders import build_addon_order_snapshot
from press.saas.commerce.service_pricing import default_addon_offers


def paid_offers(addon_id="assistant_ai", price=25_000):
	offers = default_addon_offers()
	offers[addon_id] = {"status": "Paid", "monthly_price_toman": price}
	return offers


class AddonOrderSnapshotTests(unittest.TestCase):
	def build(self, **overrides):
		values = {
			"addon_id": "assistant_ai",
			"site_type": "Site",
			"site_name": "tenant.asumi.ir",
			"offers": paid_offers(),
			"customer": "buyer@example.com",
			"team": "TEAM-1",
			"full_name": "مشتری",
			"phone": "09123456789",
			"company": "شرکت نمونه",
			"quoted_at": "2026-10-14 12:00:00",
		}
		values.update(overrides)
		return build_addon_order_snapshot(**values)

	def test_builds_server_priced_one_month_order_for_a_press_site(self):
		order = self.build()

		self.assertEqual(order["order_type"], "Asumi Service")
		self.assertEqual(order["interval"], "Monthly")
		self.assertEqual(order["currency"], "IRR")
		self.assertEqual(order["amount"], 250_000)
		self.assertEqual(order["service_amount_toman"], 25_000)
		self.assertEqual(order["service_title"], "دستیار هوش مصنوعی حسابیار")
		self.assertEqual(order["site"], "tenant.asumi.ir")
		self.assertIsNone(order["docker_site"])
		self.assertEqual(order["service_quote_snapshot"]["site_name"], "tenant.asumi.ir")
		self.assertEqual(order["service_quote_snapshot"]["quoted_at"], "2026-10-14 12:00:00")

	def test_builds_docker_site_order_and_normalizes_contact_details(self):
		order = self.build(
			site_type="Docker Control Site",
			site_name="veederakht.ir",
			full_name="  سپهر مدیر  ",
			phone="۰۹۱۲۱۲۳۴۵۶۷",
			company=" وی‌درخت ",
		)

		self.assertIsNone(order["site"])
		self.assertEqual(order["docker_site"], "veederakht.ir")
		self.assertEqual(order["service_contact_name"], "سپهر مدیر")
		self.assertEqual(order["service_contact_phone"], "09121234567")
		self.assertEqual(order["service_company"], "وی‌درخت")

	def test_fingerprint_changes_for_site_type_site_or_addon(self):
		fingerprint = self.build()["service_fingerprint"]
		self.assertNotEqual(fingerprint, self.build(site_name="other.asumi.ir")["service_fingerprint"])
		self.assertNotEqual(
			fingerprint,
			self.build(site_type="Docker Control Site", site_name="tenant.asumi.ir")["service_fingerprint"],
		)
		self.assertNotEqual(
			fingerprint,
			self.build(addon_id="internal_chat", offers=paid_offers("internal_chat"))["service_fingerprint"],
		)

	def test_rejects_nonpaid_or_unknown_addons_and_invalid_site_targets(self):
		invalid = (
			{"offers": default_addon_offers()},
			{"addon_id": "unknown", "offers": paid_offers()},
			{"addon_id": [], "offers": paid_offers()},
			{"addon_id": "internal_chat", "offers": paid_offers()},
			{"site_type": "Unknown", "site_name": "tenant.asumi.ir"},
			{"site_type": [], "site_name": "tenant.asumi.ir"},
			{"site_name": " "},
		)
		for values in invalid:
			with self.subTest(values=values), self.assertRaises(ValueError):
				self.build(**values)

	def test_rejects_price_below_gateway_minimum_and_invalid_contact(self):
		for values in (
			{"offers": paid_offers(price=9_999)},
			{"full_name": " ", "phone": "09123456789"},
			{"full_name": "مشتری", "phone": "invalid"},
		):
			with self.subTest(values=values), self.assertRaises(ValueError):
				self.build(**values)


if __name__ == "__main__":
	unittest.main()
