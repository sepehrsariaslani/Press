import unittest

from press.docker_control.permissions import (
	has_docker_control_action_access,
	has_site_team_admin_access,
)


class TestSiteTeamAdminAccess(unittest.TestCase):
	def test_site_owner_can_manage_only_their_mapped_site(self):
		self.assertTrue(
			has_site_team_admin_access(
				user="owner@example.com",
				site_team="team-1",
				team_owner="owner@example.com",
				is_team_member=True,
				team_admin=False,
			)
		)
		self.assertFalse(
			has_site_team_admin_access(
				user="owner@example.com",
				site_team="team-2",
				team_owner="another-owner@example.com",
				is_team_member=True,
				team_admin=False,
			)
		)

	def test_team_admin_needs_membership_and_a_site_mapping(self):
		base = {
			"user": "admin@example.com",
			"site_team": "team-1",
			"team_owner": "owner@example.com",
			"team_admin": True,
		}
		self.assertTrue(has_site_team_admin_access(**base, is_team_member=True))
		self.assertFalse(has_site_team_admin_access(**base, is_team_member=False))
		self.assertFalse(has_site_team_admin_access(**(base | {"site_team": None}), is_team_member=True))

	def test_members_without_team_admin_access_are_rejected(self):
		self.assertFalse(
			has_site_team_admin_access(
				user="member@example.com",
				site_team="team-1",
				team_owner="owner@example.com",
				is_team_member=True,
				team_admin=False,
			)
		)

	def test_guest_never_receives_team_site_access(self):
		self.assertFalse(
			has_site_team_admin_access(
				user="Guest",
				site_team="team-1",
				team_owner="Guest",
				is_team_member=True,
				team_admin=True,
			)
		)

	def test_team_admin_can_run_only_site_scoped_operations(self):
		self.assertTrue(
			has_docker_control_action_access(
				action="backup_site", target="dehati.ir", global_admin=False, site_admin=True
			)
		)
		for action, target in (("restart_stack", None), ("restart_service", "backend"), ("deploy_app_revision", None)):
			with self.subTest(action=action):
				self.assertFalse(
					has_docker_control_action_access(
						action=action, target=target, global_admin=False, site_admin=True
					)
				)

	def test_global_admin_retains_host_wide_access(self):
		self.assertTrue(
			has_docker_control_action_access(
				action="restart_stack", target=None, global_admin=True, site_admin=False
			)
		)


if __name__ == "__main__":
	unittest.main()
