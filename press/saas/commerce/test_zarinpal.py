import json
import unittest
from unittest.mock import patch

from press.saas.commerce.zarinpal import (
	build_payment_request,
	create_payment,
	get_payment_authority,
	get_payment_reference,
	payment_is_verified,
	verify_payment,
)


class TestZarinpalPayload(unittest.TestCase):
	def test_request_uses_documented_v4_fields_and_fixed_callback(self):
		payload = build_payment_request(
			merchant_id="merchant-id",
			amount=125000,
			callback_url="https://asumi.ir/api/method/press.saas.commerce.zarinpal_callback",
			description="خرید برنامه",
			email="buyer@example.com",
		)
		self.assertEqual(payload["amount"], 125000)
		self.assertEqual(payload["merchant_id"], "merchant-id")
		self.assertEqual(
			set(payload), {"merchant_id", "amount", "callback_url", "description", "metadata"}
		)
		self.assertEqual(
			payload["callback_url"],
			"https://asumi.ir/api/method/press.saas.commerce.zarinpal_callback",
		)
		self.assertEqual(payload["metadata"], {"email": "buyer@example.com"})

	def test_request_rejects_invalid_amount_and_callback(self):
		with self.assertRaises(ValueError):
			build_payment_request("merchant-id", 0, "https://asumi.ir/callback", "x")
		with self.assertRaises(ValueError):
			build_payment_request("merchant-id", 9999, "https://asumi.ir/callback", "x")
		with self.assertRaises(ValueError):
			build_payment_request("merchant-id", 10000, "http://asumi.ir/callback", "x")

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


class TestZarinpalHttpRequests(unittest.TestCase):
	def setUp(self):
		self.response = unittest.mock.MagicMock()
		self.response.__enter__.return_value.read.return_value = b'{"data":{"code":100}}'

	def test_create_payment_uses_the_selected_environment_and_json_request(self):
		for sandbox, expected_url in (
			(False, "https://api.zarinpal.com/pg/v4/payment/request.json"),
			(True, "https://sandbox.zarinpal.com/pg/v4/payment/request.json"),
		):
			with (
				self.subTest(sandbox=sandbox),
				patch("press.saas.commerce.zarinpal.urlopen", return_value=self.response) as open_url,
			):
				payload = {
					"merchant_id": "merchant-id",
					"amount": 10000,
					"callback_url": "https://asumi.ir/callback",
					"description": "خرید آزمون",
					"metadata": {},
				}
				self.assertEqual(create_payment(payload, sandbox=sandbox), {"data": {"code": 100}})
				request = open_url.call_args.args[0]
				self.assertEqual(request.full_url, expected_url)
				self.assertEqual(request.get_method(), "POST")
				self.assertEqual(request.get_header("Content-type"), "application/json")
				self.assertEqual(json.loads(request.data), payload)
				self.assertEqual(open_url.call_args.kwargs["timeout"], 15)

	def test_verify_payment_posts_the_saved_amount_and_authority(self):
		for sandbox, expected_url in (
			(False, "https://api.zarinpal.com/pg/v4/payment/verify.json"),
			(True, "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"),
		):
			with (
				self.subTest(sandbox=sandbox),
				patch("press.saas.commerce.zarinpal.urlopen", return_value=self.response) as open_url,
			):
				verify_payment("merchant-id", 875000, "A0001", sandbox=sandbox)
				request = open_url.call_args.args[0]
				self.assertEqual(request.full_url, expected_url)
				self.assertEqual(request.get_method(), "POST")
				self.assertEqual(
					json.loads(request.data),
					{"merchant_id": "merchant-id", "amount": 875000, "authority": "A0001"},
				)


if __name__ == "__main__":
	unittest.main()
