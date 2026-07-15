# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import frappe
import unittest
from datetime import date
from frappe.utils import add_days, getdate, now_datetime

from press.api.erpyar import (
	seed_erpyar_products,
	get_catalog,
	provision_trial_site,
	check_erpyar_trial_lifecycle
)


class TestErpyarSaaS(unittest.TestCase):
	def setUp(self):
		# Clean up any previous test sites or products
		frappe.db.delete("Site", {"domain": "erpyar.ir"})
		frappe.db.delete("Erpyar Product")
		frappe.db.delete("Root Domain", {"name": "erpyar.ir"})
		frappe.db.commit()

	def tearDown(self):
		frappe.db.delete("Site", {"domain": "erpyar.ir"})
		frappe.db.delete("Erpyar Product")
		frappe.db.delete("Root Domain", {"name": "erpyar.ir"})
		frappe.db.commit()

	def test_migration_seed_safety(self):
		"""Test import and migration safety for Erpyar Product seeding."""
		# 1. Run seed first time
		seed_erpyar_products()
		self.assertEqual(frappe.db.count("Erpyar Product"), 5)

		# Verify products exist
		base_prod = frappe.get_all("Erpyar Product", filters={"product_id": "base"})
		self.assertEqual(len(base_prod), 1)

		# 2. Run seed second time (safety check) - should not duplicate or crash
		seed_erpyar_products()
		self.assertEqual(frappe.db.count("Erpyar Product"), 5)

	def test_get_catalog_modes(self):
		"""Test get_catalog API in both fallback and DB-backed modes."""
		# Scenario A: DB is empty, should return fallback data
		catalog_res = get_catalog()
		self.assertTrue(catalog_res.get("ok"))
		self.assertEqual(len(catalog_res.get("catalog")), 5)
		
		# Scenario B: DB is seeded, should return DB-backed rows
		seed_erpyar_products()
		catalog_res_db = get_catalog()
		self.assertTrue(catalog_res_db.get("ok"))
		self.assertEqual(len(catalog_res_db.get("catalog")), 5)

	def test_provision_trial_site_validation_and_happy_path(self):
		"""Test subdomain validation, uniqueness checks, and successful trial site provisioning."""
		seed_erpyar_products()

		# Setup dynamic root Team and active Cluster/Bench/Server for happy path testing
		if not frappe.db.exists("Team", "Primary Team"):
			frappe.get_doc({"doctype": "Team", "name": "Primary Team", "user": "Administrator"}).insert(ignore_permissions=True)
		if not frappe.db.exists("Cluster", "test-cluster"):
			frappe.get_doc({"doctype": "Cluster", "name": "test-cluster", "status": "Active"}).insert(ignore_permissions=True)
		if not frappe.db.exists("Server", "test-server"):
			frappe.get_doc({"doctype": "Server", "name": "test-server", "status": "Active", "cluster": "test-cluster"}).insert(ignore_permissions=True)
		if not frappe.db.exists("Bench", "test-bench"):
			frappe.get_doc({"doctype": "Bench", "name": "test-bench", "status": "Active", "server": "test-server"}).insert(ignore_permissions=True)
		frappe.db.commit()

		# A. Test validation error: Empty Subdomain
		res = provision_trial_site(slug="", email="test@erpyar.ir")
		self.assertFalse(res.get("ok"))
		
		# B. Test validation error: Weak/invalid subdomain rules
		res = provision_trial_site(slug="invalid_subdomain_!", email="test@erpyar.ir")
		self.assertFalse(res.get("ok"))

		# C. Test validation error: Invalid email format
		res = provision_trial_site(slug="goodcompany", email="invalid-email")
		self.assertFalse(res.get("ok"))

		# D. Test Happy Path provisioning
		res = provision_trial_site(slug="testsite", email="test@erpyar.ir", addons="erpnext,crm")
		self.assertTrue(res.get("ok"))
		self.assertEqual(res.get("site_name"), "testsite.erpyar.ir")

		# E. Test uniqueness validation (subdomain already taken)
		res_dup = provision_trial_site(slug="testsite", email="test@erpyar.ir")
		self.assertFalse(res_dup.get("ok"))
		self.assertIn("قبلاً ثبت شده است", res_dup.get("message"))

	def test_trial_lifecycle_state_machine_transitions(self):
		"""Test trial lifecycle Daily Cron transitions (Active -> Suspended -> Archived)."""
		# Setup test site with Active status and expired trial date (15 days ago)
		expired_trial_date = add_days(getdate(), -15)
		
		site = frappe.get_doc({
			"doctype": "Site",
			"subdomain": "expiredsite",
			"domain": "erpyar.ir",
			"bench": "test-bench",
			"server": "test-server",
			"team": "Primary Team",
			"status": "Active",
			"trial_end_date": expired_trial_date,
			"free": 0,
			"is_standby": 0,
		}).insert(ignore_permissions=True)
		frappe.db.commit()

		# Trigger daily lifecycle cron state machine
		check_erpyar_trial_lifecycle()

		# Verify transition 1: Active site with expired trial must be "Suspended"
		site.reload()
		self.assertEqual(site.status, "Suspended")
		self.assertIsNotNone(site.suspended_at)

		# Modify suspended_at to simulate ending of grace period (8 days ago)
		site.suspended_at = add_days(now_datetime(), -8)
		site.save(ignore_permissions=True)
		frappe.db.commit()

		# Trigger daily lifecycle cron state machine again
		check_erpyar_trial_lifecycle()

		# Verify transition 2: Suspended site past 7 days grace period must be "Archived"
		site.reload()
		self.assertEqual(site.status, "Archived")
