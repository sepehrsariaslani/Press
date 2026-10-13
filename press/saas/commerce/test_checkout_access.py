import unittest
from types import SimpleNamespace
from unittest.mock import patch

import frappe
from press.saas.commerce import api
from press.saas.commerce.checkout_access import checkout_available_for_actor


class CheckoutAccessTest(unittest.TestCase):
	def test_checkout_status_is_guest_accessible_but_returns_public_state_only(self):
		self.assertIn(api.checkout_status, frappe.guest_methods)
		settings = SimpleNamespace(sandbox_mode=True)
		with patch("press.saas.commerce.api._get_settings", return_value=settings), patch(
			"press.saas.commerce.api._checkout_available_for_user", side_effect=[True, False, False]
		):
			status = api.checkout_status()

		self.assertEqual(
			status,
			{
				"enabled": True,
				"marketplace_apps_enabled": False,
				"hosting_enabled": False,
				"sandbox_mode": True,
				"currency": "IRR",
			},
		)
		self.assertNotIn("merchant_id", status)

	def test_live_checkout_is_available_to_customers_when_configured(self):
		self.assertTrue(
			checkout_available_for_actor(
				enabled=True,
				sale_enabled=True,
				merchant_id_configured=True,
				sandbox_mode=False,
				is_commerce_admin=False,
			)
		)

	def test_sandbox_checkout_is_limited_to_commerce_admins(self):
		configuration = {
			"enabled": True,
			"sale_enabled": True,
			"merchant_id_configured": True,
			"sandbox_mode": True,
		}
		self.assertTrue(checkout_available_for_actor(**configuration, is_commerce_admin=True))
		self.assertFalse(checkout_available_for_actor(**configuration, is_commerce_admin=False))

	def test_missing_merchant_or_disabled_sale_blocks_checkout_in_either_mode(self):
		for sandbox_mode in (False, True):
			for values in (
				{"merchant_id_configured": False, "sale_enabled": True},
				{"merchant_id_configured": True, "sale_enabled": False},
			):
				with self.subTest(sandbox_mode=sandbox_mode, values=values):
					self.assertFalse(
						checkout_available_for_actor(
							enabled=True,
							sandbox_mode=sandbox_mode,
							is_commerce_admin=True,
							**values,
					)
					)

	@patch("press.saas.commerce.api._merchant_id", return_value="configured-merchant")
	@patch("press.saas.commerce.api.has_role", return_value=False)
	def test_api_limits_sandbox_checkout_to_commerce_admins(self, role_mock, _merchant_mock):
		settings = SimpleNamespace(
			enabled=True,
			allow_marketplace_app_sales=True,
			allow_site_plan_sales=True,
			sandbox_mode=True,
		)

		self.assertFalse(api._checkout_available_for_user(settings))
		role_mock.side_effect = lambda role: role == "Press Admin"
		self.assertTrue(api._checkout_available_for_user(settings))

	def test_production_checkout_does_not_require_an_admin_role(self):
		settings = SimpleNamespace(
			enabled=True,
			allow_marketplace_app_sales=True,
			sandbox_mode=False,
		)

		with patch("press.saas.commerce.api._merchant_id", return_value="configured-merchant"), patch(
			"press.saas.commerce.api.has_role", side_effect=AssertionError("roles should not be checked in production")
		):
			self.assertTrue(api._checkout_available_for_user(settings))

	@patch("press.saas.commerce.api._merchant_id", return_value="configured-merchant")
	@patch("press.saas.commerce.api.has_role", return_value=False)
	def test_service_sales_has_its_own_disabled_by_default_gate(self, _role_mock, _merchant_mock):
		settings = SimpleNamespace(
			enabled=True,
			allow_marketplace_app_sales=True,
			allow_site_plan_sales=True,
			allow_service_sales=False,
			sandbox_mode=False,
		)

		self.assertFalse(api._checkout_available_for_user(settings, sale_type="services"))
