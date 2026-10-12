import unittest

from press.saas.commerce.hosting_readiness import (
	build_hosting_readiness,
	hosting_plan_fits_capacity,
	normalize_capacity_reserve,
)


class HostingReadinessTest(unittest.TestCase):
	def test_capacity_reserve_must_be_positive_and_finite(self):
		self.assertEqual(normalize_capacity_reserve("2.5"), 2.5)
		for value in (None, "", "0", "-1", "nan", "inf", "1000001", True):
			with self.subTest(value=value):
				with self.assertRaises(ValueError):
					normalize_capacity_reserve(value)
		self.assertEqual(normalize_capacity_reserve(0, allow_zero=True), 0)

	def ready_facts(self):
		return {
			"live_payment": {"ready": True, "detail": "زرین‌پال آماده است."},
			"site_plan": {"ready": True, "detail": "یک پلن فعال آماده است."},
			"root_domain": {"ready": True, "detail": "asumi.ir ثبت شده است."},
			"wildcard_dns": {"ready": True, "detail": "زیردامنه به سرور می‌رسد."},
			"wildcard_tls": {"ready": True, "detail": "گواهی wildcard معتبر است."},
			"press_infrastructure": {"ready": True, "detail": "بنچ عمومی آماده است."},
			"capacity": {"ready": True, "detail": "منابع کافی است."},
			"docker_agent": {"ready": True, "detail": "عامل متصل است."},
		}

	def test_hosting_is_ready_only_when_every_delivery_gate_is_ready(self):
		readiness = build_hosting_readiness(
			self.ready_facts(),
			{"disk_free_bytes": 8_800_000_000, "memory_available_bytes": 6_000_000_000},
		)

		self.assertTrue(readiness["ready"])
		self.assertEqual(len(readiness["checks"]), 8)
		self.assertEqual(readiness["resources"]["disk_free_bytes"], 8_800_000_000)

	def test_one_missing_gate_keeps_new_site_sales_blocked(self):
		facts = self.ready_facts()
		facts["wildcard_tls"] = {"ready": False, "detail": "گواهی wildcard پیدا نشد."}

		readiness = build_hosting_readiness(facts)

		self.assertFalse(readiness["ready"])
		failed = next(check for check in readiness["checks"] if check["key"] == "wildcard_tls")
		self.assertFalse(failed["ready"])
		self.assertEqual(failed["detail"], "گواهی wildcard پیدا نشد.")

	def test_omitted_gate_fails_closed_and_secrets_are_not_returned(self):
		facts = self.ready_facts()
		del facts["capacity"]
		facts["live_payment"]["merchant_id"] = "must-not-be-returned"

		readiness = build_hosting_readiness(facts)

		self.assertFalse(readiness["ready"])
		self.assertNotIn("must-not-be-returned", str(readiness))
		self.assertEqual(readiness["resources"], {})

	def test_capacity_requires_plan_limits_and_configured_free_resource_reserves(self):
		plan = {"max_storage_usage": 4096, "memory": 1024}
		resources = {
			"disk_free_bytes": (4096 + 2 * 1024) * 1024 * 1024,
			"memory_available_bytes": 2 * 1024 * 1024 * 1024,
		}

		self.assertTrue(hosting_plan_fits_capacity(plan, resources, reserve_disk_gb=2, reserve_memory_gb=1))
		self.assertFalse(hosting_plan_fits_capacity(plan, resources, reserve_disk_gb=0, reserve_memory_gb=1))
		self.assertFalse(hosting_plan_fits_capacity(plan, resources, reserve_disk_gb=2, reserve_memory_gb=0))
		self.assertFalse(
			hosting_plan_fits_capacity(
				plan,
				{**resources, "disk_free_bytes": resources["disk_free_bytes"] - 1},
				reserve_disk_gb=2,
				reserve_memory_gb=1,
			)
		)
		self.assertFalse(
			hosting_plan_fits_capacity(
				plan,
				{**resources, "memory_available_bytes": resources["memory_available_bytes"] - 1},
				reserve_disk_gb=2,
				reserve_memory_gb=1,
			)
		)


if __name__ == "__main__":
	unittest.main()
