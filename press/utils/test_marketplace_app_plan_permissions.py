import unittest

from press.utils.marketplace_app_plan_permissions import can_manage_marketplace_app_plans


class MarketplaceAppPlanPermissionsTest(unittest.TestCase):
	def test_system_permission_can_manage_plans(self):
		self.assertTrue(
			can_manage_marketplace_app_plans(
				has_global_permission=True,
				is_team_owner=False,
				is_team_admin=False,
			)
		)

	def test_system_manager_can_manage_marketplace_plans(self):
		self.assertTrue(
			can_manage_marketplace_app_plans(
				has_global_permission=False,
				is_team_owner=False,
				is_team_admin=False,
				is_system_manager=True,
			)
		)

	def test_team_owner_or_admin_can_manage_their_plans(self):
		for permission in ("is_team_owner", "is_team_admin"):
			with self.subTest(permission=permission):
				self.assertTrue(
					can_manage_marketplace_app_plans(
						has_global_permission=False,
						is_team_owner=permission == "is_team_owner",
						is_team_admin=permission == "is_team_admin",
					)
				)

	def test_other_users_cannot_manage_app_plan_prices(self):
		self.assertFalse(
			can_manage_marketplace_app_plans(
				has_global_permission=False,
				is_team_owner=False,
				is_team_admin=False,
			)
		)

	def test_team_member_can_manage_plans_when_team_roles_are_disabled(self):
		self.assertTrue(
			can_manage_marketplace_app_plans(
				has_global_permission=False,
				is_team_owner=False,
				is_team_admin=False,
				is_team_member=True,
				team_roles_enabled=False,
			)
		)

	def test_relaxed_team_member_can_manage_plans_without_an_assigned_role(self):
		self.assertTrue(
			can_manage_marketplace_app_plans(
				has_global_permission=False,
				is_team_owner=False,
				is_team_admin=False,
				is_team_member=True,
				team_roles_enabled=True,
				skip_role_checks=True,
			)
		)

	def test_role_exceptions_do_not_grant_access_to_non_members(self):
		self.assertFalse(
			can_manage_marketplace_app_plans(
				has_global_permission=False,
				is_team_owner=False,
				is_team_admin=False,
				is_team_member=False,
				team_roles_enabled=False,
				skip_role_checks=True,
			)
		)


if __name__ == "__main__":
	unittest.main()
