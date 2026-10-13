import unittest
from types import SimpleNamespace
from unittest.mock import patch

import frappe
from press.saas.commerce import api


class MarketplacePurchaseTargetTest(unittest.TestCase):
	@patch("press.saas.commerce.api.get_current_team", return_value="veederakht-team")
	@patch("press.saas.commerce.api.frappe")
	def test_purchase_site_list_includes_only_team_linked_docker_sites(self, frappe_mock, _team):
		frappe_mock.session = SimpleNamespace(user="buyer@example.com")
		frappe_mock.get_all.side_effect = [
			[frappe._dict(name="press-site", subdomain="store", domain="asumi.ir")],
			[frappe._dict(domain="veederakht.ir")],
		]

		sites = api.my_purchase_sites()

		self.assertEqual(
			sites,
			[
				{
					"name": "press-site",
					"subdomain": "store",
					"domain": "asumi.ir",
					"site_type": "Site",
					"key": "Site:press-site",
					"label": "store.asumi.ir",
				},
				{
					"name": "veederakht.ir",
					"site_type": "Docker Control Site",
					"key": "Docker Control Site:veederakht.ir",
					"label": "veederakht.ir",
				},
			],
		)
		self.assertEqual(frappe_mock.get_all.call_args_list[1].kwargs["filters"], {
			"team": "veederakht-team",
			"enabled": 1,
		})

	@patch("press.saas.commerce.api.frappe")
	def test_docker_target_requires_exact_team_and_uses_live_bench_app_inventory(self, frappe_mock):
		frappe_mock.get_all.return_value = ["accounts", "restaurant", "erpnext"]
		frappe_mock.db.get_value.return_value = frappe._dict(
			domain="veederakht.ir", team="veederakht-team", enabled=1
		)
		with patch.object(api, "_docker_bench_apps", create=True, return_value=["accounts", "restaurant"]):
			target = api._marketplace_purchase_site(
				"veederakht.ir", "Docker Control Site", "veederakht-team"
			)

		self.assertEqual(target["site_type"], "Docker Control Site")
		self.assertEqual(target["installed_apps"], ["accounts", "restaurant", "erpnext"])
		self.assertEqual(target["available_apps"], ["accounts", "restaurant"])
		self.assertEqual(frappe_mock.db.get_value.call_args.args[1], {
			"domain": "veederakht.ir",
			"team": "veederakht-team",
			"enabled": 1,
		})
		self.assertEqual(frappe_mock.get_all.call_args.kwargs["filters"]["parent"], "veederakht.ir")

	@patch("press.saas.commerce.api.frappe")
	def test_press_target_uses_installed_and_bench_app_lists_separately(self, frappe_mock):
		frappe_mock.db.get_value.return_value = frappe._dict(
			name="store.asumi.ir", team="team-1", status="Active", bench="BENCH-1"
		)
		frappe_mock.get_all.return_value = ["accounts"]
		frappe_mock.get_doc.return_value = frappe._dict(
			apps=[frappe._dict(app="frappe"), frappe._dict(app="accounts"), frappe._dict(app="restaurant")]
		)

		target = api._marketplace_purchase_site("store.asumi.ir", "Site", "team-1")

		self.assertEqual(target["installed_apps"], ["accounts"])
		self.assertEqual(target["available_apps"], ["accounts", "restaurant"])

	@patch("press.saas.commerce.api.frappe")
	def test_docker_target_rejects_sites_owned_by_another_team(self, frappe_mock):
		frappe_mock.db.get_value.return_value = None
		frappe_mock.PermissionError = frappe.PermissionError
		frappe_mock.throw.side_effect = lambda message, error_type=None: (_ for _ in ()).throw(error_type(message))
		with self.assertRaises(frappe.PermissionError):
			api._marketplace_purchase_site("veederakht.ir", "Docker Control Site", "another-team")


if __name__ == "__main__":
	unittest.main()
