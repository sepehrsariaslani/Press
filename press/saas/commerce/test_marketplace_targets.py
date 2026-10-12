import unittest
from types import SimpleNamespace
from unittest.mock import patch

import frappe
from press.saas.commerce import api


class MarketplacePurchaseTargetTest(unittest.TestCase):
	@patch("press.saas.commerce.api.get_current_team", return_value="veederakht-team")
	@patch("press.saas.commerce.api.frappe.get_all")
	@patch("press.saas.commerce.api.frappe.session", new=SimpleNamespace(user="buyer@example.com"))
	def test_purchase_site_list_includes_only_team_linked_docker_sites(self, get_all, _team):
		get_all.side_effect = [
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
		self.assertEqual(get_all.call_args_list[1].kwargs["filters"], {
			"team": "veederakht-team",
			"enabled": 1,
		})

	@patch("press.saas.commerce.api.frappe.get_all", return_value=["accounts", "restaurant", "erpnext"])
	@patch("press.saas.commerce.api.frappe.db.get_value")
	def test_docker_target_requires_exact_team_and_uses_installed_app_inventory(self, get_value, get_all):
		get_value.return_value = frappe._dict(
			domain="veederakht.ir", team="veederakht-team", enabled=1
		)

		target = api._marketplace_purchase_site("veederakht.ir", "Docker Control Site", "veederakht-team")

		self.assertEqual(target["site_type"], "Docker Control Site")
		self.assertEqual(target["installed_apps"], ["accounts", "restaurant", "erpnext"])
		self.assertEqual(get_value.call_args.args[1], {
			"domain": "veederakht.ir",
			"team": "veederakht-team",
			"enabled": 1,
		})
		self.assertEqual(get_all.call_args.kwargs["filters"]["parent"], "veederakht.ir")

	@patch("press.saas.commerce.api.frappe.db.get_value", return_value=None)
	def test_docker_target_rejects_sites_owned_by_another_team(self, _get_value):
		with self.assertRaises(frappe.PermissionError):
			api._marketplace_purchase_site("veederakht.ir", "Docker Control Site", "another-team")


if __name__ == "__main__":
	unittest.main()
