import unittest
from types import SimpleNamespace

from press.saas.commerce.hosting_readiness import build_hosting_readiness, resolve_ipv4, wildcard_dns_guidance


class HostingReadinessTest(unittest.TestCase):
	def test_ipv4_lookup_uses_a_bounded_dns_resolver_and_sorts_unique_addresses(self):
		class ResolverStub:
			def __init__(self):
				self.nameservers = None
				self.timeout = None
				self.lifetime = None

			def resolve(self, hostname, record_type):
				self.query = (hostname, record_type)
				return [SimpleNamespace(address=value) for value in ("203.0.113.9", "203.0.113.2", "203.0.113.9")]

		resolver = ResolverStub()
		self.assertEqual(resolve_ipv4("hosting-check.asumi.ir", resolver_factory=lambda **_: resolver), ["203.0.113.2", "203.0.113.9"])
		self.assertEqual(resolver.query, ("hosting-check.asumi.ir", "A"))
		self.assertEqual(resolver.nameservers, ["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"])
		self.assertLessEqual(resolver.timeout, resolver.lifetime)

	def test_ipv4_lookup_treats_dns_failures_as_unresolved(self):
		class ResolverStub:
			def __init__(self, **kwargs):
				pass

			def resolve(self, hostname, record_type):
				raise OSError("resolver unavailable")

		self.assertEqual(resolve_ipv4("hosting-check.asumi.ir", resolver_factory=ResolverStub), [])

	def test_wildcard_dns_guidance_names_the_apex_ip_or_missing_apex(self):
		self.assertIn("همان سرور", wildcard_dns_guidance(True, ["62.60.207.82"]))
		guidance = wildcard_dns_guidance(False, ["62.60.207.82"])
		self.assertIn("A", guidance)
		self.assertIn("62.60.207.82", guidance)
		self.assertIn("*", guidance)
		self.assertIn("IP دامنهٔ اصلی", wildcard_dns_guidance(False, []))

	def ready_facts(self):
		return {
			"live_payment": {"ready": True, "detail": "زرین‌پال آماده است."},
			"site_plan": {"ready": True, "detail": "پلن عمومی آماده است."},
			"root_domain": {"ready": True, "detail": "asumi.ir ثبت شده است."},
			"wildcard_dns": {"ready": True, "detail": "زیردامنه به سرور می‌رسد."},
			"wildcard_tls": {"ready": True, "detail": "گواهی wildcard معتبر است."},
			"press_infrastructure": {"ready": True, "detail": "بنچ عمومی Press آماده است."},
			"access_email": {"ready": True, "detail": "ایمیل خروجی آماده است."},
		}

	def test_hosting_is_ready_only_when_every_public_press_gate_is_ready(self):
		readiness = build_hosting_readiness(self.ready_facts())
		self.assertTrue(readiness["ready"])
		self.assertEqual(len(readiness["checks"]), 7)
		self.assertEqual(readiness["resources"], {})

	def test_missing_public_bench_keeps_hosting_sales_blocked(self):
		facts = self.ready_facts()
		facts["press_infrastructure"] = {"ready": False, "detail": "بنچ عمومی یا پراکسی متصل نیست."}
		readiness = build_hosting_readiness(facts)
		self.assertFalse(readiness["ready"])
		failed = next(check for check in readiness["checks"] if check["key"] == "press_infrastructure")
		self.assertFalse(failed["ready"])
		self.assertEqual(failed["detail"], "بنچ عمومی یا پراکسی متصل نیست.")

	def test_omitted_gate_fails_closed_and_secrets_are_not_returned(self):
		facts = self.ready_facts()
		del facts["press_infrastructure"]
		facts["live_payment"]["merchant_id"] = "never-return-this"
		readiness = build_hosting_readiness(facts)
		self.assertFalse(readiness["ready"])
		self.assertNotIn("never-return-this", str(readiness))


if __name__ == "__main__":
	unittest.main()
