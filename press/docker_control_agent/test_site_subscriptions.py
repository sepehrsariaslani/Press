from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from press.docker_control_agent.operations import OperationError, write_site_subscription_key


class TestSiteSubscriptionConfig(unittest.TestCase):
	def setUp(self):
		self.temp_dir = tempfile.TemporaryDirectory()
		self.sites_root = Path(self.temp_dir.name)
		self.site_path = self.sites_root / "veederakht.ir"
		self.site_path.mkdir()
		self.config_path = self.site_path / "site_config.json"
		self.config_path.write_text(json.dumps({"db_name": "site_db", "existing": True}), encoding="utf-8")

	def tearDown(self):
		self.temp_dir.cleanup()

	def test_sets_and_revokes_only_the_selected_installed_app_key(self):
		result = write_site_subscription_key(
			self.sites_root,
			"veederakht.ir",
			"accounts",
			"a" * 40,
			installed_apps=["frappe", "accounts"],
		)
		self.assertEqual(result, {"site": "veederakht.ir", "app": "accounts", "enabled": True})
		config = json.loads(self.config_path.read_text(encoding="utf-8"))
		self.assertEqual(config["sk_accounts"], "a" * 40)
		self.assertEqual(config["db_name"], "site_db")
		write_site_subscription_key(
			self.sites_root,
			"veederakht.ir",
			"accounts",
			None,
			installed_apps=["frappe", "accounts"],
		)
		self.assertNotIn("sk_accounts", json.loads(self.config_path.read_text(encoding="utf-8")))

	def test_rejects_unlisted_site_app_and_malformed_secret_without_writing(self):
		for site, app, secret, installed in (
			("outside.asumi.ir", "accounts", "a" * 40, ["accounts"]),
			("veederakht.ir", "unknown", "a" * 40, []),
			("veederakht.ir", "accounts", "not-a-secret", ["accounts"]),
			("veederakht.ir", "accounts", "a" * 40, ["frappe"]),
		):
			with self.subTest(site=site, app=app):
				with self.assertRaises(OperationError):
					write_site_subscription_key(
						self.sites_root, site, app, secret, installed_apps=installed
					)
		self.assertEqual(
			json.loads(self.config_path.read_text(encoding="utf-8")),
			{"db_name": "site_db", "existing": True},
		)


if __name__ == "__main__":
	unittest.main()
