from __future__ import annotations

import hashlib
import hmac
import json
import re
import secrets
import time
from urllib.parse import urlsplit

import requests

AGENT_HOST = "172.18.0.1"


class DockerControlError(Exception):
	pass


class DockerControlClient:
	def __init__(self, host, hmac_key: str | None = None):
		self.endpoint = host.endpoint.rstrip("/")
		parsed = urlsplit(self.endpoint)
		if parsed.scheme != "http" or parsed.hostname != AGENT_HOST or parsed.port != 8769:
			raise DockerControlError("نشانی عامل خصوصی نامعتبر است.")
		try:
			self.key = (hmac_key if hmac_key is not None else host.get_password("hmac_key")).encode("utf-8")
		except Exception as error:
			raise DockerControlError("کلید امن عامل در دسترس نیست.") from error
		if len(self.key) < 32:
			raise DockerControlError("کلید امن عامل نامعتبر است.")

	def request(
		self, method: str, path: str, payload: dict | None = None, timeout: tuple[int, int] = (5, 120)
	) -> dict:
		body = (
			json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
			if payload is not None
			else b""
		)
		timestamp = str(int(time.time()))
		nonce = secrets.token_urlsafe(24)
		canonical = "\n".join(
			(method.upper(), path, timestamp, nonce, hashlib.sha256(body).hexdigest())
		).encode("utf-8")
		signature = hmac.new(self.key, canonical, hashlib.sha256).hexdigest()
		headers = {
			"X-Press-Timestamp": timestamp,
			"X-Press-Nonce": nonce,
			"X-Press-Signature": signature,
			"Content-Type": "application/json",
		}
		try:
			response = requests.request(
				method,
				f"{self.endpoint}{path}",
				data=body,
				headers=headers,
				timeout=timeout,
			)
			if not 200 <= response.status_code < 300:
				try:
					detail = response.json().get("error")
				except (ValueError, AttributeError):
					detail = None
				raise DockerControlError(str(detail)[:240] if detail else "عامل میزبان درخواست را نپذیرفت.")
			value = response.json()
			if not isinstance(value, dict):
				raise DockerControlError("پاسخ عامل میزبان نامعتبر است.")
			return value
		except requests.RequestException as error:
			raise DockerControlError("ارتباط امن با عامل میزبان برقرار نشد.") from error
		except ValueError as error:
			raise DockerControlError("پاسخ عامل میزبان قابل خواندن نیست.") from error

	def health(self, timeout: tuple[int, int] = (5, 15)) -> dict:
		return self.request("GET", "/v1/health", timeout=timeout)

	def resources(self) -> dict:
		return self.request("GET", "/v1/resources", timeout=(2, 5))

	def site_admins(self, domain: str) -> dict:
		if domain not in {"boller.ir", "dehati.ir", "denroom.ir", "veederakht.ir"}:
			raise DockerControlError("سایت برای همگام‌سازی مدیران مجاز نیست.")
		result = self.request("GET", f"/v1/site-admins/{domain}", timeout=(5, 30))
		if result.get("domain") != domain or not isinstance(result.get("admins"), list):
			raise DockerControlError("فهرست مدیران منبع معتبر نیست.")
		return result

	def set_site_subscription(self, site: str, app: str, secret_key: str | None) -> dict:
		"""Update one installed marketplace key without persisting the secret as an operation."""
		if site not in {"boller.ir", "dehati.ir", "denroom.ir", "veederakht.ir"}:
			raise DockerControlError("سایت برای به‌روزرسانی اشتراک مجاز نیست.")
		if not isinstance(app, str) or not re.fullmatch(r"[a-z][a-z0-9_]{0,63}", app):
			raise DockerControlError("برنامه برای به‌روزرسانی اشتراک مجاز نیست.")
		if secret_key is not None and not re.fullmatch(r"[a-f0-9]{40}", secret_key):
			raise DockerControlError("کلید اشتراک نامعتبر است.")
		result = self.request(
			"POST",
			"/v1/site-subscription",
			{"site": site, "app": app, "secret_key": secret_key},
			timeout=(5, 30),
		)
		if result != {"site": site, "app": app, "enabled": secret_key is not None}:
			raise DockerControlError("عامل میزبان نتیجهٔ به‌روزرسانی اشتراک را تأیید نکرد.")
		return result

	def inventory(self) -> dict:
		return self.request("GET", "/v1/inventory", timeout=(5, 360))

	def preflight_app_revision(self, app: str, revision: str) -> dict:
		return self.request("GET", f"/v1/preflight/{app}/{revision}", timeout=(5, 360))

	def submit(self, operation_id: str, action: str, target: str | None, arguments: dict) -> dict:
		return self.request(
			"POST",
			"/v1/operations",
			{"operation_id": operation_id, "action": action, "target": target, "arguments": arguments},
			timeout=(5, 30),
		)

	def get_operation(self, operation_id: str) -> dict:
		return self.request("GET", f"/v1/operations/{operation_id}", timeout=(5, 30))
