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
SITE_SCOPED_ACTIONS = frozenset(
	{
		"backup_site",
		"restore_site",
		"set_maintenance",
		"clear_cache",
		"set_scheduler",
		"migrate_site",
		"read_site_logs",
	}
)
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


def has_site_admin_mapping_access(
	*, user: str, domain: str, mapped_domains: set[str], site_enabled: bool
) -> bool:
	return bool(
		user
		and user != "Guest"
		and domain in CUSTOMER_SITES
		and site_enabled
		and domain in mapped_domains
	)


def has_docker_control_route_access(*, global_admin: bool, mapped_site_access: bool) -> bool:
	return bool(global_admin or mapped_site_access)


def has_docker_control_action_access(
	*, action: str, target: str | None, global_admin: bool, site_admin: bool = False
) -> bool:
	if global_admin:
		return True
	return bool(action in SITE_SCOPED_ACTIONS and target and site_admin)


def can_manage_docker_control_site(domain: str, user: str | None = None) -> bool:
	user = user or frappe.session.user
	if _is_docker_control_admin(user):
		return True
	if user == "Guest" or domain not in CUSTOMER_SITES:
		return False

	site_enabled = bool(
		frappe.db.exists("Docker Control Site", {"domain": domain, "enabled": 1})
	)
	is_mapped = bool(
		frappe.db.exists(
			"Docker Control Site Admin",
			{"parent": domain, "parenttype": "Docker Control Site", "user": user},
		)
	)
	return has_site_admin_mapping_access(
		user=user,
		domain=domain,
		mapped_domains={domain} if is_mapped else set(),
		site_enabled=site_enabled,
	)


def can_access_docker_control(user: str | None = None) -> bool:
	user = user or frappe.session.user
	global_admin = is_docker_control_admin(user)
	if global_admin:
		return has_docker_control_route_access(global_admin=True, mapped_site_access=False)
	if not user or user == "Guest":
		return False
	domains = frappe.get_all(
		"Docker Control Site Admin",
		filters={"user": user, "parent": ("in", CUSTOMER_SITES)},
		pluck="parent",
	)
	return has_docker_control_route_access(
		global_admin=False,
		mapped_site_access=any(can_manage_docker_control_site(domain, user) for domain in set(domains)),
	)


def assert_docker_control_site_admin(domain: str) -> None:
	if not can_manage_docker_control_site(domain):
		frappe.throw("فقط مدیر تیمِ متصل به این سایت اجازهٔ این عملیات را دارد.", frappe.PermissionError)


def assert_docker_control_operation_admin(action: str, target: str | None) -> None:
	global_admin = is_docker_control_admin()
	site_admin = bool(target and can_manage_docker_control_site(target))
	if not has_docker_control_action_access(
		action=action,
		target=target,
		global_admin=global_admin,
		site_admin=site_admin,
	):
		frappe.throw("فقط مدیر مجاز به اجرای این عملیات است.", frappe.PermissionError)


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


def is_docker_control_admin(user: str | None = None) -> bool:
	return _is_docker_control_admin(user or frappe.session.user)
