import unittest

from press.docker_control.permissions import (
	has_docker_control_action_access,
	has_docker_control_route_access,
	has_site_admin_mapping_access,
)


class TestSiteTeamAdminAccess(unittest.TestCase):
	def test_site_admin_mapping_is_limited_to_the_exact_enabled_customer_site(self):
		self.assertTrue(
			has_site_admin_mapping_access(
				user="manager@example.com",
				domain="dehati.ir",
				mapped_domains={"dehati.ir"},
				site_enabled=True,
			)
		)
		self.assertFalse(
			has_site_admin_mapping_access(
				user="manager@example.com",
				domain="denroom.ir",
				mapped_domains={"dehati.ir"},
				site_enabled=True,
			)
		)
		self.assertFalse(
			has_site_admin_mapping_access(
				user="Guest",
				domain="dehati.ir",
				mapped_domains={"dehati.ir"},
				site_enabled=True,
			)
		)
		self.assertFalse(
			has_site_admin_mapping_access(
				user="manager@example.com",
				domain="dehati.ir",
				mapped_domains={"dehati.ir"},
				site_enabled=False,
			)
		)

	def test_dashboard_route_requires_global_or_site_access(self):
		self.assertTrue(has_docker_control_route_access(global_admin=True, mapped_site_access=False))
		self.assertTrue(has_docker_control_route_access(global_admin=False, mapped_site_access=True))
		self.assertFalse(has_docker_control_route_access(global_admin=False, mapped_site_access=False))

	def test_team_owner_without_source_admin_mapping_does_not_get_site_access(self):
		self.assertFalse(
			has_site_admin_mapping_access(
				user="team-owner@example.com",
				domain="dehati.ir",
				mapped_domains=set(),
				site_enabled=True,
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
		self.assertFalse(
			has_docker_control_action_access(
				action="install_marketplace_app", target="dehati.ir", global_admin=False, site_admin=True
			)
		)
		self.assertTrue(
			has_docker_control_action_access(
				action="install_marketplace_app", target="dehati.ir", global_admin=True, site_admin=False
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
