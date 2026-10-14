from __future__ import annotations

import hashlib
import hmac
import json
import re
import secrets
from datetime import datetime

import frappe

from press.saas.commerce.service_pricing import ADDON_OFFER_TITLES
from press.saas.commerce.periods import period_end

ADDON_IDS = {"assistant_ai", "internal_chat"}
SITE_TYPES = {"Site", "Docker Control Site"}
SECRET_KEY_PATTERN = re.compile(r"^[a-f0-9]{40}$")


class AddonSubscriptionSyncError(Exception):
	"""Raised when Press cannot write a paid add-on key to its target site."""


def generate_addon_secret_key() -> str:
	return secrets.token_hex(20)


def hash_addon_secret_key(secret_key: str) -> str:
	if not isinstance(secret_key, str) or not SECRET_KEY_PATTERN.fullmatch(secret_key):
		raise ValueError("addon subscription key is invalid")
	return hashlib.sha256(secret_key.encode("ascii")).hexdigest()


def addon_subscription_name(site_type: str, site_name: str, addon_id: str) -> str:
	if not isinstance(site_type, str) or site_type not in SITE_TYPES:
		raise ValueError("site_type is invalid")
	if not isinstance(site_name, str) or not site_name.strip():
		raise ValueError("site_name is required")
	if not isinstance(addon_id, str) or addon_id not in ADDON_IDS:
		raise ValueError("addon_id is invalid")
	identity = f"{site_type}:{site_name.strip()}:{addon_id}".encode("utf-8")
	return f"ASAI-{hashlib.sha256(identity).hexdigest()[:32]}"


def subscription_term(now: datetime, previous_end: datetime | None = None) -> tuple[datetime, datetime]:
	start = previous_end if previous_end and previous_end > now else now
	return start, period_end(start, "Monthly")


def evaluate_addon_access(
	status: str,
	*,
	secret_key: str | None = None,
	key_hash: str | None = None,
	subscription_status: str | None = None,
	sync_status: str | None = None,
	order_status: str | None = None,
	refund_reference: str | None = None,
	ends_at: datetime | str | None = None,
	now: datetime | None = None,
) -> dict[str, bool | str | None]:
	if status in {"Unconfigured", "Free"}:
		return {"enabled": True, "status": status, "expires_at": None}
	if status != "Paid":
		return {"enabled": False, "status": "Disabled", "expires_at": None}

	valid_key = False
	if isinstance(secret_key, str) and isinstance(key_hash, str) and re.fullmatch(r"[a-f0-9]{64}", key_hash):
		try:
			valid_key = hmac.compare_digest(hash_addon_secret_key(secret_key), key_hash)
		except ValueError:
			valid_key = False

	try:
		end = datetime.fromisoformat(ends_at) if isinstance(ends_at, str) else ends_at
	except ValueError:
		end = None
	enabled = bool(
		valid_key
		and subscription_status == "Active"
		and sync_status == "Synced"
		and order_status == "Active"
		and not refund_reference
		and isinstance(end, datetime)
		and isinstance(now, datetime)
		and end > now
	)
	return {
		"enabled": enabled,
		"status": "Paid",
		"expires_at": str(end) if enabled else None,
	}


def _order_addon_snapshot(order) -> dict:
	raw_snapshot = order.service_quote_snapshot
	try:
		snapshot = json.loads(raw_snapshot) if isinstance(raw_snapshot, str) else raw_snapshot
	except (TypeError, json.JSONDecodeError) as error:
		raise ValueError("addon order snapshot is invalid") from error
	if not isinstance(snapshot, dict) or snapshot.get("kind") != "account_addon":
		raise ValueError("order does not contain an Accounts add-on")
	addon_id = snapshot.get("addon_id")
	site_type = snapshot.get("site_type")
	site_name = snapshot.get("site_name")
	if not isinstance(addon_id, str) or addon_id not in ADDON_IDS:
		raise ValueError("addon order ID is invalid")
	name = addon_subscription_name(site_type, site_name, addon_id)
	expected_target = order.site if site_type == "Site" else order.docker_site
	price = snapshot.get("monthly_price_toman")
	if (
		not expected_target
		or expected_target != site_name
		or type(price) is not int
		or price < 10_000
		or price != int(order.service_amount_toman or 0)
		or int(order.amount or 0) != price * 10
	):
		raise ValueError("addon order target or amount does not match its snapshot")
	if (
		order.order_type != "Asumi Service"
		or order.status != "Provisioning"
		or order.provider != "ZarinPal"
		or not order.payment_reference
		or not order.paid_at
		or order.refund_reference
	):
		raise ValueError("addon order is not eligible for activation")
	return {
		"name": name,
		"addon_id": addon_id,
		"site_type": site_type,
		"site_name": site_name,
		"price_toman": price,
	}


