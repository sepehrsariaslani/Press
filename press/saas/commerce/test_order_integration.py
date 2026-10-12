from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from press.press.doctype.press_subscription.press_subscription import PressSubscription
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
