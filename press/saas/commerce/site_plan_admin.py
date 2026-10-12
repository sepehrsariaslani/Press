"""Validation shared by the Asumi Site Plan administration endpoints."""

from __future__ import annotations

import math
import re
from decimal import Decimal, InvalidOperation

from press.saas.commerce.pricing import normalize_price, normalize_zarinpal_price
from press.saas.commerce.service_delivery import normalize_site_plan_delivery_mode

SITE_PLAN_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{1,79}$")
SITE_PLAN_INTERVALS = {"Daily", "Monthly", "Annually"}
SITE_PLAN_LIMITS = (
	"max_database_usage",
	"max_storage_usage",
	"memory",
	"cpu_time_per_day",
)
SITE_PLAN_MATERIAL_FIELDS = (
	"price_inr",
	"price_usd",
	"price_irr",
	"interval",
	"enabled",
	"commerce_delivery_mode",
	*SITE_PLAN_LIMITS,
	"release_groups",
	"allowed_apps",
)


def _text(value, field: str, max_length: int, *, required: bool = False) -> str:
	if not isinstance(value, str):
		if value is None and not required:
			return ""
		raise ValueError(f"{field} معتبر نیست.")
	text = value.strip()
	if required and not text:
		raise ValueError(f"{field} را وارد کنید.")
	if len(text) > max_length:
		raise ValueError(f"{field} بیش از اندازه طولانی است.")
	return text


def _unique_names(values, field: str) -> list[str]:
	if values is None:
		return []
	if not isinstance(values, (list, tuple)):
		raise ValueError(f"فهرست {field} معتبر نیست.")
	names = []
	for value in values:
		if not isinstance(value, str) or not value.strip():
			raise ValueError(f"فهرست {field} معتبر نیست.")
		name = value.strip()
		if name not in names:
			names.append(name)
	return names


def _normalize_app_selection(release_groups, allowed_apps, available_apps_by_group):
	groups = _unique_names(release_groups, "گروه‌های انتشار")
	apps = _unique_names(allowed_apps, "برنامه‌های مجاز")
	if not isinstance(available_apps_by_group, dict):
		raise ValueError("فهرست گروه‌های انتشار معتبر نیست.")
	if any(group not in available_apps_by_group for group in groups):
		raise ValueError("یکی از گروه‌های انتشار دیگر فعال یا در دسترس نیست.")
	app_groups = groups or list(available_apps_by_group)
	group_apps = [
		{app for app in (available_apps_by_group.get(group) or []) if isinstance(app, str)}
		for group in app_groups
	]
	available_apps = set.intersection(*group_apps) if group_apps else set()
	if apps and any(app not in available_apps for app in apps):
		raise ValueError("یکی از برنامه‌های انتخاب‌شده روی گروه انتشار این پلن نصب نیست.")
	if apps and "frappe" not in available_apps:
		raise ValueError("برنامهٔ پایهٔ Frappe در گروه انتشار این پلن آماده نیست.")
	if apps and "frappe" not in apps:
		apps.insert(0, "frappe")
	return groups, apps


def _nonnegative_int(value, field: str) -> int:
	if isinstance(value, bool):
		raise ValueError(f"مقدار {field} معتبر نیست.")
	try:
		amount = Decimal(str(value))
	except (InvalidOperation, TypeError, ValueError):
		raise ValueError(f"مقدار {field} معتبر نیست.") from None
	if not amount.is_finite() or amount != amount.to_integral_value() or amount < 0 or amount > 2_147_483_647:
		raise ValueError(f"مقدار {field} معتبر نیست.")
	return int(amount)


def _nonnegative_float(value, field: str) -> float:
	if isinstance(value, bool):
		raise ValueError(f"مقدار {field} معتبر نیست.")
	try:
		amount = float(value)
	except (TypeError, ValueError, OverflowError):
		raise ValueError(f"مقدار {field} معتبر نیست.") from None
	if not math.isfinite(amount) or amount < 0 or amount > 1_000_000:
		raise ValueError(f"مقدار {field} معتبر نیست.")
	return amount


def _boolean(value, field: str) -> int:
	if value is True or value == 1 or value == "1":
		return 1
	if value is False or value == 0 or value == "0":
		return 0
	raise ValueError(f"وضعیت {field} معتبر نیست.")


