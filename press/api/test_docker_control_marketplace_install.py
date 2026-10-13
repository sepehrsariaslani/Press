import json
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from press.api import docker_control


class FakeDocument(SimpleNamespace):
	def db_set(self, fieldname, value=None, **kwargs):
		setattr(self, fieldname, value)

	def save(self, **kwargs):
		return self

	def reload(self):
		return self

	def insert(self, **kwargs):
		return self


class DockerMarketplaceInstallFailureTest(unittest.TestCase):
	def test_install_failure_keeps_the_completed_backup_linked_to_order_and_operation(self):
		backup = {
			"site": "veederakht.ir",
			"backup_id": "20261013_120000-veederakht_ir-database.sql.gz",
			"database": {"file": "db.sql.gz", "bytes": 10},
			"public": {"file": "files.tgz", "bytes": 20},
			"private": {"file": "private.tgz", "bytes": 30},
		}
		agent_failure = RuntimeError("agent installation failed")
		agent_failure.result = {"error": "agent installation failed", "backup": backup}
		order = FakeDocument(
			name="ORDER-1",
			docker_site="veederakht.ir",
			team="TEAM-1",
			customer="buyer@example.com",
		)
		operation = FakeDocument(name="OPERATION-1", result="{}")
		client = SimpleNamespace(available_apps=lambda: ["accounts"])

		with (
			patch.object(docker_control.frappe, "set_user"),
			patch.object(docker_control.frappe.db, "exists", return_value=True),
			patch.object(docker_control.frappe.db, "commit"),
			patch.object(docker_control.frappe, "get_doc", return_value=operation),
			patch.object(docker_control, "_host_doc", return_value=object()),
			patch.object(docker_control, "_client", return_value=client),
			patch.object(docker_control, "_run_agent", side_effect=agent_failure),
			self.assertRaisesRegex(RuntimeError, "agent installation failed"),
		):
			docker_control.execute_marketplace_app_install(order, "accounts")

		self.assertEqual(order.install_backup_id, backup["backup_id"])
		self.assertEqual(json.loads(operation.result)["backup"], backup)

	def test_post_install_inventory_failure_keeps_the_successful_agent_backup_result(self):
		backup = {
			"site": "veederakht.ir",
			"backup_id": "20261013_120000-veederakht_ir-database.sql.gz",
		}
		agent_result = {
			"site": "veederakht.ir",
			"app": "accounts",
			"installed": True,
			"backup": backup,
		}
		order = FakeDocument(
			name="ORDER-1",
			docker_site="veederakht.ir",
			team="TEAM-1",
			customer="buyer@example.com",
		)
		operation = FakeDocument(name="OPERATION-1", result="{}")
		updated_site = FakeDocument(apps=[])
		client = SimpleNamespace(
			available_apps=lambda: ["accounts"],
			inventory=lambda: {},
		)

		with (
			patch.object(docker_control.frappe, "set_user"),
			patch.object(docker_control.frappe.db, "exists", return_value=True),
			patch.object(docker_control.frappe.db, "commit"),
			patch.object(docker_control.frappe, "get_doc", side_effect=[operation, updated_site]),
			patch.object(docker_control, "_host_doc", return_value=object()),
			patch.object(docker_control, "_client", return_value=client),
			patch.object(docker_control, "_run_agent", return_value=agent_result),
			patch.object(docker_control, "_validate_inventory"),
			patch.object(docker_control, "_store_inventory"),
			self.assertRaisesRegex(docker_control.DockerControlError, "موجودی بنچ"),
		):
			docker_control.execute_marketplace_app_install(order, "accounts")

		self.assertEqual(order.install_backup_id, backup["backup_id"])
		self.assertEqual(json.loads(operation.result)["backup"], backup)


def run_mocked_tests():
	suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	if not result.wasSuccessful():
		raise RuntimeError("Docker Marketplace install tests failed")


if __name__ == "__main__":
	unittest.main()
