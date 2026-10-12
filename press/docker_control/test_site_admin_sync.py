from __future__ import annotations

import unittest

from press.docker_control.site_admin_sync import normalize_site_admins, reconcile_site_admins


class SiteAdminSyncTest(unittest.TestCase):
	def test_normalizes_and_deduplicates_source_managers_for_exact_domain(self):
		payload = {
			"domain": "dehati.ir",
			"admins": [
				{"email": " Manager@Example.com ", "full_name": "مدیر"},
				{"email": "manager@example.com", "full_name": "Duplicate"},
			],
		}
		self.assertEqual(
			normalize_site_admins(payload, "dehati.ir"),
			[{"email": "manager@example.com", "full_name": "مدیر"}],
		)

	def test_rejects_wrong_domain_invalid_email_and_malformed_payload(self):
		with self.assertRaises(ValueError):
			normalize_site_admins({"domain": "boller.ir", "admins": []}, "dehati.ir")
		with self.assertRaises(ValueError):
			normalize_site_admins({"domain": "dehati.ir", "admins": [{"email": "bad", "full_name": ""}]}, "dehati.ir")
		with self.assertRaises(ValueError):
			normalize_site_admins({"domain": "dehati.ir", "admins": "manager@example.com"}, "dehati.ir")

	def test_reconciliation_adds_and_removes_only_mappings_for_this_site(self):
		self.assertEqual(
			reconcile_site_admins(
				["keep@example.com", "remove@example.com"],
				[{"email": "keep@example.com", "full_name": "Keep"}, {"email": "add@example.com", "full_name": "Add"}],
			),
			{
				"added": ["add@example.com"],
				"removed": ["remove@example.com"],
				"unchanged": ["keep@example.com"],
			},
		)


if __name__ == "__main__":
	unittest.main()
