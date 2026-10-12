import unittest
from types import SimpleNamespace
from unittest.mock import patch

import frappe
from press.api.marketplace import _get_marketplace_app_for_plan_write


class MarketplaceAppPlanAccessTest(unittest.TestCase):
	@patch("press.api.marketplace.user_utils.is_system_manager", return_value=True)
	@patch("press.api.marketplace.frappe.has_permission", return_value=False)
	@patch("press.api.marketplace.frappe.get_doc")
	def test_system_manager_can_manage_an_app_plan(self, get_doc, _has_permission, _system_manager):
		app = SimpleNamespace(team="app-team")
		team = SimpleNamespace(is_team_owner=lambda: False, is_admin_user=lambda: False)
		get_doc.side_effect = [app, team]

		self.assertIs(_get_marketplace_app_for_plan_write("app-a"), app)

	@patch("press.api.marketplace.user_utils.is_system_manager", return_value=False, create=True)
	@patch("press.api.marketplace.skip_roles", return_value=False, create=True)
	@patch("press.api.marketplace.roles_enabled", return_value=False, create=True)
	@patch("press.api.marketplace.is_user_part_of_team", return_value=True, create=True)
	@patch("press.api.marketplace.get_current_team", return_value="app-team", create=True)
	@patch("press.api.marketplace.frappe.has_permission", return_value=False)
	@patch("press.api.marketplace.frappe.get_doc")
	def test_team_member_can_manage_plan_when_team_roles_are_disabled(
		self,
		get_doc,
		_has_permission,
		_current_team,
		_team_membership,
		_roles_enabled,
		_skip_roles,
		_is_system_manager,
	):
		app = SimpleNamespace(team="app-team")
		team = SimpleNamespace(
			name="app-team",
			is_team_owner=lambda: False,
			is_admin_user=lambda: False,
		)
		get_doc.side_effect = [app, team]

		self.assertIs(_get_marketplace_app_for_plan_write("app-a"), app)

	@patch("press.api.marketplace.frappe.has_permission", return_value=False)
	@patch("press.api.marketplace.get_current_team", return_value="other-team", create=True)
	@patch("press.api.marketplace.user_utils.is_system_manager", return_value=False, create=True)
	@patch("press.api.marketplace.frappe.get_doc")
	def test_unrelated_user_cannot_manage_an_app_plan(
		self, get_doc, _is_system_manager, _current_team, _has_permission
	):
		app = SimpleNamespace(team="app-team")
		team = SimpleNamespace(is_team_owner=lambda: False, is_admin_user=lambda: False)
		get_doc.side_effect = [app, team]

		with self.assertRaises(frappe.PermissionError):
			_get_marketplace_app_for_plan_write("app-a")

	@patch("press.api.marketplace.frappe.has_permission", return_value=False)
	@patch("press.api.marketplace.frappe.get_doc")
	def test_app_team_owner_can_manage_their_plan(self, get_doc, _has_permission):
		app = SimpleNamespace(team="app-team")
		team = SimpleNamespace(is_team_owner=lambda: True, is_admin_user=lambda: False)
		get_doc.side_effect = [app, team]

		self.assertIs(_get_marketplace_app_for_plan_write("app-a"), app)

	@patch("press.api.marketplace.frappe.has_permission", return_value=True)
	@patch("press.api.marketplace.frappe.get_doc")
	def test_global_permission_can_manage_any_app_plan(self, get_doc, _has_permission):
		app = SimpleNamespace(team="app-team")
		team = SimpleNamespace(is_team_owner=lambda: False, is_admin_user=lambda: False)
		get_doc.side_effect = [app, team]

		self.assertIs(_get_marketplace_app_for_plan_write("app-a"), app)


if __name__ == "__main__":
	unittest.main()
