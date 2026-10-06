from types import SimpleNamespace
from unittest.mock import patch
from unittest import TestCase

from press.routing import resolve_path


class TestAsumiRouting(TestCase):
	def test_asumi_root_uses_public_shell(self):
		with patch("press.routing.get_request_host", return_value="asumi.ir"):
			self.assertEqual(resolve_path(""), "asumi")

	def test_local_asumi_alias_uses_public_shell(self):
		with patch("press.routing.get_request_host", return_value="asumi"):
			self.assertEqual(resolve_path(""), "asumi")

	def test_asumi_dashboard_path_uses_customer_shell(self):
		with patch("press.routing.get_request_host", return_value="asumi.ir"):
			with patch("press.routing.default_resolve_path", return_value="dashboard") as fallback:
				self.assertEqual(resolve_path("dashboard"), "asumi")
				fallback.assert_not_called()

	def test_builder_editor_and_assets_use_frappe_routes(self):
		paths = (
			"builder",
			"builder/page/new",
			"builder/page/example-page",
			"builder_assets/tokens.css",
		)
		with patch("press.routing.get_request_host", return_value="asumi.ir"):
			for path in paths:
				with self.subTest(path=path):
					with patch("press.routing.default_resolve_path", return_value=path) as fallback:
						self.assertEqual(resolve_path(path), path)
						fallback.assert_called_once_with(path)

	def test_configured_builder_path_uses_frappe_routes(self):
		with patch("press.routing.get_request_host", return_value="asumi.ir"):
			with patch("press.routing.frappe.conf", SimpleNamespace(builder_path="site-builder")):
				with patch("press.routing.default_resolve_path", return_value="_builder") as fallback:
					self.assertEqual(resolve_path("site-builder/page/new"), "_builder")
					fallback.assert_called_once_with("site-builder/page/new")

	def test_hesabyar_stays_on_asumi_shell(self):
		with patch("press.routing.get_request_host", return_value="asumi.ir"):
			with patch("press.routing.default_resolve_path") as fallback:
				self.assertEqual(resolve_path("hesabyar"), "asumi")
				fallback.assert_not_called()

	def test_non_asumi_host_uses_frappe_resolver(self):
		with patch("press.routing.get_request_host", return_value="dehati.ir"):
			with patch("press.routing.default_resolve_path", return_value="index") as fallback:
				self.assertEqual(resolve_path(""), "index")
				fallback.assert_called_once_with("")
