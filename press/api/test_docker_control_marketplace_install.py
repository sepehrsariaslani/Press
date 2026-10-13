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
	def test_reuses_the_linked_agent_operation_while_remote_work_is_still_running(self):
		order = FakeDocument(
			name="ORDER-1",
			docker_site="veederakht.ir",
			team="TEAM-1",
			customer="buyer@example.com",
			install_operation="OPERATION-OLD",
		)
		operation = FakeDocument(
			name="OPERATION-OLD",
			action="install_marketplace_app",
			target="veederakht.ir",
			commerce_order=order.name,
			arguments='{"app": "accounts"}',
			agent_operation_id="12345678-1234-4234-8234-123456789abc",
			result="{}",
		)
		new_operation = FakeDocument(name="OPERATION-NEW", result="{}")
		updated_site = FakeDocument(apps=[SimpleNamespace(app="accounts")])
		get_remote_operation = unittest.mock.Mock(return_value={"status": "Running"})
		client = SimpleNamespace(
			available_apps=lambda: ["accounts"],
			get_operation=get_remote_operation,
			inventory=lambda: {},
		)
		agent_result = {
			"site": "veederakht.ir",
			"app": "accounts",
			"installed": True,
			"backup": {"backup_id": "backup-1"},
		}

		def get_doc(doctype, name=None, **_kwargs):
			if isinstance(doctype, dict):
				return new_operation
			if name == operation.name:
				return operation
			return updated_site

		with (
			patch.object(docker_control.frappe, "set_user"),
			patch.object(docker_control.frappe.db, "exists", return_value=True),
			patch.object(docker_control.frappe.db, "commit"),
			patch.object(docker_control.frappe, "get_doc", side_effect=get_doc) as get_doc_mock,
			patch.object(docker_control, "_host_doc", return_value=object()),
			patch.object(docker_control, "_client", return_value=client),
			patch.object(docker_control, "_run_agent", return_value=agent_result) as run_agent,
			patch.object(docker_control, "_validate_inventory"),
			patch.object(docker_control, "_store_inventory"),
		):
			docker_control.execute_marketplace_app_install(order, "accounts")

		self.assertIs(run_agent.call_args.args[0], operation)
		self.assertEqual(run_agent.call_args.args[1:4], (
			"install_marketplace_app",
			"veederakht.ir",
			{"app": "accounts"},
		))
		self.assertEqual(order.install_operation, operation.name)
		self.assertEqual(get_doc_mock.call_count, 2)
		get_remote_operation.assert_called_once_with(operation.agent_operation_id)

	def test_reuses_the_stable_agent_id_if_the_status_request_loses_connection(self):
		order = FakeDocument(
			name="ORDER-1",
			docker_site="veederakht.ir",
			team="TEAM-1",
			customer="buyer@example.com",
			install_operation="OPERATION-OLD",
		)
		operation = FakeDocument(
			name="OPERATION-OLD",
			action="install_marketplace_app",
			target="veederakht.ir",
			commerce_order=order.name,
			arguments='{"app": "accounts"}',
			agent_operation_id="12345678-1234-4234-8234-123456789abc",
			result="{}",
		)
		updated_site = FakeDocument(apps=[SimpleNamespace(app="accounts")])
		get_remote_operation = unittest.mock.Mock(
			side_effect=docker_control.DockerControlError("connection unavailable")
		)
		client = SimpleNamespace(
			available_apps=lambda: ["accounts"],
			get_operation=get_remote_operation,
			inventory=lambda: {},
		)
		agent_result = {
			"site": "veederakht.ir",
			"app": "accounts",
			"installed": True,
			"backup": {"backup_id": "backup-1"},
		}

		def get_doc(doctype, name=None, **_kwargs):
			if name == operation.name:
				return operation
			return updated_site

		with (
			patch.object(docker_control.frappe, "set_user"),
			patch.object(docker_control.frappe.db, "exists", return_value=True),
			patch.object(docker_control.frappe.db, "commit"),
			patch.object(docker_control.frappe, "get_doc", side_effect=get_doc),
			patch.object(docker_control, "_host_doc", return_value=object()),
			patch.object(docker_control, "_client", return_value=client),
			patch.object(docker_control, "_run_agent", return_value=agent_result) as run_agent,
			patch.object(docker_control, "_validate_inventory"),
			patch.object(docker_control, "_store_inventory"),
		):
			docker_control.execute_marketplace_app_install(order, "accounts")

		self.assertIs(run_agent.call_args.args[0], operation)
		get_remote_operation.assert_called_once_with(operation.agent_operation_id)

	def test_creates_a_new_operation_only_after_the_linked_agent_operation_failed(self):
		order = FakeDocument(
			name="ORDER-1",
			docker_site="veederakht.ir",
			team="TEAM-1",
			customer="buyer@example.com",
			install_operation="OPERATION-OLD",
		)
		previous = FakeDocument(
			name="OPERATION-OLD",
			action="install_marketplace_app",
			target="veederakht.ir",
			commerce_order=order.name,
			arguments='{"app": "accounts"}',
			agent_operation_id="12345678-1234-4234-8234-123456789abc",
			result="{}",
		)
		retry = FakeDocument(name="OPERATION-NEW", result="{}")
		updated_site = FakeDocument(apps=[SimpleNamespace(app="accounts")])
		get_remote_operation = unittest.mock.Mock(return_value={"status": "Failure"})
		client = SimpleNamespace(
			available_apps=lambda: ["accounts"],
			get_operation=get_remote_operation,
			inventory=lambda: {},
		)
		agent_result = {
			"site": "veederakht.ir",
			"app": "accounts",
			"installed": True,
			"backup": {"backup_id": "backup-2"},
		}

		def get_doc(doctype, name=None, **_kwargs):
			if isinstance(doctype, dict):
				return retry
			return {"OPERATION-OLD": previous, "Docker Control Site": updated_site}[
				name if name != "veederakht.ir" else "Docker Control Site"
			]

		with (
			patch.object(docker_control.frappe, "set_user"),
			patch.object(docker_control.frappe.db, "exists", return_value=True),
			patch.object(docker_control.frappe.db, "commit"),
			patch.object(docker_control.frappe, "get_doc", side_effect=get_doc),
			patch.object(docker_control, "_host_doc", return_value=object()),
			patch.object(docker_control, "_client", return_value=client),
			patch.object(docker_control, "_run_agent", return_value=agent_result) as run_agent,
			patch.object(docker_control, "_validate_inventory"),
			patch.object(docker_control, "_store_inventory"),
		):
			docker_control.execute_marketplace_app_install(order, "accounts")

		self.assertIs(run_agent.call_args.args[0], retry)
		self.assertEqual(order.install_operation, retry.name)
		get_remote_operation.assert_called_once_with(previous.agent_operation_id)

	def test_rejects_a_linked_operation_for_a_different_order_or_app(self):
		order = FakeDocument(
			name="ORDER-1",
			docker_site="veederakht.ir",
			team="TEAM-1",
			customer="buyer@example.com",
			install_operation="OPERATION-OLD",
		)
		operation = FakeDocument(
			name="OPERATION-OLD",
			action="install_marketplace_app",
			target="veederakht.ir",
			commerce_order="ORDER-OTHER",
			arguments='{"app": "accounts"}',
			result="{}",
		)
		client = SimpleNamespace(available_apps=lambda: ["accounts"])

		new_operation = FakeDocument(name="OPERATION-NEW", result="{}")

		def get_doc(doctype, name=None, **_kwargs):
			if isinstance(doctype, dict):
				return new_operation
			if name == operation.name:
				return operation
			return FakeDocument(apps=[])

		with (
			patch.object(docker_control.frappe, "set_user"),
			patch.object(docker_control.frappe.db, "exists", return_value=True),
			patch.object(docker_control.frappe, "get_doc", side_effect=get_doc),
			patch.object(docker_control, "_host_doc", return_value=object()),
			patch.object(docker_control, "_client", return_value=client),
			patch.object(docker_control, "_run_agent") as run_agent,
			self.assertRaises(docker_control.DockerControlError),
		):
			docker_control.execute_marketplace_app_install(order, "accounts")

		run_agent.assert_not_called()

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
