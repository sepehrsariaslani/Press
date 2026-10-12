from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from press.docker_control_agent import inventory


class SiteAdminInventoryTest(unittest.TestCase):
	def setUp(self):
		self.config = SimpleNamespace(
			compose_files=(),
			project_root=Path("/srv/press"),
			backend_service="backend",
		)

	def test_returns_only_enabled_system_manager_accounts_from_allowlisted_site(self):
		responses = [
			subprocess.CompletedProcess([], 0, stdout='["owner@example.com", "disabled@example.com"]', stderr=""),
			subprocess.CompletedProcess(
				[],
				0,
				stdout=json.dumps(
					[
						{"name": "owner@example.com", "email": " Owner@Example.com ", "full_name": "مدیر فروش"},
						{"name": "invalid@example.com", "email": "not-an-email", "full_name": "Invalid"},
					]
				),
				stderr="",
			),
		]
		with patch.object(inventory, "run_command", side_effect=responses) as run:
			result = inventory.get_site_admins(self.config, "dehati.ir")

		self.assertEqual(
			result,
			{"domain": "dehati.ir", "admins": [{"email": "owner@example.com", "full_name": "مدیر فروش"}]},
		)
		self.assertEqual(run.call_count, 2)
		first_command = run.call_args_list[0].args[1]
		second_command = run.call_args_list[1].args[1]
		self.assertEqual(first_command[first_command.index("--site") + 1], "dehati.ir")
		self.assertIn("System Manager", first_command[-1])
		self.assertEqual(second_command[second_command.index("--site") + 1], "dehati.ir")
		self.assertIn("enabled", second_command[-1])

	def test_rejects_unlisted_site_before_running_any_command(self):
		with patch.object(inventory, "run_command") as run:
			with self.assertRaises(ValueError):
				inventory.get_site_admins(self.config, "attacker.example")
		run.assert_not_called()

	def test_accepts_a_source_site_with_no_active_system_managers(self):
		with patch.object(
			inventory,
			"run_command",
			return_value=subprocess.CompletedProcess([], 0, stdout="", stderr=""),
		):
			self.assertEqual(
				inventory.get_site_admins(self.config, "boller.ir"),
				{"domain": "boller.ir", "admins": []},
			)

	def test_accepts_no_enabled_users_after_role_query(self):
		with patch.object(
			inventory,
			"run_command",
			side_effect=[
				subprocess.CompletedProcess([], 0, stdout='["former@example.com"]', stderr=""),
				subprocess.CompletedProcess([], 0, stdout="", stderr=""),
			],
		):
			self.assertEqual(
				inventory.get_site_admins(self.config, "dehati.ir"),
				{"domain": "dehati.ir", "admins": []},
			)

	def test_fails_closed_when_source_query_fails_or_returns_invalid_json(self):
		with patch.object(
			inventory,
			"run_command",
			return_value=subprocess.CompletedProcess([], 1, stdout="", stderr="database error"),
		):
			with self.assertRaises(RuntimeError):
				inventory.get_site_admins(self.config, "dehati.ir")

		with patch.object(
			inventory,
			"run_command",
			side_effect=[
				subprocess.CompletedProcess([], 0, stdout='["owner@example.com"]', stderr=""),
				subprocess.CompletedProcess([], 0, stdout="not json", stderr=""),
			],
		):
			with self.assertRaises(RuntimeError):
				inventory.get_site_admins(self.config, "dehati.ir")


if __name__ == "__main__":
	unittest.main()
