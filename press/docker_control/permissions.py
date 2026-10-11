from __future__ import annotations

import frappe

CUSTOMER_SITES = ("boller.ir", "dehati.ir", "denroom.ir", "veederakht.ir")
IMPACT_SITES = ("asumi.ir", *CUSTOMER_SITES)
ALLOWED_SERVICES = (
	"backend",
	"websocket",
	"queue-short",
	"queue-long",
	"scheduler",
	"db",
	"redis-cache",
	"redis-queue",
)
ALLOWED_APPS = ("accounts", "restaurant")
STACK_RESTART_ORDER = (
	"db",
	"redis-cache",
	"redis-queue",
	"backend",
	"queue-short",
	"queue-long",
	"scheduler",
	"websocket",
)


def assert_docker_control_admin() -> None:
	if not _is_docker_control_admin(frappe.session.user):
		frappe.throw("فقط مدیر مجاز به مدیریت میزبان Docker است.", frappe.PermissionError)


def has_document_permission(doc=None, user=None, permission_type=None) -> bool:
	return _is_docker_control_admin(user or frappe.session.user)


def get_permission_query_conditions(user=None) -> str:
	if has_document_permission(user=user):
		return ""
	return "1=0"


def _configured_users() -> list[str]:
	value = frappe.conf.get("docker_control_admin_users") or ["Administrator"]
	return [value] if isinstance(value, str) else list(value)


def _is_docker_control_admin(user: str) -> bool:
	return user in _configured_users() or "System Manager" in frappe.get_roles(user)
