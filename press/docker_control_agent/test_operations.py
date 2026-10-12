from __future__ import annotations

import subprocess
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from press.docker_control_agent import operations


class TestReadSiteLogs(unittest.TestCase):
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
