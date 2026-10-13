import unittest
from types import SimpleNamespace
from unittest.mock import patch

from press.saas.commerce import api


class HostingCapacityApiTest(unittest.TestCase):
	def test_capacity_reservations_include_hosted_orders_and_deduplicate_renewals(self):
		orders = [
			SimpleNamespace(site=None, docker_site=None, subdomain="one", plan="SMALL"),
			SimpleNamespace(
				site="one.asumi.ir", docker_site=None, subdomain="one", plan="LARGE"
			),
			SimpleNamespace(site=None, docker_site=None, subdomain="two", plan="SMALL"),
		]
		plans = [
			SimpleNamespace(name="SMALL", max_storage_usage=1024, memory=512),
			SimpleNamespace(name="LARGE", max_storage_usage=2048, memory=1024),
		]

		def get_all(doctype, **kwargs):
			if doctype == "Commerce Order":
				self.assertEqual(
					kwargs["filters"]["status"],
					[
						"in",
						[
							"Pending Payment",
							"Paid",
							"Provisioning",
							"Provisioning Failed",
							"Active",
							"Expired",
						],
					],
				)
				self.assertEqual(kwargs["limit_page_length"], 5001)
				return orders
			if doctype == "Site Plan":
				self.assertEqual(kwargs["filters"]["name"], ["in", ["LARGE", "SMALL"]])
				return plans
			self.fail(f"Unexpected DocType: {doctype}")

		with patch.object(api.frappe, "get_all", side_effect=get_all):
			reservations = api._hosting_capacity_reservation_totals()

		self.assertEqual(
			reservations,
			{"sites": 2, "reserved_disk_mib": 3072, "reserved_memory_mib": 1536},
		)

	def test_capacity_reservations_fail_closed_when_order_history_exceeds_limit(self):
		orders = [
			SimpleNamespace(site=None, docker_site=None, subdomain=f"site-{index}", plan="SMALL")
			for index in range(5001)
		]
		with patch.object(api.frappe, "get_all", return_value=orders):
			with self.assertRaisesRegex(ValueError, "بیش از حد مجاز"):
				api._hosting_capacity_reservation_totals()

	def test_capacity_reservations_fail_closed_when_order_has_no_site_or_plan(self):
		for order in (
			SimpleNamespace(site=None, docker_site=None, subdomain=None, plan="SMALL"),
			SimpleNamespace(site="one.asumi.ir", docker_site=None, subdomain="one", plan=None),
		):
			with self.subTest(order=order), patch.object(api.frappe, "get_all", return_value=[order]):
				with self.assertRaises(ValueError):
					api._hosting_capacity_reservation_totals()

	def test_new_site_admission_passes_existing_reservations_into_capacity_check(self):
		class Plan:
			private_bench_support = 0

			def as_dict(self):
				return {"max_storage_usage": 1024, "memory": 512}

		plan = Plan()
		reservations = {"sites": 2, "reserved_disk_mib": 3072, "reserved_memory_mib": 1536}
		with (
			patch.object(api, "_get_settings", return_value=SimpleNamespace(
				hosting_min_free_disk_gb=1, hosting_min_free_memory_gb=1
			)),
			patch.object(
				api,
				"_live_docker_snapshot",
				return_value={"connected": True, "resources": {}},
			),
			patch.object(api, "_hosting_capacity_reservation_totals", return_value=reservations),
			patch.object(api, "hosting_plan_fits_capacity", return_value=False) as fits_capacity,
		):
			result = api._new_site_plan_config(plan, subdomain="another-site")

		self.assertIsNone(result)
		self.assertEqual(fits_capacity.call_args.kwargs["reserved_disk_mib"], 3072)
		self.assertEqual(fits_capacity.call_args.kwargs["reserved_memory_mib"], 1536)

	def test_new_hosted_site_orders_use_a_shared_capacity_lock(self):
		with patch.object(api, "_acquire_transaction_lock", return_value=True) as acquire_lock:
			api._acquire_hosting_capacity_lock()
		acquire_lock.assert_called_once_with("asumi-hosting-capacity")

		with (
			patch.object(api, "_acquire_transaction_lock", return_value=False),
			patch.object(api.frappe, "throw", side_effect=RuntimeError("capacity lock unavailable")),
		):
			with self.assertRaisesRegex(RuntimeError, "capacity lock unavailable"):
				api._acquire_hosting_capacity_lock()

	def test_admin_readiness_displays_reserved_sites_and_checks_remaining_capacity(self):
		class Plan:
			name = "SITE-PLAN"
			price_irr = 10000
			interval = "Monthly"
			max_storage_usage = 1024
			memory = 512

			def as_dict(self):
				return {"max_storage_usage": self.max_storage_usage, "memory": self.memory}

		reservations = {"sites": 3, "reserved_disk_mib": 3072, "reserved_memory_mib": 1536}
		resources = {
			"disk_free_bytes": 8 * 1024**3,
			"memory_available_bytes": 8 * 1024**3,
		}

		with (
			patch.object(api, "_require_commerce_admin"),
			patch.object(
				api,
				"_get_settings",
				return_value=SimpleNamespace(
					enabled=0,
					allow_site_plan_sales=0,
					sandbox_mode=1,
					hosting_min_free_disk_gb=1,
					hosting_min_free_memory_gb=1,
				),
			),
			patch.object(api.frappe.db, "exists", return_value=False),
			patch.object(api.frappe, "get_all", return_value=[Plan()]),
			patch.object(api, "_resolve_ipv4", return_value=[]),
			patch.object(api, "_wildcard_dns_targets_apex", return_value=False),
			patch.object(api, "_live_docker_snapshot", return_value={"connected": True, "resources": resources}),
			patch.object(api, "_hosting_capacity_reservation_totals", return_value=reservations),
			patch.object(api, "_press_shared_bench_ready", return_value=False),
			patch.object(api, "hosting_plan_fits_capacity", return_value=False) as fits_capacity,
		):
			readiness = api.admin_hosting_readiness()

		capacity_check = next(check for check in readiness["checks"] if check["key"] == "capacity")
		self.assertFalse(capacity_check["ready"])
		self.assertIn("3 سایت میزبانی‌شده", capacity_check["detail"])
		self.assertEqual(fits_capacity.call_args.kwargs["reserved_disk_mib"], 3072)
		self.assertEqual(fits_capacity.call_args.kwargs["reserved_memory_mib"], 1536)


def run_mocked_tests():
	suite = unittest.defaultTestLoader.loadTestsFromModule(__import__(__name__, fromlist=["*"]))
	result = unittest.TextTestRunner(verbosity=2).run(suite)
	if not result.wasSuccessful():
		raise RuntimeError("Hosting capacity API tests failed")


if __name__ == "__main__":
	unittest.main()
