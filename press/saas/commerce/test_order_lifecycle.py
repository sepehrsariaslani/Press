import unittest

from press.saas.commerce.order_lifecycle import (
	can_transition,
	customer_provisioning_message,
	refund_order_update,
	transition_order,
)


class TestOrderLifecycle(unittest.TestCase):
	def test_verified_payment_can_move_pending_order_to_paid(self):
		self.assertTrue(can_transition("Pending Payment", "Paid"))

	def test_unverified_order_cannot_start_provisioning(self):
		self.assertFalse(can_transition("Pending Payment", "Provisioning"))

	def test_provisioning_failure_can_be_retried(self):
		self.assertEqual(transition_order("Provisioning Failed", "Provisioning"), "Provisioning")

	def test_paid_order_cannot_be_marked_active_without_provisioning(self):
		with self.assertRaises(ValueError):
			transition_order("Paid", "Active")

	def test_active_order_can_be_refunded_by_admin(self):
		self.assertTrue(can_transition("Active", "Refunded"))

	def test_active_order_can_expire_at_the_end_of_its_paid_term(self):
		self.assertTrue(can_transition("Active", "Expired"))

	def test_refund_record_requires_reference_and_creates_auditable_transition(self):
		update = refund_order_update(
			"Active", "RFD-123", "Customer request", "admin@example.com", "2026-10-12 12:00:00"
		)
		self.assertEqual(update["status"], "Refunded")
		self.assertEqual(update["refund_reference"], "RFD-123")
		self.assertEqual(update["refund_note"], "Customer request")
		with self.assertRaises(ValueError):
			refund_order_update("Active", "", "", "admin@example.com", "2026-10-12 12:00:00")
		with self.assertRaises(ValueError):
			refund_order_update("Pending Payment", "RFD-123", "", "admin@example.com", "2026-10-12 12:00:00")

	def test_customer_error_message_does_not_expose_provisioning_exception(self):
		self.assertEqual(
			customer_provisioning_message("Provisioning Failed"),
			"تحویل سفارش با مشکل مواجه شده و در حال پیگیری است.",
		)
		self.assertEqual(customer_provisioning_message("Active"), "")

	def test_terminal_payment_failure_cannot_be_reopened(self):
		self.assertFalse(can_transition("Payment Failed", "Paid"))


if __name__ == "__main__":
	unittest.main()
