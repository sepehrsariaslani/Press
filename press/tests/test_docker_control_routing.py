import unittest
from types import SimpleNamespace
from unittest.mock import patch

from press.docker_control.routing import resolve_path
from press.docker_control.permissions import assert_docker_control_admin
from press.docker_control.routing_policy import should_route_dashboard


class TestDockerControlRouting(unittest.TestCase):
	def test_dashboard_shell_is_available_to_guests_for_login_redirect(self):
		for route in (
			"/dashboard/sites",
			"/dashboard/servers",
			"/dashboard/settings",
			"/dashboard/docker-control",
		):
			with self.subTest(route=route):
				self.assertTrue(should_route_dashboard(route, host="asumi.ir"))

	def test_dashboard_shell_is_available_to_authenticated_users(self):
		self.assertTrue(should_route_dashboard("/dashboard/sites", host="asumi.ir"))

	def test_dashboard_is_not_rewritten_on_other_hosts(self):
		self.assertFalse(should_route_dashboard("/dashboard/sites", host="dehati.ir"))

	def test_other_asumi_pages_are_not_dashboard_routes(self):
		self.assertFalse(
			should_route_dashboard(
				"/hesab/restaurant/centers/operations",
				host="asumi.ir",
			)
		)

	def test_guest_private_dashboard_path_uses_press_shell(self):
		with (
			patch("press.docker_control.routing.get_request_host", return_value="asumi.ir"),
			patch("press.docker_control.routing.default_resolve_path", return_value="dashboard") as fallback,
			patch("press.docker_control.routing.asumi_resolve_path", return_value="asumi"),
		):
			self.assertEqual(resolve_path("dashboard/sites"), "dashboard")
			fallback.assert_called_once_with("dashboard/sites")

	def test_asumi_saas_page_uses_press_route(self):
		with (
			patch("press.docker_control.routing.get_request_host", return_value="asumi.ir"),
			patch("press.docker_control.routing.default_resolve_path", return_value="saas") as fallback,
			patch("press.docker_control.routing.asumi_resolve_path", return_value="asumi"),
		):
			self.assertEqual(resolve_path("saas"), "saas")
			fallback.assert_called_once_with("saas")

	def test_asumi_pricing_alias_uses_saas_page(self):
		with (
			patch("press.docker_control.routing.get_request_host", return_value="asumi.ir"),
			patch("press.docker_control.routing.default_resolve_path", return_value="saas") as fallback,
			patch("press.docker_control.routing.asumi_resolve_path", return_value="asumi"),
		):
			self.assertEqual(resolve_path("pricing"), "saas")
			fallback.assert_called_once_with("saas")

	def test_dashboard_api_still_rejects_guest(self):
		def throw(message, exception):
			raise exception(message)

		frappe_stub = SimpleNamespace(
			session=SimpleNamespace(user="Guest"),
			conf=SimpleNamespace(get=lambda key: ["Administrator"]),
			get_roles=lambda user: [],
			PermissionError=PermissionError,
			throw=throw,
		)
		with patch("press.docker_control.permissions.frappe", frappe_stub):
			with self.assertRaises(PermissionError):
				assert_docker_control_admin()

	def test_dashboard_api_allows_system_manager(self):
		frappe_stub = SimpleNamespace(
			session=SimpleNamespace(user="manager@example.com"),
			conf=SimpleNamespace(get=lambda key: ["Administrator"]),
			get_roles=lambda user: ["System Manager"],
		)
		with patch("press.docker_control.permissions.frappe", frappe_stub):
			assert_docker_control_admin()


if __name__ == "__main__":
	unittest.main()
