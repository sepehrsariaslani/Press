from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from press.docker_control_agent import inventory
from press.docker_control_agent.config import ALLOWED_APPS


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


if __name__ == "__main__":
	unittest.main()
