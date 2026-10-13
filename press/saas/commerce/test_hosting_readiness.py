import unittest
from types import SimpleNamespace

from press.saas.commerce.hosting_readiness import (
	build_hosting_readiness,
	hosting_capacity_reservations,
	hosting_plan_fits_capacity,
	normalize_capacity_reserve,
	resolve_ipv4,
	wildcard_dns_guidance,
)


class HostingReadinessTest(unittest.TestCase):
	def test_ipv4_lookup_uses_a_bounded_dns_resolver_and_sorts_unique_addresses(self):
		class ResolverStub:
			def __init__(self):
				self.nameservers = None
				self.timeout = None
				self.lifetime = None

			def resolve(self, hostname, record_type):
				self.query = (hostname, record_type)
				return [
					SimpleNamespace(address="203.0.113.9"),
					SimpleNamespace(address="203.0.113.2"),
					SimpleNamespace(address="203.0.113.9"),
				]

		resolver = ResolverStub()
		factory_kwargs = {}

		def resolver_factory(**kwargs):
			factory_kwargs.update(kwargs)
			return resolver

		self.assertEqual(
			resolve_ipv4("hosting-check.asumi.ir", resolver_factory=resolver_factory),
			["203.0.113.2", "203.0.113.9"],
		)
		self.assertEqual(resolver.query, ("hosting-check.asumi.ir", "A"))
		self.assertEqual(factory_kwargs, {"configure": False})
		self.assertEqual(resolver.nameservers, ["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"])
		self.assertGreater(resolver.lifetime, 0)
		self.assertLessEqual(resolver.lifetime, 3)
		self.assertGreater(resolver.timeout, 0)
		self.assertLessEqual(resolver.timeout, resolver.lifetime)

	def test_ipv4_lookup_treats_dns_failures_as_an_unresolved_host(self):
		class ResolverStub:
			def __init__(self):
				self.nameservers = None
				self.timeout = None
				self.lifetime = None

			def resolve(self, hostname, record_type):
				raise OSError("DNS resolver unavailable")

		self.assertEqual(resolve_ipv4("hosting-check.asumi.ir", resolver_factory=lambda **_: ResolverStub()), [])

	def test_wildcard_dns_guidance_uses_the_live_apex_addresses(self):
		self.assertIn("همان سرور", wildcard_dns_guidance(True, ["62.60.207.82"]))
		guidance = wildcard_dns_guidance(False, ["62.60.207.82"])
		self.assertIn("A", guidance)
		self.assertIn("62.60.207.82", guidance)
		self.assertIn("*", guidance)
		self.assertIn("بررسی دوباره", guidance)
		self.assertIn("IP دامنهٔ اصلی", wildcard_dns_guidance(False, []))

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
			"press_infrastructure": {"ready": True, "detail": "بنچ خصوصی آماده است."},
			"capacity": {"ready": True, "detail": "SKU و منابع VPS ثبت شده است."},
			"access_email": {"ready": True, "detail": "ایمیل خروجی آماده است."},
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

	def test_capacity_counts_existing_hosting_reservations_before_accepting_another_site(self):
		plan = {"max_storage_usage": 1024, "memory": 1024}
		resources = {
			"disk_free_bytes": 5 * 1024 * 1024 * 1024,
			"memory_available_bytes": 5 * 1024 * 1024 * 1024,
		}

		self.assertFalse(
			hosting_plan_fits_capacity(
				plan,
				resources,
				reserve_disk_gb=1,
				reserve_memory_gb=1,
				reserved_disk_mib=3073,
				reserved_memory_mib=3073,
			)
		)

	def test_capacity_reservations_deduplicate_renewals_for_each_hosted_site(self):
		reservations = hosting_capacity_reservations(
			[
				{"reservation_key": "one.asumi.ir", "plan": "small"},
				{"reservation_key": "one.asumi.ir", "plan": "small"},
				{"reservation_key": "two.asumi.ir", "plan": "large"},
			],
			{
				"small": {"max_storage_usage": 1024, "memory": 512},
				"large": {"max_storage_usage": 2048, "memory": 1024},
			},
		)

		self.assertEqual(
			reservations,
			{"sites": 2, "reserved_disk_mib": 3072, "reserved_memory_mib": 1536},
		)

	def test_capacity_reservations_fail_closed_when_site_or_plan_limits_are_missing(self):
		for orders, plans in (
			([{"plan": "small"}], {"small": {"max_storage_usage": 1024, "memory": 512}}),
			([{"reservation_key": "one.asumi.ir", "plan": "missing"}], {}),
			(
				[{"reservation_key": "one.asumi.ir", "plan": "small"}],
				{"small": {"max_storage_usage": 0, "memory": 512}},
			),
		):
			with self.subTest(orders=orders, plans=plans), self.assertRaises(ValueError):
				hosting_capacity_reservations(orders, plans)


if __name__ == "__main__":
	unittest.main()
