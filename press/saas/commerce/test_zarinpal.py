import unittest

from press.saas.commerce.zarinpal import (
	build_payment_request,
	get_payment_authority,
	get_payment_reference,
	payment_is_verified,
)


class TestZarinpalPayload(unittest.TestCase):
	def test_request_uses_integer_rials_and_fixed_callback(self):
		payload = build_payment_request(
			merchant_id="merchant-id",
			amount=125000,
			callback_url="https://asumi.ir/api/method/press.saas.commerce.zarinpal_callback",
			description="خرید برنامه",
			email="buyer@example.com",
		)
		self.assertEqual(payload["amount"], 125000)
		self.assertEqual(payload["merchant_id"], "merchant-id")
		self.assertEqual(payload["callback_url"], "https://asumi.ir/api/method/press.saas.commerce.zarinpal_callback")
		self.assertEqual(payload["metadata"], {"email": "buyer@example.com"})

	def test_request_rejects_invalid_amount_and_callback(self):
		with self.assertRaises(ValueError):
			build_payment_request("merchant-id", 0, "https://asumi.ir/callback", "x")
		with self.assertRaises(ValueError):
			build_payment_request("merchant-id", 1000, "http://asumi.ir/callback", "x")

	def test_authority_requires_success_code_and_nonempty_authority(self):
		self.assertEqual(get_payment_authority({"data": {"code": 100, "authority": "A0001"}}), "A0001")
		self.assertIsNone(get_payment_authority({"data": {"code": 101, "authority": "A0001"}}))
		self.assertIsNone(get_payment_authority({"data": {"code": 100}}))

	def test_verification_accepts_success_and_idempotent_already_verified(self):
		self.assertTrue(payment_is_verified({"data": {"code": 100, "ref_id": 123}}))
		self.assertTrue(payment_is_verified({"data": {"code": 101, "ref_id": 123}}))
		self.assertFalse(payment_is_verified({"data": {"code": 100}}))
		self.assertFalse(payment_is_verified({"errors": {"code": -9}}))
		self.assertEqual(get_payment_reference({"data": {"code": 100, "ref_id": 123}}), "123")


if __name__ == "__main__":
	unittest.main()
