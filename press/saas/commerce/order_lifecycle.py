"""Allowed state transitions for customer commerce orders."""

ORDER_TRANSITIONS = {
	"Pending Payment": {"Paid", "Payment Failed", "Cancelled"},
	"Paid": {"Provisioning", "Refunded"},
	"Provisioning": {"Active", "Provisioning Failed"},
	"Provisioning Failed": {"Provisioning", "Refunded"},
	"Active": {"Refunded", "Expired"},
	"Payment Failed": set(),
	"Cancelled": set(),
	"Refunded": set(),
	"Expired": set(),
}


def can_transition(current_status: str, next_status: str) -> bool:
	"""Return whether an order can move between two known states."""
	return next_status in ORDER_TRANSITIONS.get(current_status, set())


def transition_order(current_status: str, next_status: str) -> str:
	"""Validate an order state change and return the accepted next state."""
	if current_status not in ORDER_TRANSITIONS:
		raise ValueError(f"Unknown order status: {current_status}")
	if next_status not in ORDER_TRANSITIONS:
		raise ValueError(f"Unknown order status: {next_status}")
	if not can_transition(current_status, next_status):
		raise ValueError(f"Order cannot transition from {current_status} to {next_status}")
	return next_status


def refund_order_update(
	current_status: str,
	refund_reference: str,
	refund_note: str,
	refunded_by: str,
	refunded_at,
) -> dict:
	"""Build the audit fields for a refund already completed with the provider."""
	if current_status not in {"Paid", "Active", "Provisioning Failed"}:
		raise ValueError("فقط سفارش پرداخت‌شده و بازپرداخت‌نشده قابل ثبت است.")
	refund_reference = str(refund_reference or "").strip()
	if not refund_reference or len(refund_reference) > 140:
		raise ValueError("شمارهٔ پیگیری بازپرداخت را وارد کنید.")
	return {
		"status": transition_order(current_status, "Refunded"),
		"refund_reference": refund_reference,
		"refund_note": str(refund_note or "").strip()[:500],
		"refunded_at": refunded_at,
		"refunded_by": refunded_by,
	}


def customer_provisioning_message(status: str) -> str:
	"""Return a safe customer-facing message without internal exception details."""
	if status == "Provisioning Failed":
		return "تحویل سفارش با مشکل مواجه شده و در حال پیگیری است."
	return ""
