def can_manage_marketplace_app_plans(*, has_global_permission, is_team_owner, is_team_admin):
	"""Return whether the current user may change Marketplace App Plans."""
	return bool(has_global_permission or is_team_owner or is_team_admin)
