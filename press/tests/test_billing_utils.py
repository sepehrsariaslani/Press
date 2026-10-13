from unittest import TestCase
from unittest.mock import patch

import frappe

from press.api.billing import validate_gst
from press.utils.billing import get_stripe

VALID_GSTINS = [
	{"gstin": "27AALFV4847R1Z2", "state": "Maharashtra", "country": "India"},
	{"gstin": "24APJPM3743A1Z9", "state": "Gujarat", "country": "India"},
	{"gstin": "33AASCA0911D1Z5", "state": "Tamil Nadu", "country": "India"},
	{"gstin": "09AAACU2759F1Z8", "state": "Uttar Pradesh", "country": "India"},
	{"gstin": "27BEDPK4339A1ZV", "state": "Maharashtra", "country": "India"},
	{"gstin": "33AAHCG3162B1Z5", "state": "Tamil Nadu", "country": "India"},
	{"gstin": "24BAVPS0504H1ZM", "state": "Gujarat", "country": "India"},
	{"gstin": "20AAECF5232E1ZB", "state": "Jharkhand", "country": "India"},
	{"gstin": "32AAICR8672C1ZC", "state": "Kerala", "country": "India"},
	{"gstin": "29AARFP2719A1Z6", "state": "Karnataka", "country": "India"},
]


INVALID_GSTINS = [
	{"gstin": "33AALCM8589JIZP", "state": "Tamil Nadu", "country": "India"},
	{"gstin": "33ABQFA7655JIZZ", "state": "Tamil Nadu", "country": "India"},
	{"gstin": "08AFHPK4336H12E", "state": "Rajasthan", "country": "India"},
]


class TestBillingUtils(TestCase):
	def test_get_stripe_can_be_optional_when_client_is_missing(self):
		with patch("press.utils.billing.stripe", None):
			self.assertIsNone(get_stripe(required=False))

	def test_get_stripe_can_be_optional_when_credentials_are_missing(self):
		with (
			patch("press.utils.billing.stripe", object()),
			patch("frappe.utils.password.get_decrypted_password", return_value=None),
		):
			self.assertIsNone(get_stripe(required=False))

	def test_get_stripe_still_rejects_missing_client_for_required_stripe_operations(self):
		with patch("press.utils.billing.stripe", None):
			with self.assertRaisesRegex(
				frappe.ValidationError, "Stripe client library is not installed"
			):
				get_stripe()

	def test_validate_gstin_with_invalid(self):
		for obj in INVALID_GSTINS:
			self.assertRaises(frappe.ValidationError, validate_gst, obj)

	def test_validate_gstin_with_valid(self):
		for obj in VALID_GSTINS:
			self.assertIsNone(
				validate_gst(obj), f"{obj} has a valid GSTIN, but the validate function throws!"
			)
