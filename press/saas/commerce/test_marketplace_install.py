import unittest

from press.saas.commerce import marketplace_install
from press.saas.commerce.marketplace_install import marketplace_install_state


class MarketplaceInstallStateTest(unittest.TestCase):
	def test_decides_whether_an_order_may_install_a_missing_app(self):
		self.assertTrue(callable(getattr(marketplace_install, "should_install_marketplace_app", None)))
		self.assertTrue(marketplace_install.should_install_marketplace_app("accounts", True, [], ["accounts"]))
		self.assertFalse(
			marketplace_install.should_install_marketplace_app("accounts", True, ["accounts"], ["accounts"])
		)

	def test_rejects_install_if_not_requested_or_no_longer_available(self):
		decide = getattr(marketplace_install, "should_install_marketplace_app", None)
		self.assertTrue(callable(decide))
		with self.assertRaises(ValueError):
			decide("accounts", False, [], ["accounts"])
		with self.assertRaises(ValueError):
			decide("accounts", True, [], ["restaurant"])

	def test_marks_an_installed_app_as_not_requiring_installation(self):
		self.assertEqual(
			marketplace_install_state("accounts", ["accounts"], ["accounts", "restaurant"]),
			{"installed": True, "installation_required": False},
		)

	def test_rejects_the_base_framework_even_when_it_is_installed(self):
		with self.assertRaisesRegex(ValueError, "قابل خرید"):
			marketplace_install_state("frappe", ["frappe"], ["accounts", "restaurant"])
		with self.assertRaisesRegex(ValueError, "قابل خرید"):
			marketplace_install.should_install_marketplace_app(
				"frappe", False, ["frappe"], ["accounts", "restaurant"]
			)

	def test_rejects_raven_and_sales_even_when_their_code_is_on_the_bench(self):
		for app in ("raven", "sales"):
			with self.subTest(app=app), self.assertRaisesRegex(ValueError, "قابل خرید"):
				marketplace_install_state(app, [], [app])
			with self.subTest(app=app), self.assertRaisesRegex(ValueError, "قابل خرید"):
				marketplace_install.should_install_marketplace_app(app, True, [], [app])

	def test_allows_install_when_app_code_is_available_on_the_selected_bench(self):
		self.assertEqual(
			marketplace_install_state("restaurant", [], ["accounts", "restaurant"]),
			{"installed": False, "installation_required": True},
		)

	def test_rejects_app_missing_from_selected_bench(self):
		with self.assertRaisesRegex(ValueError, "بنچ"):
			marketplace_install_state("unknown_app", ["accounts"], ["accounts", "restaurant"])

	def test_rejects_an_empty_app_name(self):
		with self.assertRaises(ValueError):
			marketplace_install_state("", [], ["accounts"])

	def test_rejects_app_names_that_are_not_bench_module_slugs(self):
		for app in ("../accounts", "Accounts", "bad-app"):
			with self.subTest(app=app), self.assertRaises(ValueError):
				marketplace_install_state(app, [], [app])


if __name__ == "__main__":
	unittest.main()
