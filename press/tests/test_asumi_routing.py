from unittest.mock import patch
from unittest import TestCase

from press.routing import resolve_path


class TestAsumiRouting(TestCase):
	def test_asumi_root_uses_public_shell(self):
		with patch("press.routing.get_request_host", return_value="asumi.ir"):
			self.assertEqual(resolve_path(""), "asumi")

	def test_asumi_account_path_uses_frappe_resolver(self):
		with patch("press.routing.get_request_host", return_value="asumi.ir"):
			with patch("press.routing.default_resolve_path", return_value="dashboard") as fallback:
				self.assertEqual(resolve_path("hesab"), "dashboard")
				fallback.assert_called_once_with("hesab")

	def test_dashboard_pages_use_the_press_authorization_router(self):
		for path in ("dashboard", "dashboard/orders", "dashboard/docker-control"):
			with self.subTest(path=path):
				with patch("press.routing.get_request_host", return_value="asumi.ir"):
					with patch("press.routing.default_resolve_path", return_value="dashboard") as fallback:
						self.assertEqual(resolve_path(path), "dashboard")
						fallback.assert_called_once_with(path)

	def test_frappe_website_script_uses_the_default_asset_resolver(self):
		with patch("press.routing.get_request_host", return_value="asumi.ir"):
			with patch("press.routing.default_resolve_path", return_value="website_script") as fallback:
				self.assertEqual(resolve_path("website_script.js"), "website_script")
				fallback.assert_called_once_with("website_script.js")

	def test_non_asumi_host_uses_frappe_resolver(self):
		with patch("press.routing.get_request_host", return_value="dehati.ir"):
			with patch("press.routing.default_resolve_path", return_value="index") as fallback:
				self.assertEqual(resolve_path(""), "index")
				fallback.assert_called_once_with("")
