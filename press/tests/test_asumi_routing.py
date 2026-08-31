from unittest.mock import patch
from unittest import TestCase

from press.routing import resolve_path


class TestAsumiRouting(TestCase):
	def test_asumi_root_uses_public_shell(self):
		with patch("press.routing.get_request_host", return_value="asumi.ir"):
			self.assertEqual(resolve_path(""), "asumi")

	def test_asumi_reserved_path_uses_frappe_resolver(self):
		with patch("press.routing.get_request_host", return_value="asumi.ir"):
			with patch("press.routing.default_resolve_path", return_value="dashboard") as fallback:
				self.assertEqual(resolve_path("dashboard"), "dashboard")
				fallback.assert_called_once_with("dashboard")

	def test_non_asumi_host_uses_frappe_resolver(self):
		with patch("press.routing.get_request_host", return_value="dehati.ir"):
			with patch("press.routing.default_resolve_path", return_value="index") as fallback:
				self.assertEqual(resolve_path(""), "index")
				fallback.assert_called_once_with("")
