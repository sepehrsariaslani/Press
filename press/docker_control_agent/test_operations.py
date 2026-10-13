from __future__ import annotations

import subprocess
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from press.docker_control_agent import operations


class TestReadSiteLogs(unittest.TestCase):
	def test_accepts_a_marketplace_install_for_an_allowlisted_site(self):
		self.assertIsNone(
			operations.validate_request(
				"install_marketplace_app",
				"veederakht.ir",
				{"app": "accounts"},
			)
		)

	def test_runs_a_marketplace_install_only_after_full_backup_and_verifies_the_app(self):
		config = SimpleNamespace(backend_service="backend")
		backup = {
			"site": "veederakht.ir",
			"backup_id": "20261013_120000-veederakht_ir-database.sql.gz",
			"database": {"file": "db.sql.gz", "bytes": 10},
			"public": {"file": "files.tgz", "bytes": 20},
			"private": {"file": "private.tgz", "bytes": 30},
		}
		with (
			patch.object(operations, "_available_bench_apps", create=True, return_value={"accounts"}),
			patch.object(operations, "_installed_apps", side_effect=[[], ["accounts"]]),
			patch.object(operations, "_create_backup", return_value=backup) as create_backup,
			patch.object(operations, "_bench", return_value=subprocess.CompletedProcess([], 0)) as install,
		):
			try:
				result = operations._run_action(
					config,
					connection=None,
					action="install_marketplace_app",
					target="veederakht.ir",
					arguments={"app": "accounts"},
				)
			except operations.OperationError as error:
				self.fail(f"Marketplace app installation should succeed after backup: {error}")

		self.assertEqual(result["backup"], backup)
		self.assertEqual(result["app"], "accounts")
		self.assertTrue(result["installed"])
		create_backup.assert_called_once_with(config, None, "veederakht.ir")
		install.assert_called_once_with(config, "veederakht.ir", "install-app", "accounts", timeout=7200)

	def test_rejects_marketplace_install_app_not_available_on_the_bench_before_backup(self):
		config = SimpleNamespace(backend_service="backend")
		with (
			patch.object(operations, "_available_bench_apps", create=True, return_value={"accounts"}),
			patch.object(operations, "_create_backup") as create_backup,
		):
			with self.assertRaisesRegex(operations.OperationError, "available on this Bench"):
				operations._run_action(
					config,
					connection=None,
					action="install_marketplace_app",
					target="veederakht.ir",
					arguments={"app": "restaurant"},
				)
		create_backup.assert_not_called()

	def test_skips_backup_and_install_when_marketplace_app_is_already_installed(self):
		config = SimpleNamespace(backend_service="backend")
		with (
			patch.object(operations, "_available_bench_apps", create=True, return_value={"accounts"}),
			patch.object(operations, "_installed_apps", return_value=["accounts"]),
			patch.object(operations, "_create_backup") as create_backup,
			patch.object(operations, "_bench") as install,
		):
			result = operations._run_action(
				config,
				connection=None,
				action="install_marketplace_app",
				target="veederakht.ir",
				arguments={"app": "accounts"},
			)

		self.assertTrue(result["already_installed"])
		self.assertIsNone(result["backup"])
		create_backup.assert_not_called()
		install.assert_not_called()

	def test_allows_restart_of_a_listed_service(self):
		self.assertIsNone(operations.validate_request("restart_service", "backend", {}))

	def test_reads_frappe_web_log(self):
		config = SimpleNamespace(
			compose_files=(),
			project_root=Path("/home/sepehr/den-v16-docker"),
			backend_service="backend",
		)
		command_result = subprocess.CompletedProcess([], 0, stdout="web request log\n", stderr="")
		with patch.object(operations, "_checked_command", return_value=command_result) as run:
			result = operations._run_action(
				config,
				connection=None,
				action="read_site_logs",
				target="veederakht.ir",
				arguments={},
			)

		self.assertEqual(result, {"site": "veederakht.ir", "logs": "web request log\n"})
		self.assertEqual(
			run.call_args.args[1],
			[
				"docker",
				"compose",
				"exec",
				"-T",
				"backend",
				"tail",
				"-n",
				"200",
				"/home/frappe/frappe-bench/sites/veederakht.ir/logs/frappe.web.log",
			],
		)

	def test_falls_back_to_frappe_log_when_web_log_is_empty(self):
		config = SimpleNamespace(
			compose_files=(),
			project_root=Path("/home/sepehr/den-v16-docker"),
			backend_service="backend",
		)
		command_results = [
			subprocess.CompletedProcess([], 0, stdout="", stderr=""),
			subprocess.CompletedProcess([], 0, stdout="application log\n", stderr=""),
		]
		with patch.object(operations, "_checked_command", side_effect=command_results) as run:
			result = operations._run_action(
				config,
				connection=None,
				action="read_site_logs",
				target="veederakht.ir",
				arguments={},
			)

		self.assertEqual(result, {"site": "veederakht.ir", "logs": "application log\n"})
		self.assertEqual(run.call_count, 2)
		self.assertTrue(run.call_args_list[0].args[1][-1].endswith("/frappe.web.log"))
		self.assertTrue(run.call_args_list[1].args[1][-1].endswith("/frappe.log"))


if __name__ == "__main__":
	unittest.main()
