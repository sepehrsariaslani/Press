import unittest

from press.docker_control.operation_policy import decode_backup_sites, preparation_backup_request


CUSTOMER_SITES = ("boller.ir", "dehati.ir", "denroom.ir", "veederakht.ir")
IMPACT_SITES = ("asumi.ir", *CUSTOMER_SITES)


class TestDockerControlOperationPolicy(unittest.TestCase):
	def test_empty_json_array_does_not_request_a_backup(self):
		self.assertEqual(decode_backup_sites("[]"), [])
		self.assertEqual(decode_backup_sites(None), [])

	def test_nonempty_json_array_requests_backups_for_listed_sites(self):
		self.assertEqual(decode_backup_sites('["asumi.ir"]'), ["asumi.ir"])

	def test_invalid_backup_site_json_is_rejected(self):
		with self.assertRaises(ValueError):
			decode_backup_sites("not-json")

	def test_backend_service_restart_uses_full_shared_backup(self):
		self.assertEqual(
			preparation_backup_request(
				"restart_service",
				"backend",
				customer_sites=CUSTOMER_SITES,
				impact_sites=IMPACT_SITES,
			),
			(
				"backup_sites",
				None,
				{
					"sites": [
						"asumi.ir",
						"boller.ir",
						"dehati.ir",
						"denroom.ir",
						"veederakht.ir",
					]
				},
			),
		)

	def test_site_restore_uses_only_its_own_safety_backup(self):
		self.assertEqual(
			preparation_backup_request(
				"restore_site",
				"veederakht.ir",
				customer_sites=CUSTOMER_SITES,
				impact_sites=IMPACT_SITES,
			),
			("backup_site", "veederakht.ir", {}),
		)

	def test_site_migration_uses_only_its_own_safety_backup(self):
		self.assertEqual(
			preparation_backup_request(
				"migrate_site",
				"boller.ir",
				customer_sites=CUSTOMER_SITES,
				impact_sites=IMPACT_SITES,
			),
			("backup_site", "boller.ir", {}),
		)


if __name__ == "__main__":
	unittest.main()
