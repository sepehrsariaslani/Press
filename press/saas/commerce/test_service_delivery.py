import unittest

from press.saas.commerce.service_delivery import (
	EXISTING_SITE_UPGRADE,
	NEW_SITE_PROVISIONING,
	normalize_site_plan_delivery_mode,
)


class SitePlanDeliveryModeTest(unittest.TestCase):
	def test_accepts_existing_site_upgrade_and_new_site_provisioning(self):
		self.assertEqual(normalize_site_plan_delivery_mode(EXISTING_SITE_UPGRADE), EXISTING_SITE_UPGRADE)
		self.assertEqual(normalize_site_plan_delivery_mode(NEW_SITE_PROVISIONING), NEW_SITE_PROVISIONING)

	def test_defaults_old_plans_to_existing_site_upgrade(self):
		self.assertEqual(normalize_site_plan_delivery_mode(None), EXISTING_SITE_UPGRADE)
		self.assertEqual(normalize_site_plan_delivery_mode(""), EXISTING_SITE_UPGRADE)

	def test_rejects_unrecognized_delivery_mode(self):
		with self.assertRaises(ValueError):
			normalize_site_plan_delivery_mode("Run arbitrary command")


if __name__ == "__main__":
	unittest.main()
