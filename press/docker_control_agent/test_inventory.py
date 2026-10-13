import json
import subprocess
import tempfile
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from press.docker_control_agent import inventory
from press.docker_control_agent.config import ALLOWED_APPS, IMPACT_SITES


class ResourceInventoryTest(unittest.TestCase):
	def test_resources_returns_host_capacity_without_running_bench_inventory(self):
		config = SimpleNamespace(project_root="/srv/press")
		resources = {"disk_free_bytes": 123, "memory_available_bytes": 456}
		with (
			patch.object(inventory, "_resource_summary", return_value=resources),
			patch.object(inventory, "run_command", side_effect=AssertionError("full inventory must not run")),
		):
			result = inventory.get_resources(config)

		self.assertEqual(result, {"protocol_version": 1, "resources": resources})


class AppRevisionInventoryTest(unittest.TestCase):
	def test_reads_revision_for_installed_app_without_granting_deploy_permission(self):
		with tempfile.TemporaryDirectory() as temporary_directory:
			apps_root = Path(temporary_directory)
			app_path = apps_root / "crm"
			app_path.mkdir()
			completed = [
				subprocess.CompletedProcess([], 0, stdout="9cad4db8da9c\n", stderr=""),
				subprocess.CompletedProcess([], 0, stdout="main\n", stderr=""),
			]
			with patch.object(inventory.subprocess, "run", side_effect=completed) as run:
				result = inventory._app_revision(SimpleNamespace(apps_root=apps_root), "crm")

		self.assertEqual(result, {"app": "crm", "version": "9cad4db8da9c", "branch": "main"})
		self.assertNotIn("crm", ALLOWED_APPS)
		self.assertEqual(run.call_count, 2)
		for call in run.call_args_list:
			command = call.args[0]
			self.assertEqual(command[:2], ["git", "-c"])
			self.assertIn(f"safe.directory={app_path}", command)
			self.assertIn("-C", command)

	def test_does_not_read_a_symlink_outside_the_apps_root(self):
		with tempfile.TemporaryDirectory() as temporary_directory:
			base = Path(temporary_directory)
			apps_root = base / "apps"
			apps_root.mkdir()
			outside = base / "outside"
			outside.mkdir()
			(apps_root / "crm").symlink_to(outside, target_is_directory=True)
			with patch.object(inventory.subprocess, "run") as run:
				result = inventory._app_revision(SimpleNamespace(apps_root=apps_root), "crm")

		self.assertEqual(result, {"app": "crm", "version": "unknown", "branch": "unknown"})
		run.assert_not_called()

	def test_rejects_invalid_app_names_without_reading_the_filesystem(self):
		with patch.object(inventory.subprocess, "run") as run:
			result = inventory._app_revision(SimpleNamespace(apps_root=Path("/apps")), "../secrets")

		self.assertEqual(result, {"app": "../secrets", "version": "unknown", "branch": "unknown"})
		run.assert_not_called()


class BenchVersionInventoryTest(unittest.TestCase):
	def test_lists_apps_available_on_the_bench_independently_of_site_installations(self):
		with tempfile.TemporaryDirectory() as temporary_directory:
			apps_root = Path(temporary_directory) / "apps"
			apps_root.mkdir()
			(apps_root / "restaurant").mkdir()
			versions = [
				{"app": "frappe", "commit": "f" * 40, "branch": "main", "version": "16"},
				{"app": "restaurant", "commit": "r" * 40, "branch": "main", "version": "1"},
			]
			config = SimpleNamespace(
				compose_files=(),
				backend_service="backend",
				apps_root=apps_root,
				project_root=Path(temporary_directory),
			)
			with patch.object(
				inventory,
				"run_command",
				return_value=subprocess.CompletedProcess([], 0, stdout=json.dumps(versions), stderr=""),
			) as run:
				available_apps = inventory.get_available_apps(config)

		self.assertEqual(available_apps, ["restaurant"])
		self.assertIn("version", run.call_args.args[1])

	def test_uses_bench_version_for_apps_without_a_git_repository(self):
		with tempfile.TemporaryDirectory() as temporary_directory:
			base = Path(temporary_directory)
			apps_root = base / "apps"
			sites_root = base / "sites"
			apps_root.mkdir()
			sites_root.mkdir()
			(apps_root / "raven").mkdir()
			for domain in IMPACT_SITES:
				(sites_root / domain).mkdir()

			installed_apps = {domain: ["raven"] for domain in IMPACT_SITES}
			bench_versions = [{"app": "raven", "commit": "", "branch": "", "version": "2.6.5"}]
			command_results = [
				subprocess.CompletedProcess([], 0, stdout=json.dumps(installed_apps), stderr=""),
				subprocess.CompletedProcess([], 0, stdout=json.dumps(bench_versions), stderr=""),
			]
			config = SimpleNamespace(
				project_root=base,
				compose_files=(),
				backend_service="backend",
				apps_root=apps_root,
				sites_root=sites_root,
			)
			with (
				patch.object(inventory, "run_command", side_effect=command_results) as run,
				patch.object(inventory, "_compose_state", return_value=[]),
				patch.object(inventory, "_resource_summary", return_value={}),
			):
				result = inventory.get_inventory(config)

		self.assertEqual(run.call_count, 2)
		for site in result["sites"]:
			self.assertEqual(site["apps"], [{"app": "raven", "version": "2.6.5", "branch": "unknown"}])


if __name__ == "__main__":
	unittest.main()
