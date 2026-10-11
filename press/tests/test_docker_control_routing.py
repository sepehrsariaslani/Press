import unittest

from press.docker_control.routing_policy import should_route_dashboard


class TestDockerControlRouting(unittest.TestCase):
	def test_system_manager_can_open_docker_control_on_asumi(self):
		self.assertTrue(
			should_route_dashboard(
				"/dashboard/docker-control",
				host="asumi.ir",
				is_guest=False,
				can_manage_docker=True,
			)
		)

	def test_other_asumi_users_cannot_open_docker_control(self):
		self.assertFalse(
			should_route_dashboard(
				"/dashboard/docker-control",
				host="asumi.ir",
				is_guest=False,
				can_manage_docker=False,
			)
		)

	def test_guest_can_reach_press_login_without_opening_dashboard_pages(self):
		self.assertTrue(
			should_route_dashboard(
				"/dashboard/login",
				host="asumi.ir",
				is_guest=True,
				can_manage_docker=False,
			)
		)
		self.assertFalse(
			should_route_dashboard(
				"/dashboard/sites",
				host="asumi.ir",
				is_guest=True,
				can_manage_docker=False,
			)
		)

	def test_other_asumi_pages_stay_on_the_asumi_site(self):
		self.assertFalse(
			should_route_dashboard(
				"/hesab/restaurant/centers/operations",
				host="asumi.ir",
				is_guest=False,
				can_manage_docker=True,
			)
		)


if __name__ == "__main__":
	unittest.main()