def _row_value(row, field: str):
	return row.get(field) if isinstance(row, dict) else getattr(row, field, None)


def _valid_paid_addon_source_order(order, row, site_name: str, addon_id: str) -> bool:
	if (
		not order
		or order.get("status") != "Active"
		or order.get("refund_reference")
		or order.get("order_type") != "Asumi Service"
		or order.get("provider") != "ZarinPal"
		or not order.get("payment_reference")
		or not order.get("paid_at")
		or order.get("team") != _row_value(row, "team")
	):
		return False
	raw_snapshot = order.get("service_quote_snapshot")
	try:
		snapshot = json.loads(raw_snapshot) if isinstance(raw_snapshot, str) else raw_snapshot
	except (TypeError, json.JSONDecodeError):
		return False
	if not isinstance(snapshot, dict) or snapshot.get("kind") != "account_addon":
		return False
	price = snapshot.get("monthly_price_toman")
	expected_target = order.get("site") if _row_value(row, "site_type") == "Site" else order.get("docker_site")
	try:
		order_price = int(order.get("service_amount_toman") or 0)
		order_amount = int(order.get("amount") or 0)
	except (TypeError, ValueError):
		return False
	return bool(
		snapshot.get("addon_id") == addon_id
		and snapshot.get("site_type") == _row_value(row, "site_type")
		and snapshot.get("site_name") == site_name
		and expected_target == site_name
		and type(price) is int
		and price >= 10_000
		and price == order_price
		and order_amount == price * 10
	)


def _sync_standard_site_addon(subscription, secret_key: str | None) -> None:
	site = frappe.get_doc("Site", subscription.site_name)
	if site.team != subscription.team or site.status != "Active":
		raise ValueError("target site is no longer active or owned by the purchasing team")
	installed_apps = [_row_value(row, "app") for row in (site.apps or [])]
	if "accounts" not in installed_apps:
		raise ValueError("Accounts is not installed on the target site")
	config_key = f"asumi_addon_{subscription.addon_id}_key"
	configuration = [
		{"key": row.key, "value": row.value, "type": row.type}
		for row in (site.configuration or [])
		if row.key != config_key
	]
	if secret_key is not None:
		configuration.append({"key": config_key, "value": secret_key, "type": "String"})
	site.update_site_config(configuration)


def _sync_docker_site_addon(subscription, secret_key: str | None) -> None:
	site = frappe.get_doc("Docker Control Site", subscription.site_name)
	if site.team != subscription.team or not site.enabled or (site.hosted_status and site.hosted_status != "Active"):
		raise ValueError("target Docker site is no longer active or owned by the purchasing team")
	installed_apps = [_row_value(row, "app") for row in (site.apps or [])]
	if "accounts" not in installed_apps:
		raise ValueError("Accounts is not installed on the target Docker site")
	from press.api.docker_control import _client, _host_doc

	_client(_host_doc()).set_site_addon_subscription(subscription.site_name, subscription.addon_id, secret_key)


def sync_addon_subscription_key(subscription, secret_key: str | None) -> None:
	"""Write only the selected add-on key to its owned, active Accounts site."""
	if secret_key is not None:
		hash_addon_secret_key(secret_key)
	if subscription.site_type == "Site":
		_sync_standard_site_addon(subscription, secret_key)
	elif subscription.site_type == "Docker Control Site":
		_sync_docker_site_addon(subscription, secret_key)
	else:
		raise ValueError("subscription site type is invalid")


def _safe_sync_error(error: Exception, secret_key: str) -> str:
	message = str(error).replace(secret_key, "[redacted]").strip()
	return (message or "همگام‌سازی کلید افزونه ناموفق بود.")[:300]


def _acquire_addon_subscription_lock(name: str, timeout: int = 10) -> bool:
	"""Serialize renewals for one site/add-on pair until the request finishes."""
	lock_name = f"asumi-addon-subscription:{hashlib.sha256(name.encode()).hexdigest()[:40]}"
	db = frappe.db
	lock = db.sql("SELECT GET_LOCK(%s, %s)", (lock_name, timeout), as_list=True)
	if not lock or not lock[0] or lock[0][0] != 1:
		return False

	def release_lock():
		db.sql("SELECT RELEASE_LOCK(%s)", (lock_name,))

	db.after_commit.add(release_lock)
	db.after_rollback.add(release_lock)
	return True


