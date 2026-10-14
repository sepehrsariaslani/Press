import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from press.saas.commerce import api
from press.saas.commerce.service_pricing import default_addon_offers, default_service_prices


class PricingDocument:
	def __init__(self, prices):
		self.module_prices = json.dumps(prices["modules"])
		self.addon_prices = json.dumps(prices["addons"])
		self.package_prices = json.dumps(prices["packages"])
		self.addon_offer_config = json.dumps(default_addon_offers())
		self.saved = False

	def get(self, fieldname):
		return getattr(self, fieldname)

	def set(self, fieldname, value):
		setattr(self, fieldname, value)

	def save(self, **_kwargs):
		self.saved = True
		return self


class ServicePricingEndpointTests(unittest.TestCase):
	def setUp(self):
		self.prices = default_service_prices()
		self.addon_offers = default_addon_offers()
		self.doc = PricingDocument(self.prices)

	def test_public_addon_catalog_hides_unconfigured_and_disabled_offers(self):
		offers = default_addon_offers()
		offers["assistant_ai"] = {"status": "Free", "monthly_price_toman": 0}
		offers["internal_chat"] = {"status": "Disabled", "monthly_price_toman": 0}
		self.doc.addon_offer_config = json.dumps(offers)
		with (
			patch.object(api.frappe.db, "exists", return_value=True),
			patch.object(api.frappe, "get_single", return_value=self.doc),
		):
			result = api.service_addon_catalog()

		self.assertEqual(
			result,
			[{
				"id": "assistant_ai",
				"title": "دستیار هوش مصنوعی حسابیار",
				"status": "Free",
				"monthly_price_toman": 0,
			}],
		)

	def test_public_addon_catalog_returns_only_valid_paid_offers(self):
		offers = default_addon_offers()
		offers["internal_chat"] = {"status": "Paid", "monthly_price_toman": 25_000}
		self.doc.addon_offer_config = json.dumps(offers)
		with (
			patch.object(api.frappe.db, "exists", return_value=True),
			patch.object(api.frappe, "get_single", return_value=self.doc),
		):
			result = api.service_addon_catalog()

		self.assertEqual(result[0]["id"], "internal_chat")
		self.assertEqual(result[0]["monthly_price_toman"], 25_000)

	def test_public_price_endpoint_returns_only_the_three_public_maps(self):
		with (
			patch.object(api.frappe.db, "exists", return_value=True),
			patch.object(api.frappe, "get_single", return_value=self.doc),
		):
			result = api.service_pricing()

		self.assertEqual(
			result,
			{
				"modules": self.prices["modules"],
				"addons": self.prices["addons"],
				"packages": self.prices["packages"],
			},
		)

	def test_public_price_endpoint_uses_seed_values_before_the_singleton_exists(self):
		with patch.object(api.frappe.db, "exists", return_value=False):
			result = api.service_pricing()

		self.assertEqual(result, self.prices)

	def test_admin_price_read_returns_current_maps_after_authorization(self):
		with (
			patch.object(api, "_require_commerce_admin") as require_admin,
			patch.object(api.frappe.db, "exists", return_value=True),
			patch.object(api.frappe, "get_single", return_value=self.doc),
		):
			result = api.admin_service_pricing()

		require_admin.assert_called_once_with()
		self.assertEqual(result, self.prices)

	def test_admin_price_read_requires_commerce_admin(self):
		with (
			patch.object(api, "_require_commerce_admin", side_effect=PermissionError("admin only")) as require_admin,
			self.assertRaises(PermissionError),
		):
			api.admin_service_pricing()

		require_admin.assert_called_once_with()

	def test_admin_price_write_requires_commerce_admin(self):
		with (
			patch.object(api, "_require_commerce_admin", side_effect=PermissionError("admin only")) as require_admin,
			self.assertRaises(PermissionError),
		):
			api.save_admin_service_pricing("{}", "{}", "{}")

		require_admin.assert_called_once_with()

	def test_admin_price_write_validates_and_saves_complete_maps(self):
		changed = {key: dict(values) for key, values in self.prices.items()}
		changed["modules"]["finance"] = 7_000_000
		with (
			patch.object(api, "_require_commerce_admin"),
			patch.object(api.frappe, "get_single", return_value=self.doc),
		):
			result = api.save_admin_service_pricing(
				json.dumps(changed["modules"]),
				json.dumps(changed["addons"]),
				json.dumps(changed["packages"]),
			)

		self.assertEqual(result, changed)
		self.assertEqual(json.loads(self.doc.module_prices), changed["modules"])
		self.assertTrue(self.doc.saved)

	def test_admin_price_write_rejects_partial_or_malformed_maps_without_saving(self):
		with (
			patch.object(api, "_require_commerce_admin"),
			patch.object(api.frappe, "get_single", return_value=self.doc),
			patch.object(api.frappe, "throw", side_effect=ValueError("invalid prices")),
			self.assertRaises(ValueError),
		):
			api.save_admin_service_pricing("{}", json.dumps(self.prices["addons"]), json.dumps(self.prices["packages"]))

		self.assertFalse(self.doc.saved)

	def test_admin_addon_offer_read_requires_commerce_admin(self):
		with (
			patch.object(api, "_require_commerce_admin", side_effect=PermissionError("admin only")) as require_admin,
			self.assertRaises(PermissionError),
		):
			api.admin_service_addon_offers()
		require_admin.assert_called_once_with()

	def test_admin_addon_offer_read_returns_normalized_config(self):
		with (
			patch.object(api, "_require_commerce_admin") as require_admin,
			patch.object(api.frappe.db, "exists", return_value=True),
			patch.object(api.frappe, "get_single", return_value=self.doc),
		):
			result = api.admin_service_addon_offers()
		require_admin.assert_called_once_with()
		self.assertEqual(result, self.addon_offers)

	def test_admin_addon_offer_save_validates_and_persists_complete_config(self):
		changed = default_addon_offers()
		changed["assistant_ai"] = {"status": "Paid", "monthly_price_toman": 30_000}
		with (
			patch.object(api, "_require_commerce_admin"),
			patch.object(api.frappe, "get_single", return_value=self.doc),
		):
			result = api.save_admin_service_addon_offers(json.dumps(changed))
		self.assertEqual(result, changed)
		self.assertEqual(json.loads(self.doc.addon_offer_config), changed)
		self.assertTrue(self.doc.saved)

	def test_admin_addon_offer_save_rejects_invalid_config_without_saving(self):
		changed = default_addon_offers()
		changed["assistant_ai"] = {"status": "Paid", "monthly_price_toman": 9_999}
		with (
			patch.object(api, "_require_commerce_admin"),
			patch.object(api.frappe, "get_single", return_value=self.doc),
			patch.object(api.frappe, "throw", side_effect=ValueError("invalid offer")),
			self.assertRaises(ValueError),
		):
			api.save_admin_service_addon_offers(json.dumps(changed))
		self.assertFalse(self.doc.saved)

	def test_module_request_uses_server_quote_and_never_creates_an_order(self):
		created_docs = []
		lead = SimpleNamespace(name="LEAD-1", status="New", insert=lambda **_kwargs: lead)

		def get_doc(values):
			created_docs.append(values)
			return lead

		patches = (
			patch.object(api.frappe, "session", SimpleNamespace(user="buyer@example.test")),
			patch.object(api.frappe.db, "exists", return_value=True),
			patch.object(api, "_get_service_prices", return_value=self.prices),
			patch.object(api.frappe, "get_doc", side_effect=get_doc),
			patch.object(api.frappe.utils, "now_datetime", return_value="2026-10-13 12:00:00"),
			patch.object(api.frappe.local, "request", SimpleNamespace(host="asumi.ir"), create=True),
		)
		with patches[0], patches[1], patches[2], patches[3], patches[4], patches[5]:
			result = api.submit_service_request(
				service="module_pricing",
				full_name="مشتری",
				phone="09123456789",
				context="تعرفهٔ جعلی: ۱ تومان",
				module_ids='["finance"]',
				addon_ids="[]",
			)

		self.assertEqual(result["name"], "LEAD-1")
		self.assertEqual(result["quote"]["total"], 5_500_000)
		self.assertEqual(result["quote"]["quoted_at"], "2026-10-13 12:00:00")
		self.assertEqual(len(created_docs), 1)
		self.assertEqual(created_docs[0]["doctype"], "Erpyar Lead")
		self.assertNotIn("تعرفهٔ جعلی", created_docs[0]["message"])
		self.assertIn("۵٬۵۰۰٬۰۰۰", created_docs[0]["message"])

	def test_guest_cannot_submit_a_module_pricing_request(self):
		with (
			patch.object(api.frappe, "session", SimpleNamespace(user="Guest")),
			patch.object(api.frappe, "throw", side_effect=PermissionError("login required")),
			self.assertRaises(PermissionError),
		):
			api.submit_service_request(
				service="module_pricing",
				full_name="مشتری",
				phone="09123456789",
				module_ids='["finance"]',
			)

	def test_invalid_module_selection_is_rejected_before_a_lead_is_created(self):
		with (
			patch.object(api.frappe, "session", SimpleNamespace(user="buyer@example.test")),
			patch.object(api.frappe.db, "exists", return_value=True),
			patch.object(api, "_get_service_prices", return_value=self.prices),
			patch.object(api.frappe, "get_doc") as get_doc,
			patch.object(api.frappe, "throw", side_effect=ValueError("unknown module")),
			self.assertRaises(ValueError),
		):
			api.submit_service_request(
				service="module_pricing",
				full_name="مشتری",
				phone="09123456789",
				module_ids='["unknown"]',
			)

		get_doc.assert_not_called()


if __name__ == "__main__":
	unittest.main()
