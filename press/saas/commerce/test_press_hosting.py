import unittest
from unittest.mock import patch

from press.saas.commerce import api


class PressHostingAdmissionTest(unittest.TestCase):
	def test_new_site_plan_resolves_to_the_native_public_press_target(self):
		class Plan:
			name = "ASUMI-PUBLIC"
			private_bench_support = 0

			def as_dict(self):
				return {"name": self.name, "private_bench_support": self.private_bench_support}

		plan = Plan()
		target = {
			"domain": "asumi.ir",
			"cluster": "IR",
			"group": "PUBLIC-V16",
			"version": "version-16",
			"apps": ["frappe", "accounts"],
			"bench": "PUBLIC-BENCH",
			"server": "PUBLIC-SERVER",
		}

		with patch.object(api, "resolve_public_site_target", create=True, return_value=target) as resolve:
			result = api._new_site_plan_config(plan, subdomain="shop")

		self.assertEqual(result, target)
		resolve.assert_called_once_with(plan, "shop")

	def candidate(self, **changes):
		return {
			"plan": {
				"document_type": "Site",
				"commerce_delivery_mode": "Create New Site",
				"enabled": 1,
				"private_bench_support": 0,
				"release_groups": ["PUBLIC-V16"],
				"allowed_apps": ["frappe", "accounts"],
			},
			"root_domain": {"name": "asumi.ir", "enabled": 1, "default_cluster": "IR"},
			"group": {"name": "PUBLIC-V16", "enabled": 1, "public": 1, "version": "version-16"},
			"bench": {"name": "PUBLIC-BENCH", "group": "PUBLIC-V16", "cluster": "IR", "status": "Active", "server": "PUBLIC-SERVER"},
			"server": {"name": "PUBLIC-SERVER", "status": "Active", "public": 1, "proxy_server": "PUBLIC-PROXY"},
			"proxy": {"name": "PUBLIC-PROXY", "status": "Active", "host_name": "proxy.asumi.ir"},
			"proxy_domains": ["asumi.ir"],
			"bench_apps": ["frappe", "accounts"],
			"tls_certificate_ready": True,
			"wildcard_dns_ready": True,
			"wildcard_tls_ready": True,
			"subdomain_dns_ready": True,
		} | changes

	def test_public_target_builder_returns_a_complete_public_bench_selection(self):
		builder = getattr(api, "build_public_site_target", None)
		self.assertIsNotNone(builder)

		target = builder(**self.candidate())

		self.assertEqual(
			target,
			{
				"domain": "asumi.ir",
				"cluster": "IR",
				"group": "PUBLIC-V16",
				"version": "version-16",
				"apps": ["frappe", "accounts"],
				"bench": "PUBLIC-BENCH",
				"server": "PUBLIC-SERVER",
			},
		)

	def test_public_target_builder_rejects_a_private_release_group(self):
		builder = getattr(api, "build_public_site_target", None)
		self.assertIsNotNone(builder)

		target = builder(**self.candidate(group={"name": "PUBLIC-V16", "enabled": 1, "public": 0, "version": "version-16"}))

		self.assertIsNone(target)

	def test_public_target_builder_rejects_missing_plan_apps(self):
		builder = getattr(api, "build_public_site_target", None)
		self.assertIsNotNone(builder)

		target = builder(**self.candidate(bench_apps=["frappe"]))

		self.assertIsNone(target)

	def test_public_target_builder_rejects_inactive_or_non_public_servers(self):
		builder = getattr(api, "build_public_site_target", None)
		self.assertIsNotNone(builder)

		for server in (
			{"name": "PUBLIC-SERVER", "status": "Inactive", "public": 1, "proxy_server": "PUBLIC-PROXY"},
			{"name": "PUBLIC-SERVER", "status": "Active", "public": 0, "proxy_server": "PUBLIC-PROXY"},
		):
			with self.subTest(server=server):
				self.assertIsNone(builder(**self.candidate(server=server)))

	def test_public_target_builder_requires_dns_tls_and_proxy_domain(self):
		builder = getattr(api, "build_public_site_target", None)
		self.assertIsNotNone(builder)

		for changes in (
			{"wildcard_dns_ready": False},
			{"wildcard_tls_ready": False},
			{"subdomain_dns_ready": False},
			{"tls_certificate_ready": False},
			{"proxy_domains": []},
		):
			with self.subTest(changes=changes):
				self.assertIsNone(builder(**self.candidate(**changes)))

	def test_public_target_builder_rejects_no_plan_groups_or_no_bench(self):
		builder = getattr(api, "build_public_site_target", None)
		self.assertIsNotNone(builder)

		for changes in (
			{"plan": {**self.candidate()["plan"], "release_groups": []}},
			{"bench": None},
		):
			with self.subTest(changes=changes):
				self.assertIsNone(builder(**self.candidate(**changes)))


if __name__ == "__main__":
	unittest.main()
