from types import SimpleNamespace
import unittest
from unittest.mock import patch

from press.docker_control_agent import inventory


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


if __name__ == "__main__":
	unittest.main()
