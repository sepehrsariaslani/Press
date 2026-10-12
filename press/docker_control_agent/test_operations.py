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


if __name__ == "__main__":
	unittest.main()
