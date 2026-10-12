from __future__ import annotations

import argparse
import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

from . import __version__
from .auth import AuthenticationError, verify_request
from .config import CUSTOMER_SITES, MAX_BODY_BYTES, AgentConfig, load_config
from .inventory import get_inventory, get_resources, get_site_admins
from .operations import (
	OperationError,
	OperationManager,
	connect,
	preflight_app_revision,
	_installed_apps,
	write_site_subscription_key,
)
from .operations import (
	database as database_context,
)


class ControlHandler(BaseHTTPRequestHandler):
	server_version = "PressDockerControl/1"

	def log_message(self, format: str, *args) -> None:
		return

	@property
	def config(self) -> AgentConfig:
		return self.server.control_config

	@property
	def manager(self) -> OperationManager:
		return self.server.operation_manager

	def _read_body(self) -> bytes:
		try:
			length = int(self.headers.get("Content-Length", "0"))
		except ValueError as error:
			raise ValueError("Invalid request") from error
		if length < 0 or length > MAX_BODY_BYTES:
			raise ValueError("Invalid request")
		return self.rfile.read(length)

	def _authenticate(self, body: bytes, path: str) -> None:
		database = connect(self.config)
		try:
			verify_request(
				self.command,
				path,
				self.headers.get("X-Press-Timestamp", ""),
				self.headers.get("X-Press-Nonce", ""),
				body,
				self.headers.get("X-Press-Signature", ""),
				self.config.auth_key,
				database,
			)
		finally:
			database.close()

	def _send(self, status: int, payload: dict) -> None:
		body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
		self.send_response(status)
		self.send_header("Content-Type", "application/json; charset=utf-8")
		self.send_header("Content-Length", str(len(body)))
		self.send_header("Cache-Control", "no-store")
		self.end_headers()
		self.wfile.write(body)

	def _handle(self) -> None:  # noqa: C901
		parsed = urlsplit(self.path)
		if parsed.query or parsed.fragment:
			self._send(400, {"error": "Invalid request"})
			return
		path = parsed.path
		site_admins = re.fullmatch(
			r"/v1/site-admins/(boller\.ir|dehati\.ir|denroom\.ir|veederakht\.ir)", path
		)
		preflight = re.fullmatch(r"/v1/preflight/(accounts|restaurant)/([a-f0-9]{40})", path)
		if not site_admins and not preflight and path != "/v1/site-subscription" and not re.fullmatch(
			r"/v1/(health|inventory|resources|operations(?:/[a-f0-9-]{36,48})?)", path
		):
			self._send(404, {"error": "Not found"})
			return
		try:
			body = self._read_body() if self.command == "POST" else b""
			self._authenticate(body, path)
		except AuthenticationError:
			self._send(401, {"error": "Invalid authentication"})
			return
		except ValueError:
			self._send(400, {"error": "Invalid request"})
			return

		try:
			if self.command == "GET" and path == "/v1/health":
				self._send(200, {"status": "ok", "protocol_version": 1, "agent_version": __version__})
				return
			if self.command == "GET" and path == "/v1/inventory":
				self._send(200, get_inventory(self.config))
				return
			if self.command == "GET" and path == "/v1/resources":
				self._send(200, get_resources(self.config))
				return
			if self.command == "GET" and site_admins:
				self._send(200, get_site_admins(self.config, site_admins.group(1)))
				return
			if self.command == "GET" and preflight:
				self._send(200, preflight_app_revision(self.config, preflight.group(1), preflight.group(2)))
				return
			if self.command == "GET" and path.startswith("/v1/operations/"):
				self._send(200, self.manager.get(path.rsplit("/", 1)[-1]))
				return
			if self.command == "POST" and path == "/v1/site-subscription":
				try:
					payload = json.loads(body)
				except json.JSONDecodeError as error:
					raise ValueError("Invalid request") from error
				if not isinstance(payload, dict) or set(payload) != {"site", "app", "secret_key"}:
					raise ValueError("Invalid request")
				secret_key = payload.get("secret_key")
				if (
					payload.get("site") not in CUSTOMER_SITES
					or not isinstance(payload.get("app"), str)
					or not re.fullmatch(r"[a-z][a-z0-9_]{0,63}", payload.get("app", ""))
					or (
						secret_key is not None
						and (not isinstance(secret_key, str) or not re.fullmatch(r"[a-f0-9]{40}", secret_key))
					)
				):
					raise OperationError("Site, app, or subscription key is not allowed")
				installed_apps = _installed_apps(self.config, payload.get("site"))
				result = write_site_subscription_key(
					self.config.sites_root,
					payload.get("site"),
					payload.get("app"),
					secret_key,
					installed_apps=installed_apps,
				)
				self._send(200, result)
				return
			if self.command == "POST" and path == "/v1/operations":
				try:
					payload = json.loads(body)
				except json.JSONDecodeError as error:
					raise ValueError("Invalid request") from error
				if not isinstance(payload, dict):
					raise ValueError("Invalid request")
				result = self.manager.start(
					str(payload.get("operation_id", "")),
					str(payload.get("action", "")),
					payload.get("target"),
					payload.get("arguments", {}),
				)
				self._send(202, result)
				return
			self._send(405, {"error": "Method not allowed"})
		except OperationError as error:
			self._send(400, {"error": str(error)[:240]})
		except Exception:
			self._send(500, {"error": "Request failed"})

	def do_GET(self) -> None:
		self._handle()

	def do_POST(self) -> None:
		self._handle()


def serve(config: AgentConfig) -> None:
	with database_context(config) as connection:
		connection.execute("DELETE FROM consumed_nonces WHERE created_at < strftime('%s','now') - 300")
		connection.commit()
	server = ThreadingHTTPServer((config.bind_address, config.port), ControlHandler)
	server.daemon_threads = True
	server.control_config = config
	server.operation_manager = OperationManager(config)
	server.serve_forever(poll_interval=0.5)


def main() -> None:
	parser = argparse.ArgumentParser(description="Private Press Docker control agent")
	parser.add_argument("--config", required=True)
	args = parser.parse_args()
	serve(load_config(args.config))


if __name__ == "__main__":
	main()
