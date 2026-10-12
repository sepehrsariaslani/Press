def can_manage_marketplace_app_plans(
	*,
	has_global_permission,
	is_team_owner,
	is_team_admin,
	is_team_member=False,
	team_roles_enabled=True,
	skip_role_checks=False,
	is_system_manager=False,
):
	"""Return whether the current user may change Marketplace App Plans."""
	return bool(
		has_global_permission
		or is_team_owner
		or is_team_admin
		or is_system_manager
		or (is_team_member and (not team_roles_enabled or skip_role_checks))
	)
