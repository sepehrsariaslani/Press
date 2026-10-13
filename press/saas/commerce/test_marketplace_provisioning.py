import sys
import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch

from press.saas.commerce import api


class FakeDocument(SimpleNamespace):
	def db_set(self, fieldname, value=None, **kwargs):
		if isinstance(fieldname, dict):
			self.__dict__.update(fieldname)
		else:
			setattr(self, fieldname, value)

	def insert(self, **kwargs):
		return self

	def save(self, **kwargs):
		return self

	def reload(self):
		return self

	def sync_apps(self):
		return self


class MarketplaceProvisioningTest(unittest.TestCase):
	def make_context(self):
		events = []
		order = FakeDocument(
			name="ORDER-1",
			status="Paid",
			order_type="Marketplace App",
			plan="PLAN-1",
			marketplace_app="APP-1",
			app="accounts",
			team="TEAM-1",
			customer="buyer@example.com",
			amount=0,
			interval="Monthly",
			site="store.example.test",
			docker_site=None,
			installation_required=1,
			provisioning_attempts=0,
		)
		plan = FakeDocument(name="PLAN-1", app="APP-1", enabled=1, price_irr=0, interval="Monthly")
		app = FakeDocument(name="APP-1", app="accounts")
		site = FakeDocument(
			name=order.site,
			team=order.team,
			status="Active",
			bench="BENCH-1",
			server="SERVER-1",
			apps=[],
		)
		bench = FakeDocument(apps=[FakeDocument(app="accounts")])
		subscription = FakeDocument(name="SUB-1", secret_key="subscription-key")
		docs = {
			("Commerce Order", order.name): order,
			("Marketplace App Plan", plan.name): plan,
			("Marketplace App", app.name): app,
			("Site", site.name): site,
			("Bench", "BENCH-1"): bench,
		}

		def get_doc(doctype, name=None, **kwargs):
			if isinstance(doctype, dict):
				events.append("create-subscription")
				return subscription
			return docs[(doctype, name)]

		return events, order, app, site, subscription, get_doc

	def run_provisioning(self, context, installer, subscription_lookup=None):
		events, order, app, site, subscription, get_doc = context
		with (
			patch.object(api.frappe, "get_doc", side_effect=get_doc),
			patch.object(api.frappe, "get_all", return_value=[]),
			patch.object(api.frappe.db, "exists", return_value=True),
			patch.object(api.frappe, "log_error"),
			patch.object(api, "_install_marketplace_app_for_order", side_effect=installer),
			patch.object(
				api,
				"_get_app_subscription",
				side_effect=subscription_lookup or (lambda *_args: None),
			),
			patch.object(
				api,
				"_sync_marketplace_subscription_config",
				side_effect=lambda *_args: events.append("sync-subscription"),
			),
			patch.object(api, "period_end", return_value=datetime(2026, 11, 13)),
		):
			api.provision_paid_order(order.name)
		return events, order, app, site, subscription

	def test_installs_missing_bench_app_before_creating_and_activating_subscription(self):
		context = self.make_context()
		events, order, app, site, subscription, _get_doc = context

		def install(order_arg, site_arg, app_arg):
			events.append("backup-and-install")
			site_arg.apps = [FakeDocument(app=app_arg.app)]

		def find_subscription(*_args):
			events.append("lookup-subscription")
			return None

		self.run_provisioning(context, install, find_subscription)

		self.assertEqual(order.status, "Active")
		self.assertEqual(order.subscription, subscription.name)
		self.assertIn("accounts", {row.app for row in site.apps})
		self.assertLess(events.index("backup-and-install"), events.index("lookup-subscription"))
		self.assertLess(events.index("lookup-subscription"), events.index("create-subscription"))
		self.assertLess(events.index("create-subscription"), events.index("sync-subscription"))

	def test_retry_does_not_install_twice_if_install_succeeded_before_a_later_failure(self):
		context = self.make_context()
		events, order, _app, site, _subscription, _get_doc = context
		install_calls = []

		def install(_order, site_arg, app_arg):
			install_calls.append(app_arg.app)
			site_arg.apps = [FakeDocument(app=app_arg.app)]
			if len(install_calls) == 1:
				raise RuntimeError("temporary post-install inventory failure")

		self.run_provisioning(context, install)
		self.assertEqual(order.status, "Provisioning Failed")
		self.assertIn("accounts", {row.app for row in site.apps})

		self.run_provisioning(context, install)

		self.assertEqual(order.status, "Active")
		self.assertEqual(order.provisioning_attempts, 2)
		self.assertEqual(install_calls, ["accounts"])

	def test_pending_payment_order_cannot_start_installation(self):
		order = FakeDocument(name="ORDER-1", status="Pending Payment")
		with (
			patch.object(api.frappe, "get_doc", return_value=order),
			patch.object(api, "_install_marketplace_app_for_order") as install,
		):
			result = api.provision_paid_order(order.name)

		self.assertEqual(result, "Pending Payment")
		install.assert_not_called()

	def test_press_site_install_waits_for_complete_backup_before_agent_job(self):
		events = []
		order = FakeDocument(name="ORDER-1", team="TEAM-1", docker_site=None)
		site = FakeDocument(name="store.example.test", server="SERVER-1", apps=[])
		app = FakeDocument(app="accounts")
		backup = FakeDocument(
			name="BACKUP-1",
			with_files=1,
			database_file="database.sql.gz",
			public_file="public.tgz",
			private_file="private.tgz",
		)
		job = FakeDocument(name="JOB-1")
		agent = SimpleNamespace(install_app_site=lambda *_args: events.append("install-job") or job)

		def get_doc(doctype, name=None, **kwargs):
			if isinstance(doctype, dict):
				events.append("create-backup")
				return backup
			return site

		def wait_for_backup(_name):
			events.append("backup-complete")
			return backup

		def wait_for_job(_name):
			events.append("install-complete")
			site.apps = [FakeDocument(app="accounts")]

		with (
			patch.object(api.frappe, "get_doc", side_effect=get_doc),
			patch.object(api.frappe.db, "commit"),
			patch.object(api.frappe.db, "set_value"),
			patch("press.agent.Agent", return_value=agent),
			patch(
				"press.press.doctype.site_activity.site_activity.log_site_activity"
			),
			patch.object(api, "_wait_for_site_backup", side_effect=wait_for_backup),
			patch.object(api, "_wait_for_site_agent_job", side_effect=wait_for_job),
		):
			api._install_marketplace_app_for_order(order, site, app)

		self.assertLess(events.index("backup-complete"), events.index("install-job"))
		self.assertLess(events.index("install-job"), events.index("install-complete"))
		self.assertEqual(order.install_backup, backup.name)
		self.assertEqual(order.agent_job, job.name)

	def test_press_site_install_stops_if_backup_is_incomplete(self):
		order = FakeDocument(name="ORDER-1", team="TEAM-1", docker_site=None)
		site = FakeDocument(name="store.example.test", server="SERVER-1", apps=[])
		app = FakeDocument(app="accounts")
		backup = FakeDocument(name="BACKUP-1")
		agent = SimpleNamespace(install_app_site=lambda *_args: self.fail("install must not start"))

		def throw(message, *_args, **_kwargs):
			raise RuntimeError(message)

		with (
			patch.object(api.frappe, "get_doc", return_value=backup),
			patch.object(api.frappe.db, "commit"),
			patch("press.agent.Agent", return_value=agent),
			patch.object(
				api,
				"_wait_for_site_backup",
				return_value=FakeDocument(database_file="db", public_file=None, private_file=None),
			),
			patch.object(api.frappe, "throw", side_effect=throw),
		):
			with self.assertRaisesRegex(RuntimeError, "پشتیبان کامل"):
				api._install_marketplace_app_for_order(order, site, app)


if __name__ == "__main__":
	unittest.main()


def run_mocked_tests():
	"""Run this module's mock-isolated tests through bench's initialized Python context."""
	from press.saas.commerce import test_marketplace_targets, test_provisioning_recovery

	modules = [sys.modules[__name__], test_marketplace_targets, test_provisioning_recovery]
	suite = unittest.TestSuite(
		unittest.defaultTestLoader.loadTestsFromModule(module) for module in modules
	)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	if not result.wasSuccessful():
		raise RuntimeError("Marketplace provisioning tests failed")
