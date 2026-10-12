import unittest
from unittest.mock import patch

from frappe import _dict
from press.www import asumi


class AsumiHomepageContextTest(unittest.TestCase):
	@patch("press.www.asumi._can_manage_marketplace_prices", return_value=True)
	@patch("press.www.asumi.get_public_marketplace_catalog")
	@patch("press.www.asumi.frappe")
	def test_homepage_receives_the_live_catalog_and_price_management_permission(
		self, frappe_mock, catalog_mock, _permission_mock
	):
		apps = [{"id": "app-a", "title": "App A", "plans": []}]
		catalog_mock.return_value = apps
		context = _dict()

		asumi.get_context(context)

		self.assertEqual(context.no_cache, 1)
		self.assertIs(context.marketplace_apps, apps)
		self.assertTrue(context.can_manage_marketplace_prices)
		catalog_mock.assert_called_once_with(frappe_mock.get_all)
