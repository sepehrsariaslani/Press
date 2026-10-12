from __future__ import annotations

import frappe
from press.utils import is_user_part_of_team

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


def has_site_team_admin_access(
	*, user: str, site_team: str | None, team_owner: str | None, is_team_member: bool, team_admin: bool
) -> bool:
	"""Allow a team owner/admin to manage only sites explicitly assigned to that team."""
	return bool(
		user
		and user != "Guest"
		and site_team
		and (user == team_owner or (is_team_member and team_admin))
	)


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

	site_team = frappe.db.get_value(
		"Docker Control Site", {"domain": domain, "enabled": 1}, "team"
	)
	if not site_team or not frappe.db.exists("Team", {"name": site_team, "enabled": 1}):
		return False

	team = frappe.get_cached_doc("Team", site_team)
	return has_site_team_admin_access(
		user=user,
		site_team=site_team,
		team_owner=frappe.db.get_value("Team", site_team, "user"),
		is_team_member=is_user_part_of_team(user, site_team),
		team_admin=team.is_admin_user(),
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
