import unittest
from unittest.mock import patch

import press.hooks


class TestBuildHooks(unittest.TestCase):
	def test_login_redirect_does_not_query_database_without_a_site(self):
		with patch.object(press.hooks, "_get_frappe_io_auth_url") as get_auth_url:
			self.assertIsNone(press.hooks._get_frappe_io_auth_url_for_hooks())
			get_auth_url.assert_not_called()