def build_site_plan_draft(
	*,
	name,
	title,
	description,
	interval,
	delivery_mode,
	release_groups,
	allowed_apps,
	available_apps_by_group,
) -> dict:
	"""Build a safe, disabled hosting plan draft from administrator input."""
	name = _text(name, "شناسهٔ پلن", 80, required=True)
	if not SITE_PLAN_NAME_RE.fullmatch(name):
		raise ValueError("شناسهٔ پلن فقط می‌تواند شامل حروف انگلیسی، عدد، خط تیره و زیرخط باشد.")
	title = _text(title, "نام پلن", 140, required=True)
	description = _text(description, "توضیحات پلن", 140)
	if interval not in SITE_PLAN_INTERVALS:
		raise ValueError("دورهٔ پلن میزبانی معتبر نیست.")
	mode = normalize_site_plan_delivery_mode(delivery_mode)
	groups, apps = _normalize_app_selection(release_groups, allowed_apps, available_apps_by_group)

	return {
		"name": name,
		"document_type": "Site",
		"plan_title": title,
		"plan_description": description,
		"interval": interval,
		"enabled": 0,
		"commerce_delivery_mode": mode,
		"price_inr": 0,
		"price_usd": 0,
		"price_irr": 0,
		"cpu_time_per_day": 0,
		"max_database_usage": 0,
		"max_storage_usage": 0,
		"memory": 0,
		"disk": 0,
		"vcpu": 0,
		"instance_type": "",
		"is_trial_plan": 0,
		"legacy_plan": 0,
		"private_bench_support": 0,
		"allow_downgrading_from_other_plan": 1,
		"release_groups": [{"release_group": group} for group in groups],
		"allowed_apps": [{"app": app} for app in apps],
	}


def normalize_site_plan_admin_update(
	payload: dict,
	*,
	current: dict,
	has_orders: bool = False,
	available_apps_by_group: dict[str, list[str]] | None = None,
) -> dict:
	"""Validate edited prices, availability, delivery mode, and capacity limits."""
	if not isinstance(payload, dict) or not isinstance(current, dict):
		raise ValueError("تنظیمات پلن معتبر نیست.")

	def value(field, default=None):
		if field in payload and payload[field] is not None and payload[field] != "":
			return payload[field]
		return current.get(field, default)

	interval = value("interval", "Monthly")
	if interval not in SITE_PLAN_INTERVALS:
		raise ValueError("دورهٔ پلن میزبانی معتبر نیست.")
	mode = normalize_site_plan_delivery_mode(
		value("delivery_mode", current.get("commerce_delivery_mode"))
	)
	values = {
		"price_inr": normalize_price(value("price_inr", 0), "INR"),
		"price_usd": normalize_price(value("price_usd", 0), "USD"),
		"price_irr": normalize_zarinpal_price(value("price_irr", 0)),
		"interval": interval,
		"enabled": _boolean(value("enabled", 0), "فعال‌بودن پلن"),
		"commerce_delivery_mode": mode,
		"max_database_usage": _nonnegative_int(value("max_database_usage", 0), "سقف پایگاه داده"),
		"max_storage_usage": _nonnegative_int(value("max_storage_usage", 0), "سقف فضا"),
		"memory": _nonnegative_int(value("memory", 0), "سقف حافظه"),
		"cpu_time_per_day": _nonnegative_float(value("cpu_time_per_day", 0), "سقف پردازنده"),
	}
	if "release_groups" in payload or "allowed_apps" in payload:
		requested_groups = _unique_names(payload.get("release_groups", current.get("release_groups", [])), "گروه‌های انتشار")
		requested_apps = _unique_names(payload.get("allowed_apps", current.get("allowed_apps", [])), "برنامه‌های مجاز")
		current_groups = _unique_names(current.get("release_groups", []), "گروه‌های انتشار")
		current_apps = _unique_names(current.get("allowed_apps", []), "برنامه‌های مجاز")
		if requested_groups != current_groups or requested_apps != current_apps:
			groups, apps = _normalize_app_selection(
				requested_groups,
				requested_apps,
				available_apps_by_group,
			)
			values["release_groups"] = groups
			values["allowed_apps"] = apps
	was_enabled = _boolean(current.get("enabled", 0) or 0, "فعال‌بودن پلن")
	if values["enabled"] and not was_enabled:
		if values["price_irr"] < 10_000:
			raise ValueError("برای فعال‌کردن پلن میزبانی، قیمت ریالی باید حداقل ۱۰٬۰۰۰ ریال باشد.")
		if (
			values["max_database_usage"] <= 0
			or values["max_storage_usage"] <= 0
			or values["memory"] <= 0
		):
			raise ValueError("برای فعال‌کردن پلن، سقف پایگاه داده، فضای ذخیره‌سازی و حافظه را بیشتر از صفر تنظیم کنید.")

	material_change = any(
		values.get(field, current.get(field, 0 if field != "commerce_delivery_mode" else "Upgrade Existing Site"))
		!= current.get(field, 0 if field != "commerce_delivery_mode" else "Upgrade Existing Site")
		for field in SITE_PLAN_MATERIAL_FIELDS
	)
	if has_orders and material_change:
		raise ValueError("تا پایان سفارش یا اشتراک فعال، قیمت، ظرفیت و روش تحویل این پلن را تغییر ندهید.")
	return {"values": values, "material_change": material_change}