def issue_or_extend_addon_subscription(order):
	"""Sync a fresh key, then persist an active one-month site subscription."""
	order_details = _order_addon_snapshot(order)
	name = order_details["name"]
	if not _acquire_addon_subscription_lock(name):
		raise AddonSubscriptionSyncError("ثبت یا تمدید این افزونه هم‌اکنون در حال انجام است؛ کمی بعد دوباره تلاش کنید.")
	existing = frappe.db.exists("Asumi Addon Subscription", name)
	subscription = frappe.get_doc("Asumi Addon Subscription", name) if existing else frappe.get_doc({"doctype": "Asumi Addon Subscription", "name": name})
	now = frappe.utils.now_datetime()
	previous_end = frappe.utils.get_datetime(subscription.ends_at) if existing and subscription.ends_at else None
	starts_at, ends_at = subscription_term(now, previous_end)
	secret_key = generate_addon_secret_key()
	values = {
		"team": order.team,
		"site_type": order_details["site_type"],
		"site_name": order_details["site_name"],
		"addon_id": order_details["addon_id"],
		"key_hash": hash_addon_secret_key(secret_key),
		"source_order": order.name,
		"status": "Provisioning",
		"starts_at": starts_at,
		"ends_at": ends_at,
		"sync_status": "Pending",
		"sync_error": "",
	}
	sync_target = frappe._dict(
		{
			"team": order.team,
			"site_type": order_details["site_type"],
			"site_name": order_details["site_name"],
			"addon_id": order_details["addon_id"],
		}
	)

	try:
		sync_addon_subscription_key(sync_target, secret_key)
	except Exception as error:
		safe_error = _safe_sync_error(error, secret_key)
		if not existing:
			for fieldname, value in values.items():
				setattr(subscription, fieldname, value)
			subscription.sync_status = "Failed"
			subscription.sync_error = safe_error
			subscription.insert(ignore_permissions=True)
		elif subscription.status != "Active":
			subscription.db_set({"sync_status": "Failed", "sync_error": safe_error})
		else:
			# Keep the previous active hash and term if a renewal key cannot be delivered.
			subscription.db_set({"sync_error": safe_error})
		raise AddonSubscriptionSyncError(safe_error) from error

	values.update({"status": "Active", "sync_status": "Synced", "sync_error": ""})
	for fieldname, value in values.items():
		setattr(subscription, fieldname, value)
	if existing:
		subscription.save(ignore_permissions=True)
	else:
		subscription.insert(ignore_permissions=True)
	return subscription


def check_addon_subscription(addon_id: str, site_name: str, secret_key: str, offer: dict) -> dict:
	"""Return only access state and expiry for one site/add-on key."""
	if not isinstance(addon_id, str) or addon_id not in ADDON_IDS:
		return {"enabled": False, "status": "Disabled", "expires_at": None}
	status = offer.get("status") if isinstance(offer, dict) else "Disabled"
	if status in {"Unconfigured", "Free"}:
		return evaluate_addon_access(status)
	if status != "Paid" or not isinstance(site_name, str) or not site_name.strip():
		return {"enabled": False, "status": "Disabled", "expires_at": None}

	try:
		hash_addon_secret_key(secret_key)
	except ValueError:
		return {"enabled": False, "status": "Paid", "expires_at": None}

	rows = frappe.get_all(
		"Asumi Addon Subscription",
		filters={"site_name": site_name, "addon_id": addon_id},
		fields=["team", "site_type", "key_hash", "status", "sync_status", "source_order", "ends_at"],
		limit_page_length=10,
		ignore_permissions=True,
	)
	now = frappe.utils.now_datetime()
	for row in rows:
		order = frappe.db.get_value(
			"Commerce Order",
			row.source_order,
			[
				"status", "refund_reference", "site", "docker_site", "order_type", "provider",
				"payment_reference", "paid_at", "team", "service_quote_snapshot", "service_amount_toman", "amount",
			],
			as_dict=True,
		) if row.source_order else None
		source_order_is_valid = _valid_paid_addon_source_order(order, row, site_name, addon_id)
		result = evaluate_addon_access(
			"Paid",
			secret_key=secret_key,
			key_hash=row.key_hash,
			subscription_status=row.status,
			sync_status=row.sync_status,
			order_status=order.get("status") if source_order_is_valid else None,
			refund_reference=order.get("refund_reference") if source_order_is_valid else "invalid-source-order",
			ends_at=row.ends_at,
			now=now,
		)
		if result["enabled"] and source_order_is_valid:
			return result
	return {"enabled": False, "status": "Paid", "expires_at": None}
