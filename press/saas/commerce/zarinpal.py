"""Small, strict HTTP client for the ZarinPal payment API."""

from __future__ import annotations

import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from press.saas.commerce.pricing import ZARINPAL_MINIMUM_AMOUNT_IRR

PRODUCTION_API = "https://api.zarinpal.com/pg/v4/payment"
SANDBOX_API = "https://sandbox.zarinpal.com/pg/v4/payment"
PRODUCTION_CHECKOUT = "https://www.zarinpal.com/pg/StartPay"
SANDBOX_CHECKOUT = "https://sandbox.zarinpal.com/pg/StartPay"


def build_payment_request(
	merchant_id: str,
	amount: int,
	callback_url: str,
	description: str,
	email: str | None = None,
	mobile: str | None = None,
) -> dict:
	"""Build a ZarinPal request using integer Rials and an HTTPS callback."""
	if not merchant_id or not isinstance(merchant_id, str):
		raise ValueError("A merchant ID is required")
	if isinstance(amount, bool) or not isinstance(amount, int) or amount < ZARINPAL_MINIMUM_AMOUNT_IRR:
		raise ValueError("The amount must be at least 10,000 integer Rials")
	parsed_callback = urlparse(callback_url)
	if parsed_callback.scheme != "https" or not parsed_callback.netloc:
		raise ValueError("The payment callback must use HTTPS")
	if not description:
		raise ValueError("A payment description is required")

	metadata = {}
	if email:
		metadata["email"] = email
	if mobile:
		metadata["mobile"] = mobile

	return {
		"merchant_id": merchant_id.strip(),
		"amount": amount,
		"callback_url": callback_url,
		"description": description[:255],
		"metadata": metadata,
	}


def get_payment_authority(response: dict) -> str | None:
	data = response.get("data", {}) if isinstance(response, dict) else {}
	if str(data.get("code")) != "100":
		return None
	authority = data.get("authority")
	return str(authority) if authority else None


def payment_is_verified(response: dict) -> bool:
	data = response.get("data", {}) if isinstance(response, dict) else {}
	return str(data.get("code")) in {"100", "101"} and bool(data.get("ref_id"))


def get_payment_reference(response: dict) -> str | None:
	data = response.get("data", {}) if isinstance(response, dict) else {}
	ref_id = data.get("ref_id")
	return str(ref_id) if ref_id is not None else None


def checkout_url(authority: str, sandbox: bool = False) -> str:
	base = SANDBOX_CHECKOUT if sandbox else PRODUCTION_CHECKOUT
	return f"{base}/{authority}"


def create_payment(payload: dict, sandbox: bool = False) -> dict:
	return _post("request.json", payload, sandbox)


def verify_payment(merchant_id: str, amount: int, authority: str, sandbox: bool = False) -> dict:
	return _post(
		"verify.json",
		{"merchant_id": merchant_id, "amount": amount, "authority": authority},
		sandbox,
	)


def _post(path: str, payload: dict, sandbox: bool) -> dict:
	api_base = SANDBOX_API if sandbox else PRODUCTION_API
	request = Request(
		f"{api_base}/{path}",
		data=json.dumps(payload).encode("utf-8"),
		headers={"Content-Type": "application/json", "Accept": "application/json"},
		method="POST",
	)
	try:
		with urlopen(request, timeout=15) as response:
			result = json.loads(response.read().decode("utf-8"))
	except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
		# The caller receives a safe message; gateway credentials and raw responses
		# are deliberately not included in logs or exception text.
		raise RuntimeError("ارتباط با درگاه پرداخت برقرار نشد") from error
	if not isinstance(result, dict):
		raise RuntimeError("پاسخ درگاه پرداخت معتبر نیست")
	return result
