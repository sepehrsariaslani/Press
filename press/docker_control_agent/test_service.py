from http.server import ThreadingHTTPServer
from threading import Thread
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import json
import tempfile
from pathlib import Path

from press.docker_control_agent.auth import AuthenticationError
from press.docker_control_agent.service import ControlHandler


class ResourcesEndpointTest(unittest.TestCase):
	def test_resources_endpoint_returns_fast_capacity_payload(self):
		server = ThreadingHTTPServer(("127.0.0.1", 0), ControlHandler)
		server.control_config = SimpleNamespace()
		server.operation_manager = SimpleNamespace()
		thread = Thread(target=server.serve_forever, daemon=True)
		thread.start()
		try:
			with (
				patch.object(ControlHandler, "_authenticate"),
				patch(
					"press.docker_control_agent.service.get_resources",
					return_value={"protocol_version": 1, "resources": {"disk_free_bytes": 123}},
					create=True,
				),
			):
				try:
					response = urlopen(f"http://127.0.0.1:{server.server_port}/v1/resources", timeout=2)
				except HTTPError as error:
					self.fail(f"resources endpoint returned HTTP {error.code}")
					self.assertEqual(response.status, 200)
					self.assertEqual(response.headers.get("Cache-Control"), "no-store")
					self.assertEqual(response.read(), b'{"protocol_version":1,"resources":{"disk_free_bytes":123}}')
		finally:
			server.shutdown()
			server.server_close()
			thread.join(timeout=2)

	def test_site_subscription_endpoint_does_not_return_or_persist_the_key_as_an_operation(self):
		with tempfile.TemporaryDirectory() as temporary_directory:
			sites_root = Path(temporary_directory)
			site_path = sites_root / "veederakht.ir"
			site_path.mkdir()
			config_path = site_path / "site_config.json"
			config_path.write_text('{"db_name":"site_db"}', encoding="utf-8")
			server = ThreadingHTTPServer(("127.0.0.1", 0), ControlHandler)
			server.control_config = SimpleNamespace(sites_root=sites_root)
			server.operation_manager = SimpleNamespace()
			thread = Thread(target=server.serve_forever, daemon=True)
			thread.start()
			secret_key = "b" * 40
			payload = json.dumps(
				{"site": "veederakht.ir", "app": "accounts", "secret_key": secret_key}
			).encode()
			request = Request(
				f"http://127.0.0.1:{server.server_port}/v1/site-subscription",
				data=payload,
				headers={"Content-Type": "application/json"},
				method="POST",
			)
			try:
				with (
					patch.object(ControlHandler, "_authenticate"),
					patch("press.docker_control_agent.service._installed_apps", return_value=["accounts"]),
				):
					response = urlopen(request, timeout=2)
					response_body = response.read()
				self.assertEqual(json.loads(response_body), {"site": "veederakht.ir", "app": "accounts", "enabled": True})
				self.assertNotIn(secret_key.encode(), response_body)
				self.assertEqual(json.loads(config_path.read_text(encoding="utf-8"))["sk_accounts"], secret_key)
				self.assertFalse((sites_root / "operations.db").exists())
			finally:
				server.shutdown()
				server.server_close()
				thread.join(timeout=2)

	def test_site_admins_endpoint_returns_only_the_requested_allowlisted_site(self):
		server = ThreadingHTTPServer(("127.0.0.1", 0), ControlHandler)
		server.control_config = SimpleNamespace()
		server.operation_manager = SimpleNamespace()
		thread = Thread(target=server.serve_forever, daemon=True)
		thread.start()
		payload = {"domain": "dehati.ir", "admins": [{"email": "manager@example.com", "full_name": "Manager"}]}
		try:
			with (
				patch.object(ControlHandler, "_authenticate"),
				patch("press.docker_control_agent.service.get_site_admins", return_value=payload),
			):
				response = urlopen(f"http://127.0.0.1:{server.server_port}/v1/site-admins/dehati.ir", timeout=2)
				self.assertEqual(response.status, 200)
				self.assertEqual(json.loads(response.read()), payload)
		finally:
			server.shutdown()
			server.server_close()
			thread.join(timeout=2)

	def test_site_admins_endpoint_rejects_unknown_domain_without_auth_or_query(self):
		server = ThreadingHTTPServer(("127.0.0.1", 0), ControlHandler)
		server.control_config = SimpleNamespace()
		server.operation_manager = SimpleNamespace()
		thread = Thread(target=server.serve_forever, daemon=True)
		thread.start()
		try:
			with (
				patch.object(ControlHandler, "_authenticate") as authenticate,
				patch("press.docker_control_agent.service.get_site_admins") as get_admins,
			):
				with self.assertRaises(HTTPError) as error:
					urlopen(f"http://127.0.0.1:{server.server_port}/v1/site-admins/attacker.example", timeout=2)
				self.assertEqual(error.exception.code, 404)
			authenticate.assert_not_called()
			get_admins.assert_not_called()
		finally:
			server.shutdown()
			server.server_close()
			thread.join(timeout=2)

	def test_site_admins_endpoint_requires_agent_authentication(self):
		server = ThreadingHTTPServer(("127.0.0.1", 0), ControlHandler)
		server.control_config = SimpleNamespace()
		server.operation_manager = SimpleNamespace()
		thread = Thread(target=server.serve_forever, daemon=True)
		thread.start()
		try:
			with (
				patch.object(ControlHandler, "_authenticate", side_effect=AuthenticationError),
				patch("press.docker_control_agent.service.get_site_admins") as get_admins,
			):
				with self.assertRaises(HTTPError) as error:
					urlopen(f"http://127.0.0.1:{server.server_port}/v1/site-admins/dehati.ir", timeout=2)
				self.assertEqual(error.exception.code, 401)
			get_admins.assert_not_called()
		finally:
			server.shutdown()
			server.server_close()
			thread.join(timeout=2)


if __name__ == "__main__":
	unittest.main()
