import unittest

from press.saas.commerce.service_delivery import (
	EXISTING_SITE_UPGRADE,
	NEW_SITE_PROVISIONING,
	has_active_wildcard_certificate,
	is_verified_hosting_site_creation,
	new_hosted_site_renewal_action,
	is_proxy_dns_ready,
	new_site_delivery_action,
	new_site_hosting_order_action,
	normalize_site_plan_delivery_mode,
	is_public_shared_site_server,
)


class SitePlanDeliveryModeTest(unittest.TestCase):
	def test_wildcard_certificate_uses_root_domain_field_and_wildcard_flag(self):
		self.assertTrue(
			has_active_wildcard_certificate(
				"asumi.ir",
				[{"domain": "asumi.ir", "wildcard": 1, "status": "Active"}],
			)
		)
		self.assertFalse(
			has_active_wildcard_certificate(
				"asumi.ir",
				[{"domain": "*.asumi.ir", "wildcard": 1, "status": "Active"}],
			)
		)
		self.assertFalse(
			has_active_wildcard_certificate(
				"asumi.ir",
				[{"domain": "*.asumi.ir", "wildcard": 0, "status": "Active"}],
			)
		)

	def test_site_creation_status_finishes_only_a_provisioning_order(self):
		self.assertEqual(new_site_hosting_order_action("Active", "Provisioning"), "activate")
		self.assertEqual(new_site_hosting_order_action("Broken", "Provisioning"), "fail")
		self.assertIsNone(new_site_hosting_order_action("Active", "Active"))
		self.assertIsNone(new_site_hosting_order_action("Installing", "Provisioning"))

	def test_new_site_dns_readiness_accepts_a_proxy_cname_or_matching_address(self):
		self.assertTrue(is_proxy_dns_ready({"matched": True}, {"matched": False}))
		self.assertTrue(is_proxy_dns_ready({"matched": False}, {"matched": True}))
		self.assertFalse(is_proxy_dns_ready({"matched": False}, {"matched": False}))

	def test_new_site_requires_an_active_public_server_with_a_proxy(self):
		self.assertTrue(is_public_shared_site_server({"status": "Active", "public": 1, "proxy_server": "proxy-1"}))
		self.assertFalse(is_public_shared_site_server({"status": "Active", "public": 0, "proxy_server": "proxy-1"}))
		self.assertFalse(is_public_shared_site_server({"status": "Broken", "public": 1, "proxy_server": "proxy-1"}))
		self.assertFalse(is_public_shared_site_server({"status": "Active", "public": 1, "proxy_server": None}))

	def test_accepts_existing_site_upgrade_and_new_site_provisioning(self):
		self.assertEqual(normalize_site_plan_delivery_mode(EXISTING_SITE_UPGRADE), EXISTING_SITE_UPGRADE)
		self.assertEqual(normalize_site_plan_delivery_mode(NEW_SITE_PROVISIONING), NEW_SITE_PROVISIONING)

	def test_defaults_old_plans_to_existing_site_upgrade(self):
		self.assertEqual(normalize_site_plan_delivery_mode(None), EXISTING_SITE_UPGRADE)
		self.assertEqual(normalize_site_plan_delivery_mode(""), EXISTING_SITE_UPGRADE)

	def test_rejects_unrecognized_delivery_mode(self):
		with self.assertRaises(ValueError):
			normalize_site_plan_delivery_mode("Run arbitrary command")

	def test_new_site_delivery_waits_for_agent_and_activates_only_matching_site(self):
		order = {"team": "team-1", "plan": "plan-1", "subdomain": "shops"}
		site = {
			"team": "team-1",
			"plan": "plan-1",
			"subdomain": "shops",
			"domain": "asumi.ir",
			"name": "shops.asumi.ir",
			"status": "Pending",
		}
		self.assertEqual(new_site_delivery_action(order, site), "wait")
		site["status"] = "Installing"
		self.assertEqual(new_site_delivery_action(order, site), "wait")
		site["status"] = "Active"
		self.assertEqual(new_site_delivery_action(order, site), "activate")
		site["status"] = "Suspended"
		self.assertEqual(new_site_delivery_action(order, site), "resume")

	def test_new_site_delivery_rejects_mismatched_or_broken_site(self):
		order = {"team": "team-1", "plan": "plan-1", "subdomain": "shops"}
		site = {
			"team": "another-team",
			"plan": "plan-1",
			"subdomain": "shops",
			"domain": "asumi.ir",
			"name": "shops.asumi.ir",
			"status": "Active",
		}
		with self.assertRaises(ValueError):
			new_site_delivery_action(order, site)
		site.update(team="team-1", status="Broken")
		with self.assertRaises(ValueError):
			new_site_delivery_action(order, site)

	def test_verified_paid_order_authorizes_only_its_customer_and_exact_site(self):
		order = {
			"status": "Provisioning",
			"order_type": "Hosting",
			"service_delivery_mode": "Create New Site",
			"customer": "buyer@example.com",
			"team": "team-1",
			"plan": "plan-1",
			"subdomain": "shops",
		}
		site = {
			"team": "team-1",
			"subscription_plan": "plan-1",
			"subdomain": "shops",
			"domain": "asumi.ir",
		}
		self.assertTrue(is_verified_hosting_site_creation(order, site, "buyer@example.com"))
		self.assertFalse(is_verified_hosting_site_creation(order, site, "another@example.com"))
		order["status"] = "Pending Payment"
		self.assertFalse(is_verified_hosting_site_creation(order, site, "buyer@example.com"))

	def test_paid_hosting_renewal_resumes_only_the_site_linked_to_its_original_order(self):
		original = {
			"name": "ORDER-ORIGINAL",
			"status": "Expired",
			"order_type": "Hosting",
			"service_delivery_mode": "Create New Site",
			"team": "team-1",
			"plan": "plan-1",
			"subdomain": "shops",
			"docker_site": "shops.asumi.ir",
		}
		renewal = {
			"name": "ORDER-RENEWAL",
			"status": "Provisioning",
			"order_type": "Hosting",
			"service_delivery_mode": "Create New Site",
			"provider": "ZarinPal",
			"sandbox_mode": 0,
			"currency": "IRR",
			"amount": 25000,
			"paid_at": "2026-10-13 10:00:00",
			"payment_reference": "ZP-123",
			"team": "team-1",
			"plan": "plan-1",
			"subdomain": "shops",
			"docker_site": "shops.asumi.ir",
		}
		site = {
			"domain": "shops.asumi.ir",
			"team": "team-1",
			"hosting_plan": "plan-1",
			"hosting_order": "ORDER-ORIGINAL",
			"hosted_status": "Suspended",
		}

		self.assertEqual(new_hosted_site_renewal_action(renewal, site, original), "resume")
		site["hosted_status"] = "Active"
		self.assertEqual(new_hosted_site_renewal_action(renewal, site, original), "activate")
		with self.assertRaises(ValueError):
			new_hosted_site_renewal_action(
				{**renewal, "payment_reference": None}, site, original
			)
		with self.assertRaises(ValueError):
			new_hosted_site_renewal_action(
				{**renewal, "docker_site": "other.asumi.ir"}, site, original
			)


if __name__ == "__main__":
	unittest.main()
