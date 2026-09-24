import frappe

from press.press.doctype.team.team_members import get_invitations, get_roles
from press.utils import get_current_team


@frappe.whitelist(methods=["GET"])
def team_access():
	team = get_current_team(get_doc=True)
	roles = get_roles(team.name)
	role_permissions = {
		role["name"]: {
			"allow_apps": bool(role.get("allow_apps")),
			"allow_billing": bool(role.get("allow_billing")),
		}
		for role in roles
	}
	members = team.members()
	for member in members:
		for member_role in member.get("roles", []):
			member_role.update(role_permissions.get(member_role["name"], {}))

	return {
		"team": {"name": team.name, "title": team.team_title or team.name},
		"members": members,
		"invitations": get_invitations(team.name),
		"roles": [
			{
				"name": role["name"],
				"title": role["label"],
				"admin_access": role["admin_access"],
				"allow_apps": bool(role.get("allow_apps")),
				"allow_billing": bool(role.get("allow_billing")),
			}
			for role in roles
		],
		"can_manage_members": team.user == frappe.session.user or team.is_admin_user(),
	}


@frappe.whitelist(methods=["POST"])
def invite_team_member(email: str, role: str | None = None):
	team = get_current_team(get_doc=True)
	team.invite_team_member(email, role)
	return {"email": email, "status": "Pending"}


@frappe.whitelist(methods=["POST"])
def cancel_team_invitation(email: str):
	team = get_current_team(get_doc=True)
	team.cancel_invitation(email)
	return {"email": email, "status": "Cancelled"}


@frappe.whitelist(methods=["POST"])
def remove_team_member(email: str):
	team = get_current_team(get_doc=True)
	team.remove_team_member(email)
	return {"email": email, "status": "Removed"}


@frappe.whitelist(methods=["POST"])
def update_team_member_roles(email: str, roles: list[str] | None = None):
	team = get_current_team(get_doc=True)
	_require_team_member_manager(team)
	user = _get_team_member_user(team, email)
	roles = _validate_team_roles(team, roles)
	_sync_team_member_roles(team, user, roles)

	return {"email": email, "roles": roles, "status": "Updated"}


def _require_team_member_manager(team):
	if team.user != frappe.session.user and not team.is_admin_user():
		frappe.throw("Only a team owner or admin can update member access.", frappe.PermissionError)


def _get_team_member_user(team, email):
	user = frappe.db.get_value("User", {"email": email}, "name")
	if user and frappe.db.exists("Team Member", {"parent": team.name, "user": user}):
		return user
	frappe.throw("This user is not a member of the selected team.", frappe.PermissionError)


def _validate_team_roles(team, roles):
	if roles is None:
		return []
	if not isinstance(roles, list) or not all(isinstance(role, str) for role in roles):
		frappe.throw("Choose valid roles for this team.")
	roles = list(dict.fromkeys(roles))
	valid_roles = {role["name"] for role in get_roles(team.name)}
	if not set(roles).issubset(valid_roles):
		frappe.throw("Choose roles that belong to this team.", frappe.PermissionError)
	return roles


def _sync_team_member_roles(team, user, roles):
	role_data = {role["name"]: role for role in get_roles(team.name)}
	PressRole = frappe.qb.DocType("Press Role")
	PressRoleUser = frappe.qb.DocType("Press Role User")
	assigned = frappe.qb.from_(PressRoleUser).join(PressRole).on(PressRoleUser.parent == PressRole.name).where(
		(PressRole.team == team.name) & (PressRoleUser.user == user)
	).select(PressRole.name).run(as_dict=True, pluck="name")
	if user == team.user or any(role_data[name].get("admin_access") for name in assigned):
		frappe.throw("A team owner or admin role cannot be changed here.", frappe.PermissionError)
	for role_name in assigned:
		if role_name not in roles:
			frappe.get_doc("Press Role", role_name).remove_user(user)
	for role_name in roles:
		if role_name not in assigned:
			frappe.get_doc("Press Role", role_name).add_user(user)
