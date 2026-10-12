from pathlib import Path
from decimal import Decimal
import unittest
from unittest.mock import Mock, call, patch

from press.www.saas.catalog import (
	build_marketplace_catalog,
	format_plan_prices,
	get_catalog_page_context,
	get_public_marketplace_catalog,
)


class MarketplaceCatalogTest(unittest.TestCase):
	def test_saas_catalog_redirects_to_the_homepage_app_section(self):
		from press.www.saas.index import get_context

		redirect_exception = type("RedirectForTest", (Exception,), {})
		with patch("press.www.saas.index.frappe") as frappe_mock:
			frappe_mock.Redirect = redirect_exception
			frappe_mock.utils.get_url.return_value = "https://asumi.ir/#apps"
			with self.assertRaises(redirect_exception):
				get_context({})

		self.assertEqual(frappe_mock.flags.redirect_location, "https://asumi.ir/#apps")

	@patch("press.www.saas.index.user_utils.is_system_manager", return_value=False)
	@patch("press.www.saas.index.skip_roles", return_value=False, create=True)
	@patch("press.www.saas.index.roles_enabled", return_value=False, create=True)
	@patch("press.www.saas.index.is_user_part_of_team", return_value=True, create=True)
	@patch("press.www.saas.index.frappe")
	def test_team_member_can_manage_prices_when_team_roles_are_disabled(
		self,
		frappe_mock,
		team_membership_mock,
		roles_enabled_mock,
		skip_roles_mock,
		_is_system_manager,
	):
		frappe_mock.has_permission.return_value = False
		frappe_mock.session.user = "member@example.com"
		frappe_mock.local.request.cookies.get.return_value = "team-a"
		frappe_mock.db.exists.return_value = True
		frappe_mock.db.get_value.return_value = "owner@example.com"
		team = Mock()
		team.name = "team-a"
		team.is_team_owner.return_value = False
		team.is_admin_user.return_value = False
		frappe_mock.get_doc.return_value = team

		from press.www.saas.index import _can_manage_marketplace_prices

		can_manage_prices = _can_manage_marketplace_prices()

		self.assertTrue(can_manage_prices)
		roles_enabled_mock.assert_called_once_with("team-a")
		skip_roles_mock.assert_called_once_with("team-a")
		team_membership_mock.assert_has_calls(
			[
				call("member@example.com", "team-a"),
				call("member@example.com", "team-a"),
			]
		)

	@patch("press.www.saas.index.user_utils.is_system_manager", return_value=False)
	@patch("press.www.saas.index.is_user_part_of_team", return_value=True, create=True)
	@patch("press.www.saas.index.frappe")
	def test_request_team_header_takes_precedence_over_selected_team_cookie(
		self, frappe_mock, team_membership_mock, _is_system_manager
	):
		frappe_mock.has_permission.return_value = False
		frappe_mock.session.user = "admin@example.com"
		frappe_mock.get_request_header.return_value = "header-team"
		frappe_mock.local.request.cookies.get.return_value = "cookie-team"
		frappe_mock.db.exists.return_value = True
		team = Mock()
		team.is_team_owner.return_value = False
		team.is_admin_user.return_value = True
		frappe_mock.get_doc.return_value = team

		from press.www.saas.index import _can_manage_marketplace_prices

		can_manage_prices = _can_manage_marketplace_prices()

		self.assertTrue(can_manage_prices)
		frappe_mock.get_doc.assert_called_with("Team", "header-team")
		team_membership_mock.assert_called_with("admin@example.com", "header-team")

	@patch("press.www.saas.index.is_user_part_of_team", return_value=True, create=True)
	@patch("press.www.saas.index.get_current_team", return_value="default-team", create=True)
	@patch("press.www.saas.index.user_utils.is_system_manager", return_value=False)
	@patch("press.www.saas.index.frappe")
	def test_selected_dashboard_team_scopes_price_management_link(
		self, frappe_mock, _is_system_manager, current_team_mock, team_membership_mock
	):
		frappe_mock.has_permission.return_value = False
		frappe_mock.session.user = "admin@example.com"
		frappe_mock.local.request.cookies.get.return_value = "selected-team"
		frappe_mock.db.exists.return_value = True
		team = Mock()
		team.is_team_owner.return_value = False
		team.is_admin_user.return_value = True
		frappe_mock.get_doc.return_value = team

		from press.www.saas.index import _can_manage_marketplace_prices

		can_manage_prices = _can_manage_marketplace_prices()

		self.assertTrue(can_manage_prices)
		frappe_mock.get_doc.assert_called_with("Team", "selected-team")
		team_membership_mock.assert_called_with("admin@example.com", "selected-team")
		current_team_mock.assert_not_called()

	@patch("press.www.saas.index.get_current_team", return_value="app-team", create=True)
	@patch("press.www.saas.index.user_utils.is_system_manager", return_value=False)
	@patch("press.www.saas.index.frappe")
	def test_app_team_owner_can_see_price_management_link(
		self, frappe_mock, _is_system_manager, current_team_mock
	):
		frappe_mock.has_permission.return_value = False
		frappe_mock.get_all.side_effect = lambda doctype, **kwargs: (
			["app-team"]
			if doctype == "Marketplace App" and kwargs.get("fields") == ["team"]
			else []
		)
		team = Mock()
		team.is_team_owner.return_value = True
		team.is_admin_user.return_value = False
		frappe_mock.get_doc.return_value = team

		from press.www.saas.index import _can_manage_marketplace_prices

		can_manage_prices = _can_manage_marketplace_prices()

		self.assertTrue(can_manage_prices)

	@patch("press.www.saas.index.get_current_team", return_value="app-team", create=True)
	@patch("press.www.saas.index.user_utils.is_system_manager", return_value=False)
	@patch("press.www.saas.index.frappe")
	def test_app_team_admin_can_see_price_management_link(
		self, frappe_mock, _is_system_manager, current_team_mock
	):
		frappe_mock.has_permission.return_value = False
		frappe_mock.get_all.side_effect = lambda doctype, **kwargs: (
			["app-team"]
			if doctype == "Marketplace App" and kwargs.get("fields") == ["team"]
			else []
		)
		team = Mock()
		team.is_team_owner.return_value = False
		team.is_admin_user.return_value = True
		frappe_mock.get_doc.return_value = team

		from press.www.saas.index import _can_manage_marketplace_prices

		can_manage_prices = _can_manage_marketplace_prices()

		self.assertTrue(can_manage_prices)

	@patch("press.www.saas.index.get_current_team", create=True)
	@patch("press.www.saas.index.user_utils.is_system_manager", return_value=False)
	@patch("press.www.saas.index.is_user_part_of_team", return_value=False, create=True)
	@patch("press.www.saas.index.frappe")
	def test_price_link_is_hidden_for_admins_on_another_active_team(
		self, frappe_mock, _team_membership, _is_system_manager, current_team_mock
	):
		frappe_mock.has_permission.return_value = False
		frappe_mock.get_all.side_effect = lambda doctype, **kwargs: (
			["publisher-team"]
			if doctype == "Marketplace App" and kwargs.get("fields") == ["team"]
			else []
		)
		current_team_mock.return_value = "active-team"
		publisher_team = Mock()
		publisher_team.is_team_owner.return_value = False
		publisher_team.is_admin_user.return_value = True
		active_team = Mock()
		active_team.is_team_owner.return_value = False
		active_team.is_admin_user.return_value = False
		frappe_mock.get_doc.side_effect = lambda doctype, name: {
			"publisher-team": publisher_team,
			"active-team": active_team,
		}[name]

		from press.www.saas.index import _can_manage_marketplace_prices

		can_manage_prices = _can_manage_marketplace_prices()

		self.assertFalse(can_manage_prices)

	def test_fractional_prices_preserve_decimal_precision(self):
		price = Decimal("0.123456789123456789")

		formatted = format_plan_prices(
			{
				"interval": "Monthly",
				"price_inr": price,
				"price_usd": Decimal("2.000000000000000001"),
			}
		)

		self.assertEqual(formatted["price_inr"], price)
		self.assertEqual(formatted["price_usd"], Decimal("2.000000000000000001"))
		self.assertEqual(formatted["price_irr"], 0)

	def test_iranian_rial_price_is_displayed_and_prevents_free_label(self):
		formatted = format_plan_prices(
			{
				"interval": "Monthly",
				"price_inr": 0,
				"price_usd": 0,
				"price_irr": 2500000,
			}
		)

		self.assertEqual(formatted["price_irr"], 2500000)
		self.assertFalse(formatted["is_free"])
		self.assertEqual(
			formatted["prices"][-1],
			{"currency": "IRR", "symbol": "ریال", "amount": 2500000},
		)

	def test_page_context_has_real_apps_and_does_not_invent_hosting_offers(self):
		def get_all(doctype, **kwargs):
			if doctype == "Marketplace App":
				return [
					{
						"name": "app-a",
						"status": "Published",
						"title": "A",
						"route": "marketplace/apps/app-a",
					}
				]
			return [
				{
					"name": "plan-a",
					"app": "app-a",
					"title": "Free",
					"interval": "Monthly",
					"enabled": 1,
					"price_inr": 0,
					"price_usd": 0,
				}
			]

		context = get_catalog_page_context(get_all, can_manage_prices=True)

		self.assertEqual(len(context["marketplace_apps"]), 1)
		self.assertFalse(context["hosting_available"])
		self.assertTrue(context["can_manage_prices"])
		self.assertEqual(context["body_class"], "asumi-commerce-page")
		self.assertNotIn("resource_hint", context)

	def test_catalog_loads_only_published_apps_and_their_enabled_plans(self):
		queries = []
		rows = {
			"Marketplace App": [
				{
					"name": "app-a",
					"status": "Published",
					"title": "A",
					"route": "marketplace/apps/app-a",
					"description": "A public app",
				}
			],
			"Marketplace App Plan": [
				{
					"name": "plan-a",
					"app": "app-a",
					"title": "Monthly",
					"interval": "Monthly",
					"enabled": 1,
					"price_inr": 0,
					"price_usd": 0,
				}
			],
		}

		def get_all(doctype, **kwargs):
			queries.append((doctype, kwargs))
			return rows[doctype]

		catalog = get_public_marketplace_catalog(get_all)

		self.assertEqual([app["id"] for app in catalog], ["app-a"])
		self.assertEqual(queries[0][0], "Marketplace App")
		self.assertEqual(queries[0][1]["filters"], {"status": "Published"})
		self.assertEqual(queries[1][0], "Marketplace App Plan")
		self.assertEqual(
			queries[1][1]["filters"],
			{"enabled": 1, "app": ["in", ["app-a"]]},
		)
		self.assertIn("price_irr", queries[1][1]["fields"])

	def test_only_published_apps_with_enabled_plans_are_listed(self):
		apps = [
			{
				"name": "app-ready",
				"status": "Published",
				"title": "Ready",
				"route": "marketplace/apps/app-ready",
			},
			{
				"name": "app-draft",
				"status": "Draft",
				"title": "Draft",
				"route": "marketplace/apps/app-draft",
			},
			{
				"name": "app-unpriced",
				"status": "Published",
				"title": "Unpriced",
				"route": "marketplace/apps/app-unpriced",
			},
		]
		plans = [
			{
				"name": "enabled-free",
				"app": "app-ready",
				"title": "Free",
				"interval": "Monthly",
				"enabled": 1,
				"price_inr": 0,
				"price_usd": 0,
			},
			{
				"name": "disabled-paid",
				"app": "app-ready",
				"title": "Disabled",
				"interval": "Monthly",
				"enabled": 0,
				"price_inr": 500,
				"price_usd": 5,
			},
		]

		catalog = build_marketplace_catalog(apps, plans)

		self.assertEqual([app["id"] for app in catalog], ["app-ready"])
		self.assertEqual([plan["id"] for plan in catalog[0]["plans"]], ["enabled-free"])

	def test_zero_prices_are_free_without_replacing_the_stored_amounts(self):
		catalog = build_marketplace_catalog(
			[
				{
					"name": "app-free",
					"status": "Published",
					"title": "Free app",
					"route": "marketplace/apps/app-free",
				}
			],
			[
				{
					"name": "free-plan",
					"app": "app-free",
					"title": "Free",
					"interval": "Monthly",
					"enabled": 1,
					"price_inr": 0,
					"price_usd": 0,
				}
			],
		)

		self.assertTrue(catalog[0]["plans"][0]["is_free"])
		self.assertEqual(catalog[0]["plans"][0]["price_inr"], 0)
		self.assertEqual(catalog[0]["plans"][0]["price_usd"], 0)

	def test_paid_plans_preserve_each_stored_currency(self):
		catalog = build_marketplace_catalog(
			[
				{
					"name": "app-paid",
					"status": "Published",
					"title": "Paid app",
					"route": "marketplace/apps/app-paid",
				}
			],
			[
				{
					"name": "paid-plan",
					"app": "app-paid",
					"title": "Monthly",
					"interval": "Monthly",
					"enabled": 1,
					"price_inr": 1250,
					"price_usd": 12.5,
				}
			],
		)

		plan = catalog[0]["plans"][0]
		self.assertFalse(plan["is_free"])
		self.assertEqual(plan["price_inr"], 1250)
		self.assertEqual(plan["price_usd"], 12.5)
		self.assertEqual(plan["interval"], "Monthly")
		self.assertEqual(plan["interval_label"], "ماهانه")
		self.assertEqual(
			[(price["currency"], price["amount"]) for price in plan["prices"]],
			[("INR", 1250), ("USD", 12.5), ("IRR", 0)],
		)

	def test_plans_with_unknown_period_or_missing_prices_are_not_listed(self):
		app = {
			"name": "app-checkout",
			"status": "Published",
			"title": "Checkout",
			"route": "marketplace/apps/app-checkout",
		}
		plans = [
			{
				"name": "unknown-period",
				"app": "app-checkout",
				"title": "Unknown",
				"interval": "Weekly",
				"enabled": 1,
				"price_inr": 0,
				"price_usd": 0,
			},
			{
				"name": "missing-price",
				"app": "app-checkout",
				"title": "Incomplete",
				"interval": "Monthly",
				"enabled": 1,
				"price_inr": None,
				"price_usd": 0,
			},
		]

		self.assertEqual(build_marketplace_catalog([app], plans), [])

	def test_display_prices_keep_currency_and_interval_labels(self):
		formatted = format_plan_prices(
			{"interval": "Yearly", "price_inr": 2400, "price_usd": 24}
		)

		self.assertEqual(formatted["interval_label"], "سالانه")
		self.assertEqual(formatted["price_inr"], 2400)
		self.assertEqual(formatted["price_usd"], 24)
		self.assertEqual([price["symbol"] for price in formatted["prices"]], ["₹", "$", "ریال"])

class LegacyPricingTemplateTest(unittest.TestCase):
	def test_template_contains_no_fixed_infrastructure_rates_or_dynamic_html(self):
		template = Path(__file__).with_name("index.html").read_text()

		for stale_value in ("390000", "160000", "4200", "DEN Cloud", "DEN SaaS"):
			with self.subTest(value=stale_value):
				self.assertNotIn(stale_value, template)
		self.assertNotIn("innerHTML", template)
		self.assertIn("{{ app.title | e }}", template)
		self.assertIn("{{ app.description | e }}", template)


if __name__ == "__main__":
	unittest.main()
