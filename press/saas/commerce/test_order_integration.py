import unittest
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from press.agent import Agent
from press.marketplace.doctype.marketplace_app_plan.test_marketplace_app_plan import (
	create_test_marketplace_app_plan,
)
from press.press.doctype.agent_job.agent_job import AgentJob
from press.press.doctype.app.test_app import create_test_app
from press.press.doctype.marketplace_app.test_marketplace_app import create_test_marketplace_app
from press.press.doctype.site.site import Site
from press.press.doctype.site_backup.site_backup import SiteBackup
from press.press.doctype.press_subscription.press_subscription import PressSubscription
from press.press.doctype.team.test_team import create_test_team
from press.saas.commerce import api


class CommerceOrderIntegrationTest(FrappeTestCase):
	"""Exercise Commerce Order workflows against Frappe's database layer."""

	def make_order(self, **overrides):
		values = {
			"doctype": "Commerce Order",
			"order_type": "Hosting",
			"plan_type": "Site Plan",
			"plan": "integration-site-plan",
			"interval": "Monthly",
			"team": "integration-team",
			"customer": "Administrator",
			"currency": "IRR",
			"amount": 25000,
			"status": "Provisioning",
			"site": "integration-site.example.test",
			"service_delivery_mode": "Create New Site",
			"subdomain": "integration-site",
			**overrides,
		}
		doc = frappe.get_doc(values)
		doc.flags.ignore_links = True
		doc.insert(ignore_permissions=True)
		return doc

	def test_new_site_delivery_hook_activates_only_the_matching_order(self):
		order = self.make_order()
		site = frappe._dict(
			doctype="Site",
			name=order.site,
			status="Active",
			team=order.team,
			plan=order.plan,
			subdomain=order.subdomain,
		)

		api.activate_new_site_commerce_orders(site)

		order.reload()
		self.assertEqual(order.status, "Active")
		self.assertIsNotNone(order.service_starts_at)
		self.assertIsNotNone(order.service_ends_at)

	def test_hosting_renewal_starts_at_the_end_of_the_current_paid_term(self):
		current_end = frappe.utils.add_to_date(frappe.utils.now_datetime(), days=20)
		self.make_order(status="Active", service_ends_at=current_end)
		renewal = self.make_order(status="Provisioning")

		api._activate_hosting_order(renewal)

		renewal.reload()
		self.assertEqual(renewal.status, "Active")
		self.assertEqual(str(renewal.service_starts_at)[:19], str(current_end)[:19])
		self.assertGreater(renewal.service_ends_at, renewal.service_starts_at)

	def test_paid_or_active_hosting_orders_suppress_duplicate_usage_invoices(self):
		for status in ("Paid", "Provisioning", "Provisioning Failed", "Active"):
			with self.subTest(status=status):
				order = self.make_order(
					status=status,
					service_ends_at=(
						frappe.utils.add_to_date(frappe.utils.now_datetime(), days=10)
						if status == "Active"
						else None
					),
				)
				subscription = frappe.get_doc(
					{
						"doctype": "Press Subscription",
						"name": f"integration-subscription-{order.name}",
						"team": order.team,
						"document_type": "Site",
						"document_name": order.site,
						"plan_type": "Site Plan",
						"plan": order.plan,
					}
				)

				self.assertFalse(PressSubscription.can_charge_for_subscription(subscription))

	def test_admin_refund_records_the_provider_reference_on_the_order(self):
		order = self.make_order(
			order_type="Marketplace App",
			plan_type="Marketplace App Plan",
			status="Active",
			service_delivery_mode=None,
			site=None,
			provider="ZarinPal",
		)

		with patch.object(api, "_require_commerce_admin"):
			result = api.record_refund(order.name, "RFD-INTEGRATION-1", "integration refund")

		order.reload()
		self.assertEqual(result["status"], "Refunded")
		self.assertEqual(order.status, "Refunded")
		self.assertEqual(order.refund_reference, "RFD-INTEGRATION-1")
		self.assertEqual(order.refund_note, "integration refund")

	def test_expiry_job_marks_an_ended_hosting_term_expired(self):
		order = self.make_order(
			status="Active",
			service_ends_at=frappe.utils.add_to_date(frappe.utils.now_datetime(), days=-1),
			site=None,
		)

		api.expire_commerce_orders()

		order.reload()
		self.assertEqual(order.status, "Expired")

	def test_marketplace_order_keeps_backup_on_failed_install_and_activates_after_retry(self):
		team = create_test_team()
		app_name = f"commerce_integration_{frappe.generate_hash(length=8).lower()}"
		create_test_app("frappe", "Frappe Framework")
		create_test_app(app_name, "Commerce Integration App")
		marketplace_app = create_test_marketplace_app(app_name, team=team.name)
		plan = create_test_marketplace_app_plan(app_name)
		plan.db_set("price_irr", 25_000)
		plan.reload()
		site = frappe.get_doc(
			{
				"doctype": "Site",
				"status": "Active",
				"subdomain": "commerce-integration",
				"server": "integration-server",
				"bench": "integration-bench",
				"group": "integration-release-group",
				"cluster": "integration-cluster",
				"team": team.name,
				"apps": [{"app": "frappe"}],
			}
		)
		site.flags.ignore_links = True
		with (
			patch.object(Site, "before_insert"),
			patch.object(Site, "validate"),
			patch.object(Site, "after_insert"),
			patch.object(Site, "on_update"),
		):
			site.insert(ignore_permissions=True)
		order = frappe.get_doc(
			{
				"doctype": "Commerce Order",
				"order_type": "Marketplace App",
				"plan_type": "Marketplace App Plan",
				"plan": plan.name,
				"interval": plan.interval,
				"marketplace_app": marketplace_app.name,
				"site": site.name,
				"installation_required": 1,
				"team": team.name,
				"customer": team.user,
				"currency": "IRR",
				"amount": plan.price_irr,
				"status": "Paid",
			}
		).insert(ignore_permissions=True)

		wait_for_backup = api._wait_for_site_backup
		wait_for_agent_job = api._wait_for_site_agent_job
		install_results = iter(["Failure", "Success"])
		original_get_doc = frappe.get_doc
		original_exists = frappe.db.exists

		def complete_backup(backup_name):
			backup = frappe.get_doc("Site Backup", backup_name)
			frappe.db.set_value(
				"Site Backup",
				backup_name,
				{
					"status": "Success",
					"database_file": "database.sql.gz",
					"public_file": "public-files.tar",
					"private_file": "private-files.tar",
				},
			)
			if backup.job:
				frappe.db.set_value("Agent Job", backup.job, "status", "Success")
			return wait_for_backup(backup_name)

		def complete_install(job_name):
			frappe.db.set_value("Agent Job", job_name, "status", next(install_results))
			frappe.db.set_value("Site", site.name, "status", "Active")
			return wait_for_agent_job(job_name)

		def get_doc(*args, **kwargs):
			if len(args) > 1 and args[:2] == ("Bench", "integration-bench"):
				return frappe._dict(apps=[frappe._dict(app="frappe"), frappe._dict(app=app_name)])
			if not args and kwargs.get("doctype") == "Bench" and kwargs.get("name") == "integration-bench":
				return frappe._dict(apps=[frappe._dict(app="frappe"), frappe._dict(app=app_name)])
			return original_get_doc(*args, **kwargs)

		def exists(doctype, name=None, *args, **kwargs):
			if doctype == "Bench" and name == "integration-bench":
				return True
			return original_exists(doctype, name, *args, **kwargs)

		def create_agent_job(job_type, target_site, request_path, request_data):
			job = frappe.get_doc(
				{
					"doctype": "Agent Job",
					"job_type": job_type,
					"server_type": "Server",
					"server": target_site.server,
					"bench": target_site.bench,
					"site": target_site.name,
					"status": "Pending",
					"request_method": "POST",
					"request_path": request_path,
					"request_data": frappe.as_json(request_data),
					"request_files": "{}",
				}
			)
			job.flags.ignore_links = True
			with patch.object(AgentJob, "after_insert"):
				return job.insert(ignore_permissions=True)

		def request_backup(backup):
			job = create_agent_job(
				"Backup Site",
				site,
				f"benches/{site.bench}/sites/{site.name}/backup",
				{"with_files": 1},
			)
			backup.db_set("job", job.name)
			return job

		def request_install(_agent, target_site, app):
			return create_agent_job(
				"Install App on Site",
				target_site,
				f"benches/{target_site.bench}/sites/{target_site.name}/apps",
				{"name": app},
			)

		def sync_installed_apps(target_site):
			target_site.flags.ignore_links = True
			target_site.set("apps", [])
			target_site.append("apps", {"app": "frappe"})
			target_site.append("apps", {"app": app_name})
			target_site.save(ignore_permissions=True)

		with (
			patch.object(Site, "validate"),
			patch.object(Site, "on_update"),
			patch.object(Site, "sync_apps", new=sync_installed_apps),
			patch.object(SiteBackup, "start_backup", new=request_backup),
			patch.object(Agent, "install_app_site", new=request_install),
			patch.object(AgentJob, "enqueue_http_request"),
			patch.object(AgentJob, "after_insert"),
			patch.object(api.frappe, "get_doc", side_effect=get_doc),
			patch.object(api.frappe.db, "exists", side_effect=exists),
			patch.object(api, "_wait_for_site_backup", side_effect=complete_backup),
			patch.object(api, "_wait_for_site_agent_job", side_effect=complete_install),
			patch.object(api, "_sync_marketplace_subscription_config"),
			patch.object(api.frappe.db, "commit"),
			patch.object(api.frappe, "log_error"),
		):
			self.assertEqual(api.provision_paid_order(order.name), "Provisioning Failed")
			order.reload()
			self.assertEqual(order.status, "Provisioning Failed")
			self.assertTrue(order.install_backup, order.provisioning_error)
			self.assertTrue(frappe.db.exists("Site Backup", order.install_backup))
			failed_backup = frappe.get_doc("Site Backup", order.install_backup)
			self.assertEqual(failed_backup.status, "Success")
			self.assertTrue(failed_backup.with_files)
			self.assertTrue(failed_backup.database_file)
			self.assertTrue(failed_backup.public_file)
			self.assertTrue(failed_backup.private_file)
			self.assertEqual(
				frappe.db.get_value("Agent Job", order.agent_job, "status"), "Failure"
			)
			self.assertFalse(
				frappe.db.exists(
					"Press Subscription",
					{
						"site": site.name,
						"document_type": "Marketplace App",
						"document_name": app_name,
					},
				)
			)

			result = api.provision_paid_order(order.name)
			order.reload()
			self.assertEqual(result, "Active", order.provisioning_error)

		order.reload()
		subscription = frappe.get_doc("Press Subscription", order.subscription)
		self.assertEqual(order.status, "Active")
		self.assertEqual(order.provisioning_attempts, 2)
		self.assertTrue(order.agent_job)
		self.assertTrue(order.install_backup)
		self.assertEqual(
			frappe.db.get_value("Agent Job", order.agent_job, "status"), "Success"
		)
		self.assertEqual(frappe.db.count("Site Backup", {"site": site.name}), 2)
		self.assertEqual(subscription.enabled, 1)
		self.assertEqual(subscription.site, site.name)
		self.assertEqual(subscription.team, team.name)
		self.assertEqual(subscription.plan, plan.name)
		installed_apps = {row.app for row in frappe.get_doc("Site", site.name).apps}
		self.assertIn(app_name, installed_apps)


def run_order_integration_tests():
	"""Run DB integration tests without importing every Press test module."""
	frappe.in_test = True
	frappe.flags.in_test = True
	suite = unittest.defaultTestLoader.loadTestsFromTestCase(CommerceOrderIntegrationTest)
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	if not result.wasSuccessful():
		raise RuntimeError("Commerce order integration tests failed")
	return {
		"tests_run": result.testsRun,
		"failures": len(result.failures),
		"errors": len(result.errors),
	}
