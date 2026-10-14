import json
import unittest
from unittest.mock import Mock

from press.patches.v0_8_0.seed_asumi_service_pricing import execute
from press.patches.v0_8_0.seed_asumi_addon_offers import execute as seed_addon_offers
from press.saas.commerce.service_pricing import default_addon_offers


class SeedServicePricingTests(unittest.TestCase):
	def test_seeds_each_price_map_once(self):
		doc = Mock()
		doc.module_prices = None
		doc.addon_prices = None
		doc.package_prices = None
		doc.get.side_effect = lambda fieldname: getattr(doc, fieldname)
		doc.set.side_effect = lambda fieldname, value: setattr(doc, fieldname, value)

		execute(lambda name: doc)

		module_prices = json.loads(doc.module_prices)
		addon_prices = json.loads(doc.addon_prices)
		package_prices = json.loads(doc.package_prices)
		self.assertEqual(module_prices["finance"], 5_500_000)
		self.assertEqual(addon_prices["restaurantMenu"], 2_500_000)
		self.assertEqual(package_prices["complete"], 50_000_000)
		doc.save.assert_called_once_with(ignore_permissions=True)

	def test_does_not_overwrite_existing_admin_prices(self):
		doc = Mock()
		doc.module_prices = '{"finance": 123}'
		doc.addon_prices = '{"restaurantMenu": 456}'
		doc.package_prices = '{"complete": 789}'
		doc.get.side_effect = lambda fieldname: getattr(doc, fieldname)

		execute(lambda name: doc)

		self.assertEqual(doc.module_prices, '{"finance": 123}')
		doc.save.assert_not_called()

	def test_seeds_unconfigured_addon_offers_without_touching_legacy_prices(self):
		doc = Mock()
		doc.module_prices = '{"finance": 123}'
		doc.addon_prices = '{"restaurantMenu": 456}'
		doc.package_prices = '{"complete": 789}'
		doc.addon_offer_config = None
		doc.get.side_effect = lambda fieldname: getattr(doc, fieldname)
		doc.set.side_effect = lambda fieldname, value: setattr(doc, fieldname, value)

		seed_addon_offers(lambda name: doc)

		self.assertEqual(json.loads(doc.addon_offer_config), default_addon_offers())
		self.assertEqual(doc.module_prices, '{"finance": 123}')
		self.assertEqual(doc.addon_prices, '{"restaurantMenu": 456}')
		self.assertEqual(doc.package_prices, '{"complete": 789}')
		doc.save.assert_called_once_with(ignore_permissions=True)

	def test_addon_seed_does_not_overwrite_existing_configuration(self):
		doc = Mock()
		doc.addon_offer_config = '{"internal_chat":{"status":"Disabled","monthly_price_toman":0}}'
		doc.get.side_effect = lambda fieldname: getattr(doc, fieldname)

		seed_addon_offers(lambda name: doc)

		self.assertEqual(
			doc.addon_offer_config,
			'{"internal_chat":{"status":"Disabled","monthly_price_toman":0}}',
		)
		doc.save.assert_not_called()


if __name__ == "__main__":
	unittest.main()
