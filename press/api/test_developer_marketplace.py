import unittest
from types import SimpleNamespace

from press.api.developer.marketplace import DeveloperApiHandler


class DeveloperMarketplaceSubscriptionTest(unittest.TestCase):
	def make_handler(self, *, enabled=True):
		subscription = SimpleNamespace(
			enabled=enabled,
			document_name="accounts",
			plan="accounts_monthly",
			site=None,
			docker_site="veederakht.ir",
			secret_key="private-key-must-not-return",
			as_dict=lambda: {
				"enabled": int(enabled),
				"document_name": "accounts",
				"plan": "accounts_monthly",
				"site": None,
				"docker_site": "veederakht.ir",
				"secret_key": "private-key-must-not-return",
				"team": "team-1",
			},
		)
		handler = object.__new__(DeveloperApiHandler)
		handler.app_subscription_doc = subscription
		return handler

	def test_subscription_info_exposes_the_docker_site_but_never_the_secret(self):
		info = self.make_handler().get_subscription_info()
		self.assertEqual(info, {
			"enabled": 1,
			"document_name": "accounts",
			"plan": "accounts_monthly",
			"site": "veederakht.ir",
		})
		self.assertNotIn("private-key-must-not-return", str(info))

	def test_subscription_status_works_for_the_shared_subscription_doctype(self):
		self.assertEqual(self.make_handler(enabled=True).get_subscription_status(), "Active")
		self.assertEqual(self.make_handler(enabled=False).get_subscription_status(), "Disabled")


if __name__ == "__main__":
	unittest.main()
