import unittest

from press.saas.commerce.site_plan_admin import build_site_plan_draft, normalize_site_plan_admin_update


class SitePlanAdminTest(unittest.TestCase):
	def test_new_site_draft_uses_an_explicit_public_group_and_never_requests_a_vps(self):
		plan = build_site_plan_draft(
			name="asumi_public_basic",
			title="پایهٔ عمومی",
			description="",
			interval="Monthly",
			delivery_mode="Create New Site",
			release_groups=["PUBLIC-V16"],
			allowed_apps=["accounts"],
			available_apps_by_group={"PUBLIC-V16": ["frappe", "accounts", "restaurant"]},
		)
		self.assertEqual(plan["release_groups"], [{"release_group": "PUBLIC-V16"}])
		self.assertEqual(plan["allowed_apps"], [{"app": "frappe"}, {"app": "accounts"}])
		self.assertEqual(plan["dedicated_server_plan"], 0)
		self.assertEqual(plan["private_bench_support"], 0)
		self.assertNotIn("hostiran_product_code", plan)
		self.assertNotIn("hostiran_monthly_cost_irr", plan)

	def test_new_site_draft_rejects_empty_private_or_unavailable_groups_and_apps(self):
		base = {
			"name": "asumi_public_basic",
			"title": "پایه",
			"description": "",
			"interval": "Monthly",
			"delivery_mode": "Create New Site",
			"release_groups": ["PUBLIC-V16"],
			"allowed_apps": ["accounts"],
			"available_apps_by_group": {"PUBLIC-V16": ["frappe", "accounts"]},
		}
		for changes in (
			{"release_groups": []},
			{"release_groups": ["PRIVATE-V16"]},
			{"allowed_apps": ["unavailable"]},
			{"available_apps_by_group": {"PUBLIC-V16": ["accounts"]}},
		):
			with self.subTest(changes=changes), self.assertRaises(ValueError):
				build_site_plan_draft(**(base | changes))

	def test_plan_draft_rejects_invalid_name_interval_and_delivery_mode(self):
		base = {
			"name": "asumi_basic", "title": "پایه", "description": "", "interval": "Monthly",
			"delivery_mode": "Create New Site", "release_groups": ["PUBLIC-V16"],
			"allowed_apps": ["accounts"], "available_apps_by_group": {"PUBLIC-V16": ["frappe", "accounts"]},
		}
		for changes in ({"name": "../bad"}, {"interval": "Daily"}, {"delivery_mode": "shell"}):
			with self.subTest(changes=changes), self.assertRaises(ValueError):
				build_site_plan_draft(**(base | changes))

	def _current(self, **changes):
		return {
			"price_inr": 0, "price_usd": 0, "price_irr": 0, "interval": "Monthly", "enabled": 0,
			"commerce_delivery_mode": "Create New Site", "dedicated_server_plan": 0, "private_bench_support": 0,
			"max_database_usage": 0, "max_storage_usage": 0, "memory": 0, "vcpu": 0, "disk": 0,
			"cpu_time_per_day": 0, "release_groups": ["PUBLIC-V16"], "allowed_apps": ["frappe", "accounts"],
			**changes,
		}

	def _payload(self, **changes):
		return {
			"price_inr": 0, "price_usd": 0, "price_irr": 10_000, "interval": "Monthly", "enabled": True,
			"delivery_mode": "Create New Site", "max_database_usage": 2048, "max_storage_usage": 8192,
			"memory": 1024, "vcpu": 0, "disk": 0, "cpu_time_per_day": 1,
			**changes,
		}

	def test_enabling_requires_current_public_group_apps_price_and_resources(self):
		choices = {"PUBLIC-V16": ["frappe", "accounts"]}
		updated = normalize_site_plan_admin_update(
			self._payload(), current=self._current(), available_apps_by_group=choices
		)
		self.assertEqual(updated["values"]["enabled"], 1)
		self.assertEqual(updated["values"]["dedicated_server_plan"], 0)
		self.assertEqual(updated["values"]["private_bench_support"], 0)
		for payload in (
			self._payload(price_irr=9999),
			self._payload(memory=0),
			self._payload(),
		):
			with self.subTest(payload=payload), self.assertRaises(ValueError):
				normalize_site_plan_admin_update(
					payload,
					current=self._current(release_groups=[]),
					available_apps_by_group=choices,
				)

	def test_public_group_app_selection_is_checked_against_installed_apps(self):
		with self.assertRaises(ValueError):
			normalize_site_plan_admin_update(
				self._payload(release_groups=["PRIVATE-V16"], allowed_apps=["accounts"]),
				current=self._current(),
				available_apps_by_group={"PUBLIC-V16": ["frappe", "accounts"]},
			)

	def test_active_orders_block_price_group_and_app_changes(self):
		with self.assertRaises(ValueError):
			normalize_site_plan_admin_update(
				self._payload(release_groups=["PUBLIC-V17"]),
				current=self._current(enabled=1),
				has_orders=True,
				available_apps_by_group={"PUBLIC-V17": ["frappe", "accounts"]},
			)

	def test_existing_site_upgrade_legacy_plan_can_be_saved_without_new_site_readiness(self):
		legacy = self._current(
			commerce_delivery_mode="Upgrade Existing Site", release_groups=[], allowed_apps=[], max_database_usage=0,
			max_storage_usage=0, memory=0, enabled=1,
		)
		result = normalize_site_plan_admin_update(
			{"price_inr": 0, "price_usd": 0, "price_irr": 0, "enabled": True}, current=legacy
		)
		self.assertFalse(result["material_change"])


if __name__ == "__main__":
	unittest.main()
