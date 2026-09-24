import frappe

from press.guards.role_guard import roles_enabled, skip_roles
from press.press.doctype.team.team_members import get_roles
from press.utils import is_admin_user, is_team_owner


def has_team_permission(team, permission: str) -> bool:
	"""Check a Press Role permission while preserving Press's role bypass rules."""
	if (
		"System Manager" in frappe.get_roles()
		or not roles_enabled()
		or skip_roles()
		or is_team_owner(team.name)
		or is_admin_user(team.name)
	):
		return True

	permitted_roles = [role["name"] for role in get_roles(team.name) if role.get(permission)]
	return bool(
		permitted_roles
		and frappe.db.exists(
			"Press Role User",
			{"parent": ("in", permitted_roles), "user": frappe.session.user},
		)
	)


def can_manage_apps(team) -> bool:
	return has_team_permission(team, "allow_apps")


def can_manage_billing(team) -> bool:
	return has_team_permission(team, "allow_billing")
