from types import SimpleNamespace
import unittest
from unittest.mock import patch

from press.docker_control.client import DockerControlClient, DockerControlError


class DockerControlClientTest(unittest.TestCase):
	@patch("press.docker_control.client.requests.request")
	def test_available_apps_reads_a_typed_private_inventory(self, request):
		response = SimpleNamespace(
			status_code=200,
			json=lambda: {"protocol_version": 1, "apps": ["accounts", "restaurant"]},
		)
		request.return_value = response
		host = SimpleNamespace(endpoint="http://172.18.0.1:8769", get_password=lambda _: "x" * 32)
		client = DockerControlClient(host)
		self.assertIsNotNone(getattr(client, "available_apps", None))

		self.assertEqual(client.available_apps(), ["accounts", "restaurant"])
		self.assertEqual(request.call_args.args[:2], ("GET", "http://172.18.0.1:8769/v1/available-apps"))

	@patch("press.docker_control.client.requests.request")
	def test_site_admins_uses_private_read_only_endpoint_for_fixed_site(self, request):
		response = SimpleNamespace(
			status_code=200,
			json=lambda: {"domain": "dehati.ir", "admins": [{"email": "manager@example.com", "full_name": "Manager"}]},
		)
		request.return_value = response
		host = SimpleNamespace(endpoint="http://172.18.0.1:8769", get_password=lambda _: "x" * 32)

		result = DockerControlClient(host).site_admins("dehati.ir")

		self.assertEqual(result["domain"], "dehati.ir")
		self.assertEqual(request.call_args.args[:2], ("GET", "http://172.18.0.1:8769/v1/site-admins/dehati.ir"))
		self.assertEqual(request.call_args.kwargs["timeout"], (5, 30))

	def test_site_admins_rejects_unknown_site_before_network_access(self):
		host = SimpleNamespace(endpoint="http://172.18.0.1:8769", get_password=lambda _: "x" * 32)
		with patch("press.docker_control.client.requests.request") as request:
			with self.assertRaises(DockerControlError):
				DockerControlClient(host).site_admins("attacker.example")
		request.assert_not_called()

	@patch("press.docker_control.client.requests.request")
	def test_resources_uses_a_short_read_only_endpoint(self, request):
		response = SimpleNamespace(
			status_code=200,
			json=lambda: {"protocol_version": 1, "resources": {"disk_free_bytes": 123}},
		)
		request.return_value = response
		host = SimpleNamespace(endpoint="http://172.18.0.1:8769", get_password=lambda _: "x" * 32)

		result = DockerControlClient(host).resources()

		self.assertEqual(result, {"protocol_version": 1, "resources": {"disk_free_bytes": 123}})
		self.assertEqual(request.call_args.args[:2], ("GET", "http://172.18.0.1:8769/v1/resources"))
		self.assertLessEqual(request.call_args.kwargs["timeout"][1], 10)

	@patch("press.docker_control.client.requests.request")
	def test_site_subscription_uses_a_nonpersistent_private_endpoint(self, request):
		response = SimpleNamespace(
			status_code=200,
			json=lambda: {"site": "veederakht.ir", "app": "accounts", "enabled": True},
		)
		request.return_value = response
		host = SimpleNamespace(endpoint="http://172.18.0.1:8769", get_password=lambda _: "x" * 32)

		result = DockerControlClient(host).set_site_subscription("veederakht.ir", "accounts", "a" * 40)

		self.assertEqual(result["enabled"], True)
		self.assertEqual(request.call_args.args[:2], ("POST", "http://172.18.0.1:8769/v1/site-subscription"))
		self.assertEqual(
			request.call_args.kwargs["data"],
			b'{"app":"accounts","secret_key":"' + b"a" * 40 + b'","site":"veederakht.ir"}',
		)
		self.assertEqual(request.call_args.kwargs["timeout"], (5, 30))

	def test_site_subscription_rejects_unknown_site_app_and_key_before_network_access(self):
		host = SimpleNamespace(endpoint="http://172.18.0.1:8769", get_password=lambda _: "x" * 32)
		client = DockerControlClient(host)
		for site, app, secret in (
			("attacker.example", "accounts", "a" * 40),
			("veederakht.ir", "unknown", "a" * 40),
			("veederakht.ir", "accounts", "invalid"),
		):
			with self.subTest(site=site, app=app), self.assertRaises(DockerControlError):
				client.set_site_subscription(site, app, secret)

	@patch("press.docker_control.client.requests.request")
	def test_site_addon_subscription_uses_dedicated_private_endpoint(self, request):
		response = SimpleNamespace(
			status_code=200,
			json=lambda: {"site": "veederakht.ir", "addon_id": "internal_chat", "enabled": True},
		)
		request.return_value = response
		host = SimpleNamespace(endpoint="http://172.18.0.1:8769", get_password=lambda _: "x" * 32)

		result = DockerControlClient(host).set_site_addon_subscription("veederakht.ir", "internal_chat", "f" * 40)

		self.assertEqual(result, {"site": "veederakht.ir", "addon_id": "internal_chat", "enabled": True})
		self.assertEqual(
			request.call_args.args[:2],
			("POST", "http://172.18.0.1:8769/v1/site-addon-subscription"),
		)
		self.assertEqual(
			request.call_args.kwargs["data"],
			b'{"addon_id":"internal_chat","secret_key":"' + b"f" * 40 + b'","site":"veederakht.ir"}',
		)
		self.assertEqual(request.call_args.kwargs["timeout"], (5, 30))

	def test_site_addon_subscription_rejects_untrusted_values_before_network_access(self):
		host = SimpleNamespace(endpoint="http://172.18.0.1:8769", get_password=lambda _: "x" * 32)
		client = DockerControlClient(host)
		for site, addon_id, secret in (
			("attacker.example", "assistant_ai", "a" * 40),
			("veederakht.ir", "accounts", "a" * 40),
			("veederakht.ir", "assistant_ai", "invalid"),
		):
			with self.subTest(site=site, addon_id=addon_id), patch(
				"press.docker_control.client.requests.request"
			) as request, self.assertRaises(DockerControlError):
				client.set_site_addon_subscription(site, addon_id, secret)
			request.assert_not_called()

	@patch("press.docker_control.client.requests.request")
	def test_site_subscription_accepts_a_valid_asumi_tenant(self, request):
		response = SimpleNamespace(
			status_code=200,
			json=lambda: {"site": "cafe.asumi.ir", "app": "restaurant", "enabled": True},
		)
		request.return_value = response
		host = SimpleNamespace(endpoint="http://172.18.0.1:8769", get_password=lambda _: "x" * 32)

		result = DockerControlClient(host).set_site_subscription("cafe.asumi.ir", "restaurant", "a" * 40)

		self.assertEqual(result["site"], "cafe.asumi.ir")
		self.assertEqual(request.call_count, 1)

	@patch("press.docker_control.client.requests.request")
	def test_hosted_site_creation_uses_only_the_fixed_asumi_domain_and_safe_apps(self, request):
		response = SimpleNamespace(
			status_code=202,
			json=lambda: {"operation_id": "12345678-1234-4abc-8def-1234567890ab", "status": "Accepted"},
		)
		request.return_value = response
		host = SimpleNamespace(endpoint="http://172.18.0.1:8769", get_password=lambda _: "x" * 32)

		result = DockerControlClient(host).create_hosted_site(
			"12345678-1234-4abc-8def-1234567890ab",
			"shop.asumi.ir",
			["accounts"],
			"a-long-generated-one-time-password",
		)

		self.assertEqual(result["status"], "Accepted")
		self.assertEqual(request.call_args.args[:2], ("POST", "http://172.18.0.1:8769/v1/operations"))
		self.assertIn(b'"action":"create_hosted_site"', request.call_args.kwargs["data"])
		self.assertIn(b'"target":"shop.asumi.ir"', request.call_args.kwargs["data"])

	def test_hosted_site_creation_rejects_untrusted_domains_and_apps_before_network_access(self):
		host = SimpleNamespace(endpoint="http://172.18.0.1:8769", get_password=lambda _: "x" * 32)
		client = DockerControlClient(host)
		for site, apps in (("shop.example.com", ["accounts"]), ("asumi.ir", []), ("shop.asumi.ir", ["unknown"])):
			with self.subTest(site=site, apps=apps), self.assertRaises(DockerControlError):
				client.create_hosted_site(
					"12345678-1234-4abc-8def-1234567890ab",
					site,
					apps,
					"a-long-generated-one-time-password",
				)


if __name__ == "__main__":
	unittest.main()
