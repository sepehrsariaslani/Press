from http.server import ThreadingHTTPServer
from threading import Thread
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import urlopen

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


if __name__ == "__main__":
	unittest.main()
