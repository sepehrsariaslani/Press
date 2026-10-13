import unittest

from press.saas.commerce.site_plan_admin import (
	build_site_plan_draft,
	normalize_site_plan_admin_update,
)


class SitePlanAdminTest(unittest.TestCase):
	def test_new_site_plan_targets_a_private_dedicated_bench_on_hostiran(self):
		plan = build_site_plan_draft(
			name="asumi_hostiran_basic",
			title="پایهٔ VPS",
			description="",
			interval="Monthly",
			delivery_mode="Create New Site",
			release_groups=[],
			allowed_apps=["accounts"],
			available_apps_by_group={
				"__asumi_hostiran_dedicated_vps__": ["frappe", "accounts", "restaurant"]
			},
		)

		self.assertEqual(plan["release_groups"], [])
		self.assertEqual(plan["allowed_apps"], [{"app": "frappe"}, {"app": "accounts"}])
		self.assertEqual(plan["dedicated_server_plan"], 1)
		self.assertEqual(plan["private_bench_support"], 1)

	def test_new_site_plan_is_a_disabled_zero_price_draft(self):
		plan = build_site_plan_draft(
			name="asumi_basic",
			title="  پایه  ",
			description="  پلن آغازین  ",
			interval="Monthly",
			delivery_mode="Create New Site",
			release_groups=[],
			allowed_apps=[],
			available_apps_by_group={},
		)

		self.assertEqual(plan["name"], "asumi_basic")
		self.assertEqual(plan["plan_title"], "پایه")
		self.assertEqual(plan["plan_description"], "پلن آغازین")
		self.assertEqual(plan["document_type"], "Site")
		self.assertEqual(plan["enabled"], 0)
		self.assertEqual(plan["interval"], "Monthly")
		self.assertEqual(plan["commerce_delivery_mode"], "Create New Site")
		self.assertEqual(plan["price_irr"], 0)
		self.assertEqual(plan["price_inr"], 0)
		self.assertEqual(plan["price_usd"], 0)
		self.assertEqual(plan["release_groups"], [])
		self.assertEqual(plan["allowed_apps"], [])

	def test_new_site_plan_rejects_a_shared_press_release_group(self):
		with self.assertRaises(ValueError):
			build_site_plan_draft(
				name="asumi_basic",
				title="پایه",
				description="",
				interval="Monthly",
				delivery_mode="Create New Site",
				release_groups=["release-v16"],
				allowed_apps=["unknown_app"],
				available_apps_by_group={"release-v16": ["frappe", "accounts"]},
			)

	def test_new_site_plan_is_not_ready_to_sell_until_provider_sku_and_cost_are_recorded(self):
		current = {
			"price_inr": 0, "price_usd": 0, "price_irr": 10_000, "interval": "Monthly",
			"enabled": 0, "commerce_delivery_mode": "Create New Site", "dedicated_server_plan": 1,
			"max_database_usage": 1024, "max_storage_usage": 4096, "memory": 4096,
			"cpu_time_per_day": 1, "release_groups": [], "allowed_apps": ["frappe", "accounts"],
			"hostiran_product_code": "", "hostiran_monthly_cost_irr": 0,
		}
		for payload in (
			{"enabled": True, "hostiran_product_code": "", "hostiran_monthly_cost_irr": 0},
			{"enabled": True, "hostiran_product_code": "VPS-3-IR", "hostiran_monthly_cost_irr": 0},
		):
			with self.subTest(payload=payload), self.assertRaises(ValueError):
				normalize_site_plan_admin_update(
					{
						"price_irr": 10_000, "price_inr": 0, "price_usd": 0, "interval": "Monthly",
						"delivery_mode": "Create New Site", "enabled": True,
						"max_database_usage": 1024, "max_storage_usage": 4096, "memory": 4096,
						"cpu_time_per_day": 1, **payload,
					},
					current=current,
				)

	def test_plan_draft_rejects_invalid_name_interval_and_delivery_mode(self):
		base = {
			"name": "asumi_basic",
			"title": "پایه",
			"description": "",
			"interval": "Monthly",
			"delivery_mode": "Create New Site",
			"release_groups": [],
			"allowed_apps": [],
			"available_apps_by_group": {},
		}
		for changes in (
			{"name": "../bad"},
			{"interval": "Yearly"},
			{"delivery_mode": "shell"},
			{"description": "x" * 141},
		):
			with self.subTest(changes=changes), self.assertRaises(ValueError):
				build_site_plan_draft(**(base | changes))

	def test_admin_updates_validate_values_and_report_material_changes(self):
		changes = normalize_site_plan_admin_update(
			{
				"price_inr": 0,
				"price_usd": 0,
				"price_irr": 0,
				"interval": "Annually",
				"enabled": False,
				"delivery_mode": "Upgrade Existing Site",
				"max_database_usage": 2048,
				"max_storage_usage": 8192,
				"memory": 1024,
				"cpu_time_per_day": 12,
			},
			current={
				"price_inr": 0,
				"price_usd": 0,
				"price_irr": 0,
				"interval": "Monthly",
				"enabled": 1,
				"commerce_delivery_mode": "Create New Site",
				"max_database_usage": 0,
				"max_storage_usage": 0,
				"memory": 0,
				"cpu_time_per_day": 0,
			},
		)

		self.assertTrue(changes["material_change"])
		self.assertEqual(changes["values"]["interval"], "Annually")
		self.assertEqual(changes["values"]["enabled"], 0)
		self.assertEqual(changes["values"]["max_storage_usage"], 8192)
		self.assertEqual(changes["values"]["memory"], 1024)

	def test_admin_can_update_release_groups_and_allowed_apps(self):
		current = {
			"price_inr": 0,
			"price_usd": 0,
			"price_irr": 0,
			"interval": "Monthly",
			"enabled": 0,
			"commerce_delivery_mode": "Create New Site",
			"dedicated_server_plan": 1,
			"private_bench_support": 1,
			"max_database_usage": 0,
			"max_storage_usage": 0,
			"memory": 0,
			"vcpu": 0,
			"disk": 0,
			"hostiran_product_code": "",
			"hostiran_monthly_cost_irr": 0,
			"cpu_time_per_day": 0,
			"release_groups": [],
			"allowed_apps": [],
		}
		changes = normalize_site_plan_admin_update(
			{**current, "release_groups": [], "allowed_apps": ["accounts"]},
			current=current,
			available_apps_by_group={"__asumi_hostiran_dedicated_vps__": ["frappe", "accounts"]},
		)

		self.assertTrue(changes["material_change"])
		self.assertEqual(changes["values"]["release_groups"], [])
		self.assertEqual(changes["values"]["allowed_apps"], ["frappe", "accounts"])

	def test_admin_rejects_unavailable_release_groups_and_apps(self):
		current = {
			"price_inr": 0,
			"price_usd": 0,
			"price_irr": 0,
			"interval": "Monthly",
			"enabled": 0,
			"commerce_delivery_mode": "Create New Site",
			"max_database_usage": 0,
			"max_storage_usage": 0,
			"memory": 0,
			"cpu_time_per_day": 0,
			"release_groups": [],
			"allowed_apps": [],
		}
		base = {**current, "price_irr": 0, "price_inr": 0, "price_usd": 0}
		for changes, choices in (
			({"release_groups": ["old-release"]}, {}),
			({"release_groups": ["release-v16"], "allowed_apps": ["unknown"]}, {"release-v16": ["frappe", "accounts"]}),
		):
			with self.subTest(changes=changes), self.assertRaises(ValueError):
				normalize_site_plan_admin_update(
					base | changes,
					current=current,
					available_apps_by_group=choices,
				)

	def test_admin_rejects_apps_missing_from_any_selected_release_group(self):
		current = {
			"price_inr": 0,
			"price_usd": 0,
			"price_irr": 0,
			"interval": "Monthly",
			"enabled": 0,
			"commerce_delivery_mode": "Create New Site",
			"max_database_usage": 0,
			"max_storage_usage": 0,
			"memory": 0,
			"cpu_time_per_day": 0,
			"release_groups": [],
			"allowed_apps": [],
		}
		with self.assertRaises(ValueError):
			normalize_site_plan_admin_update(
				{**current, "release_groups": ["release-a", "release-b"], "allowed_apps": ["restaurant"]},
				current=current,
				available_apps_by_group={
					"release-a": ["frappe", "restaurant"],
					"release-b": ["frappe", "accounts"],
				},
			)

	def test_active_orders_block_release_group_and_app_changes(self):
		current = {
			"price_inr": 0,
			"price_usd": 0,
			"price_irr": 0,
			"interval": "Monthly",
			"enabled": 1,
			"commerce_delivery_mode": "Create New Site",
			"max_database_usage": 1024,
			"max_storage_usage": 4096,
			"memory": 1024,
			"cpu_time_per_day": 1,
			"release_groups": ["release-v16"],
			"allowed_apps": ["frappe", "accounts"],
		}
		payload = {
			"price_inr": 0,
			"price_usd": 0,
			"price_irr": 0,
			"interval": "Monthly",
			"enabled": True,
			"delivery_mode": "Create New Site",
			"max_database_usage": 1024,
			"max_storage_usage": 4096,
			"memory": 1024,
			"cpu_time_per_day": 1,
			"release_groups": [],
			"allowed_apps": ["frappe"],
		}
		with self.assertRaises(ValueError):
			normalize_site_plan_admin_update(
				payload,
				current=current,
				has_orders=True,
				available_apps_by_group={"release-v16": ["frappe", "accounts"]},
			)

	def test_enabling_a_hosting_plan_requires_a_price_and_resource_limits(self):
		current = {
			"price_inr": 0,
			"price_usd": 0,
			"price_irr": 0,
			"interval": "Monthly",
			"enabled": 0,
			"commerce_delivery_mode": "Create New Site",
			"dedicated_server_plan": 1,
			"private_bench_support": 1,
			"max_database_usage": 0,
			"max_storage_usage": 0,
			"memory": 0,
			"vcpu": 0,
			"disk": 0,
			"hostiran_product_code": "",
			"hostiran_monthly_cost_irr": 0,
			"cpu_time_per_day": 0,
		}
		valid = {
			"price_inr": 0,
			"price_usd": 0,
			"price_irr": 10_000,
			"interval": "Monthly",
			"enabled": True,
			"delivery_mode": "Create New Site",
			"max_database_usage": 2048,
			"max_storage_usage": 8192,
			"memory": 1024,
			"vcpu": 2,
			"disk": 60,
			"hostiran_product_code": "VPS-3-IR",
			"hostiran_monthly_cost_irr": 24_900_000,
			"cpu_time_per_day": 0,
		}
		self.assertTrue(normalize_site_plan_admin_update(valid, current=current)["values"]["enabled"])
		with self.assertRaises(ValueError):
			normalize_site_plan_admin_update(valid | {"memory": 0}, current=current)
		with self.assertRaises(ValueError):
			normalize_site_plan_admin_update(valid | {"price_irr": 9999}, current=current)
		with self.assertRaises(ValueError):
			normalize_site_plan_admin_update(valid | {"price_irr": 0}, current=current)

	def test_existing_enabled_plan_can_be_saved_without_revalidating_legacy_limits(self):
		legacy = {
			"price_inr": 0,
			"price_usd": 0,
			"price_irr": 0,
			"interval": "Monthly",
			"enabled": 1,
			"commerce_delivery_mode": "Upgrade Existing Site",
			"max_database_usage": 0,
			"max_storage_usage": 0,
			"memory": 0,
			"cpu_time_per_day": 0,
		}
		changes = normalize_site_plan_admin_update(
			{"price_inr": 0, "price_usd": 0, "price_irr": 0, "enabled": True},
			current=legacy,
		)
		self.assertFalse(changes["material_change"])

	def test_active_orders_block_changes_to_price_delivery_or_resource_limits(self):
		current = {
			"price_inr": 0,
			"price_usd": 0,
			"price_irr": 0,
			"interval": "Monthly",
			"enabled": 1,
			"commerce_delivery_mode": "Create New Site",
			"max_database_usage": 1024,
			"max_storage_usage": 4096,
			"memory": 1024,
			"cpu_time_per_day": 1,
		}
		for field, value in (("price_irr", 500_000), ("delivery_mode", "Upgrade Existing Site"), ("memory", 2048)):
			payload = {
				"price_inr": 0,
				"price_usd": 0,
				"price_irr": 0,
				"interval": "Monthly",
				"enabled": True,
				"delivery_mode": "Create New Site",
				"max_database_usage": 1024,
				"max_storage_usage": 4096,
				"memory": 1024,
				"cpu_time_per_day": 1,
			} | {field: value}
			with self.subTest(field=field), self.assertRaises(ValueError):
				normalize_site_plan_admin_update(payload, current=current, has_orders=True)


if __name__ == "__main__":
	unittest.main()
