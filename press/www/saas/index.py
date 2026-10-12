# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and Contributors
# For license information, please see license.txt

import frappe

from press.guards.role_guard import roles_enabled, skip_roles
from press.utils import get_current_team, is_user_part_of_team
from press.utils import user as user_utils
from press.utils.marketplace_app_plan_permissions import can_manage_marketplace_app_plans


def _can_manage_marketplace_prices():
	if frappe.has_permission("Marketplace App Plan", ptype="write"):
		return True

	if frappe.session.user == "Guest":
		return False
	if user_utils.is_system_manager():
		return True

	try:
		team = frappe.get_doc("Team", _get_marketplace_permission_team())
	except frappe.AuthenticationError:
		return False

	is_team_owner = team.is_team_owner()
	is_team_admin = team.is_admin_user()
	if is_team_owner or is_team_admin:
		return True

	is_team_member = is_user_part_of_team(frappe.session.user, team.name)
	if not is_team_member:
		return False

	return can_manage_marketplace_app_plans(
		has_global_permission=False,
		is_team_owner=False,
		is_team_admin=False,
		is_team_member=True,
		team_roles_enabled=roles_enabled(team.name),
		skip_role_checks=skip_roles(team.name),
	)


def _get_marketplace_permission_team():
	"""Use the dashboard's selected team when rendering its public seller link."""
	request = getattr(frappe.local, "request", None)
	cookies = getattr(request, "cookies", {})
	request_team = frappe.get_request_header("X-Press-Team")
	cookie_team = cookies.get("press_current_team") if hasattr(cookies, "get") else None
	selected_team = (
		request_team
		if isinstance(request_team, str) and request_team
		else cookie_team
	)
	user = frappe.session.user

	if isinstance(selected_team, str) and selected_team and user != "Guest":
		team_is_enabled = frappe.db.exists("Team", {"name": selected_team, "enabled": 1})
		team_owner = frappe.db.get_value("Team", selected_team, "user")
		if team_is_enabled and (team_owner == user or is_user_part_of_team(user, selected_team)):
			return selected_team

	return get_current_team()


def get_context(_context):
	frappe.flags.redirect_location = frappe.utils.get_url("/#apps")
	raise frappe.Redirect
