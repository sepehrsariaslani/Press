# Copyright (c) 2021, Frappe and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

from press.press.doctype.app.test_app import create_test_app
from press.press.doctype.marketplace_app.test_marketplace_app import (
	create_test_marketplace_app,
)


def create_test_marketplace_app_plan(app: str = "frappe"):
	"""Create a test marketplace_app_plan"""
	if not frappe.db.exists("Marketplace App", app):
		create_test_app(name=app)
		create_test_marketplace_app(app)

	return frappe.get_doc(
		{
			"doctype": "Marketplace App Plan",
			"title": "Test Plan",
			"price_inr": 1000,
			"price_usd": 12,
			"app": app,
			"versions": [{"version": "Version 14"}],
			"features": [{"description": "Feature 1"}],
			"enabled": 1,
		}
	).insert(ignore_permissions=True)


class TestMarketplaceAppPlan(FrappeTestCase):
	def tearDown(self):
		frappe.db.rollback()

	def test_paid_status_uses_irregular_currency_and_all_enabled_prices(self):
		plan = create_test_marketplace_app_plan("frappe")
		plan.db_set({"price_inr": 0, "price_usd": 0, "price_irr": 125000})
		plan.update_marketplace_app_subscription_type()
		self.assertEqual(frappe.db.get_value("Marketplace App", "frappe", "subscription_type"), "Paid")

		plan.db_set({"price_inr": 0, "price_usd": 0, "price_irr": 0})
		plan.update_marketplace_app_subscription_type()
		self.assertEqual(frappe.db.get_value("Marketplace App", "frappe", "subscription_type"), "Free")

		plan.db_set({"price_usd": 0.5})
		plan.update_marketplace_app_subscription_type()
		self.assertEqual(frappe.db.get_value("Marketplace App", "frappe", "subscription_type"), "Paid")

	def test_rejects_fractional_irr_price_on_insert(self):
		create_test_marketplace_app_plan("frappe")
		with self.assertRaises(frappe.ValidationError):
			frappe.get_doc(
				{
					"doctype": "Marketplace App Plan",
					"title": "Fractional Rial Plan",
					"price_inr": 0,
					"price_usd": 0,
					"price_irr": 1.5,
					"app": "frappe",
					"versions": [{"version": "Version 14"}],
					"features": [{"description": "Feature"}],
				}
			).insert(ignore_permissions=True)
