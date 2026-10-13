from __future__ import annotations

import json
import subprocess
import threading
import unittest
from contextlib import nullcontext
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

from press.docker_control_agent import operations


class TestReadSiteLogs(unittest.TestCase):
	def test_only_valid_asumi_hosted_sites_can_receive_site_scoped_maintenance(self):
		operations.validate_request("set_maintenance", "shop.asumi.ir", {"enabled": True})
		with self.assertRaises(operations.OperationError):
			operations.validate_request("set_maintenance", "shop.example.com", {"enabled": True})

	def test_operation_manager_persists_only_safe_hosted_site_arguments(self):
		with TemporaryDirectory() as temp_dir:
			config = SimpleNamespace(state_path=Path(temp_dir) / "state.sqlite3")
			manager = operations.OperationManager.__new__(operations.OperationManager)
			manager.config = config
			manager.guard = threading.Lock()
			submitted = []
			manager.pool = SimpleNamespace(submit=lambda *args: submitted.append(args))
			arguments = {
				"apps": ["accounts"],
				"admin_password": "a-long-generated-one-time-password",
				"resume_existing": False,
			}
			manager.start("12345678-1234-4abc-8def-1234567890ab", "create_hosted_site", "shop.asumi.ir", arguments)
			with operations.database(config) as connection:
				row = connection.execute("SELECT arguments FROM operations").fetchone()
			self.assertEqual(json.loads(row["arguments"]), {"apps": ["accounts"], "resume_existing": False})
			self.assertEqual(submitted[0][-1], arguments)

	def test_hosted_site_operation_accepts_only_one_safe_asumi_subdomain_and_known_apps(self):
		arguments = {
			"apps": ["accounts"],
			"admin_password": "a-long-generated-one-time-password",
			"resume_existing": False,
		}
		self.assertIsNone(operations.validate_request("create_hosted_site", "shop.asumi.ir", arguments))
		for target in ("asumi.ir", "shop.example.com", "a..asumi.ir", "-shop.asumi.ir", "shop.asumi.ir/../x"):
			with self.subTest(target=target), self.assertRaises(operations.OperationError):
				operations.validate_request("create_hosted_site", target, arguments)
		with self.assertRaises(operations.OperationError):
			operations.validate_request("create_hosted_site", "shop.asumi.ir", {**arguments, "apps": ["unknown"]})
		with self.assertRaises(operations.OperationError):
			operations.validate_request("create_hosted_site", "shop.asumi.ir", {**arguments, "command": "rm -rf /"})

	def test_hosted_site_audit_arguments_never_persist_password_or_email(self):
		arguments = {
			"apps": ["accounts"],
			"admin_password": "one-time-secret",
			"resume_existing": False,
		}
		audited = operations.audit_arguments("create_hosted_site", arguments)
		self.assertEqual(audited, {"apps": ["accounts"], "resume_existing": False})
		serialized = str(audited)
		self.assertNotIn("one-time-secret", serialized)

	def test_hosted_site_requires_all_shared_site_backups_before_site_creation(self):
		arguments = {
			"apps": ["accounts"],
			"admin_password": "a-long-generated-one-time-password",
			"resume_existing": False,
		}
		sequence = []
		backups = [{"site": site, "backup_id": f"{site}-verified"} for site in operations.IMPACT_SITES]
		with TemporaryDirectory() as temp_dir:
			config = SimpleNamespace(sites_root=Path(temp_dir))
			with (
				patch.object(operations, "_available_bench_apps", return_value={"accounts", "restaurant"}),
				patch.object(operations, "_create_backup", side_effect=lambda _c, _db, site: sequence.append(f"backup:{site}") or backups[list(operations.IMPACT_SITES).index(site)]),
				patch.object(operations, "_database_root_password", return_value="root-secret"),
				patch.object(operations, "_run_hosted_site_script", side_effect=lambda *_args: sequence.append("create")),
				patch.object(operations, "_installed_apps", return_value=["frappe", "accounts"]),
			):
				result = operations._create_hosted_site(config, None, "shop.asumi.ir", arguments)
		self.assertEqual(sequence, [*(f"backup:{site}" for site in operations.IMPACT_SITES), "create"])
		self.assertEqual(result["site"], "shop.asumi.ir")
		self.assertEqual(result["apps"], ["accounts", "frappe"])
		self.assertNotIn("admin_password", result)
		self.assertEqual(result["backups"], backups)

	def test_hosted_site_never_runs_creation_when_any_shared_backup_fails(self):
		arguments = {
			"apps": [],
			"admin_password": "a-long-generated-one-time-password",
			"resume_existing": False,
		}
		with TemporaryDirectory() as temp_dir:
			config = SimpleNamespace(sites_root=Path(temp_dir))
			with (
				patch.object(operations, "_available_bench_apps", return_value={"accounts"}),
				patch.object(operations, "_create_backup", side_effect=[{"site": operations.IMPACT_SITES[0]}, operations.OperationError("incomplete backup")]),
				patch.object(operations, "_run_hosted_site_script") as create_site,
				self.assertRaises(operations.OperationError),
			):
				operations._create_hosted_site(config, None, "shop.asumi.ir", arguments)
		create_site.assert_not_called()

	def test_hosted_site_retry_skips_apps_that_are_already_installed(self):
		arguments = {
			"apps": ["accounts"],
			"admin_password": "a-long-generated-one-time-password",
			"resume_existing": True,
		}
		backups = [{"site": site, "backup_id": f"{site}-verified"} for site in (*operations.IMPACT_SITES, "shop.asumi.ir")]
		with TemporaryDirectory() as temp_dir:
			sites_root = Path(temp_dir)
			site_path = sites_root / "shop.asumi.ir"
			site_path.mkdir()
			(site_path / "site_config.json").write_text("{}", encoding="utf-8")
			config = SimpleNamespace(sites_root=sites_root)
			with (
				patch.object(operations, "_available_bench_apps", return_value={"accounts"}),
				patch.object(operations, "_installed_apps", return_value=["frappe", "accounts"]),
				patch.object(operations, "_create_backup", side_effect=backups) as backup,
				patch.object(operations, "_database_root_password", return_value="root-secret"),
				patch.object(operations, "_run_hosted_site_script") as run_script,
			):
				operations._create_hosted_site(config, None, "shop.asumi.ir", arguments)

		payload = run_script.call_args.args[1]
		self.assertTrue(payload["existing"])
		self.assertEqual(payload["apps"], [])
		self.assertEqual(payload["admin_password"], arguments["admin_password"])
		self.assertEqual(backup.call_count, len(operations.IMPACT_SITES) + 1)

	def test_hosted_site_credentials_are_sent_to_python_over_stdin_not_process_arguments(self):
		payload = {
			"site": "shop.asumi.ir",
			"existing": False,
			"database_password": "private-database-password",
			"admin_password": "private-admin-password",
			"apps": ["accounts"],
		}
		config = SimpleNamespace(project_root=Path("/tmp"), backend_service="backend")
		with (
			patch.object(operations, "compose_command", return_value=["docker", "compose", "exec", "python"]),
			patch.object(operations.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)) as run,
		):
			operations._run_hosted_site_script(config, payload)

		command = run.call_args.args[0]
		self.assertNotIn(payload["database_password"], command)
		self.assertNotIn(payload["admin_password"], command)
		self.assertEqual(json.loads(run.call_args.kwargs["input"]), payload)

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

	def test_runs_a_marketplace_install_for_a_registered_asumi_hosted_domain(self):
		config = SimpleNamespace(backend_service="backend")
		backup = {"site": "shops.asumi.ir", "backup_id": "hosted-backup"}
		with (
			patch.object(operations, "_available_bench_apps", return_value={"accounts"}),
			patch.object(operations, "_installed_apps", side_effect=[[], ["accounts"]]),
			patch.object(operations, "_create_backup", return_value=backup) as create_backup,
			patch.object(operations, "_bench", return_value=subprocess.CompletedProcess([], 0)) as install,
		):
			result = operations._run_action(
				config,
				connection=None,
				action="install_marketplace_app",
				target="shops.asumi.ir",
				arguments={"app": "accounts"},
			)

		self.assertEqual(result["backup"], backup)
		self.assertTrue(result["installed"])
		create_backup.assert_called_once_with(config, None, "shops.asumi.ir")
		install.assert_called_once_with(config, "shops.asumi.ir", "install-app", "accounts", timeout=7200)

	def test_rejects_marketplace_install_app_not_available_on_the_bench_before_backup(self):
		config = SimpleNamespace(backend_service="backend")
		with (
			patch.object(operations, "_available_bench_apps", create=True, return_value={"accounts"}),
			patch.object(operations, "_create_backup") as create_backup,
			self.assertRaisesRegex(operations.OperationError, "available on this Bench"),
		):
			operations._run_action(
				config,
				connection=None,
				action="install_marketplace_app",
				target="veederakht.ir",
				arguments={"app": "restaurant"},
			)
		create_backup.assert_not_called()

	def test_failed_marketplace_install_preserves_verified_backup_details(self):
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
			patch.object(operations, "_installed_apps", return_value=[]),
			patch.object(operations, "_create_backup", return_value=backup),
			patch.object(operations, "_bench", side_effect=operations.OperationError("Migration failed")),
			self.assertRaises(operations.OperationError) as raised,
		):
			operations._run_action(
				config,
				connection=None,
				action="install_marketplace_app",
				target="veederakht.ir",
				arguments={"app": "accounts"},
			)

		self.assertEqual(getattr(raised.exception, "result", {}).get("backup"), backup)

	def test_operation_manager_keeps_structured_backup_result_when_install_fails(self):
		backup = {"backup_id": "20261013_120000-veederakht_ir-database.sql.gz"}
		failure = operations.OperationError("Marketplace install failed")
		failure.result = {"error": "Marketplace install failed", "backup": backup}
		manager = operations.OperationManager.__new__(operations.OperationManager)
		manager.config = SimpleNamespace()
		updates = []

		with (
			patch.object(operations, "database", return_value=nullcontext(None)),
			patch.object(operations, "_run_action", side_effect=failure),
			patch.object(manager, "_update", side_effect=lambda *args: updates.append(args)),
		):
			manager._run("operation-id", "install_marketplace_app", "veederakht.ir", {"app": "accounts"})

		self.assertEqual(updates[-1][3], failure.result)

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
