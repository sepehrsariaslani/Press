from types import SimpleNamespace
import unittest
from unittest.mock import patch

from press.docker_control.client import DockerControlClient


class DockerControlClientTest(unittest.TestCase):
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


if __name__ == "__main__":
	unittest.main()
