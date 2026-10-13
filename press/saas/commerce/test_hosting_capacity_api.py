import unittest
from unittest.mock import patch

from press.saas.commerce import api


class PublicPressAdmissionApiTest(unittest.TestCase):
	def test_new_site_admission_delegates_to_public_press_target_resolver(self):
		plan = {"name": "ASUMI-PUBLIC", "private_bench_support": 0}
		target = {
			"domain": "asumi.ir", "cluster": "IR", "group": "PUBLIC-V16", "version": "version-16",
			"apps": ["frappe", "accounts"], "bench": "PUBLIC-BENCH", "server": "PUBLIC-SERVER",
		}
		with (
			patch.object(api, "resolve_public_site_target", return_value=target) as resolve,
			patch.object(api, "public_site_target_is_ready", return_value=True),
		):
			self.assertEqual(api._new_site_plan_config(plan, "another-site"), target)
		resolve.assert_called_once_with(plan, "another-site")

	def test_private_or_missing_public_target_is_never_admitted(self):
		with (
			patch.object(api, "resolve_public_site_target", return_value=None),
			patch.object(api, "public_site_target_is_ready", return_value=False),
		):
			self.assertIsNone(api._new_site_plan_config({"name": "PRIVATE"}))


if __name__ == "__main__":
	unittest.main()
