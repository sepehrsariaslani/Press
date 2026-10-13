import json
import unittest
from unittest.mock import Mock

from press.patches.v0_8_0.seed_asumi_service_pricing import execute


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


if __name__ == "__main__":
	unittest.main()
