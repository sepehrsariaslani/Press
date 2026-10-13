"""Validation helpers for one-HostIran-VPS-per-customer hosting fulfillment."""

from __future__ import annotations

import re

from press.saas.commerce.service_delivery import normalize_site_plan_delivery_mode

SUBDOMAIN_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{3,30}[a-z0-9])$")
PRODUCT_CODE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$")
PLAN_INTERVALS = {"Monthly": "Monthly", "Annually": "Yearly"}


def validate_hostiran_fulfillment(order, plan, server, provider_reference: str) -> dict:
	"""Validate a real paid new-site order against its dedicated Press Server."""
	get_order = _getter(order)
	get_plan = _getter(plan)
	get_server = _getter(server)

	if get_order("status") not in {"Paid", "Provisioning Failed", "Provisioning"}:
		raise ValueError("فقط سفارش پرداخت‌شده را می‌توان به VPS اختصاصی متصل کرد.")
	if get_order("status") == "Provisioning" and get_order("hostiran_fulfillment_status") not in {
		"VPS Ready",
		"Deploying Bench",
		"Creating Site",
	}:
		raise ValueError("VPS سفارش هنوز برای شروع تحویل تأیید نشده است.")
	if (
		get_order("order_type") != "Hosting"
		or normalize_site_plan_delivery_mode(get_order("service_delivery_mode")) != "Create New Site"
		or get_order("provider") != "ZarinPal"
		or _truthy(get_order("sandbox_mode"))
		or not get_order("payment_reference")
		or not get_order("paid_at")
		or get_order("currency") != "IRR"
	):
		raise ValueError("سفارش باید با زرین‌پال در حالت واقعی پرداخت شده باشد.")
	if get_order("site") or get_order("docker_site"):
		raise ValueError("این سفارش قبلاً به یک سایت تحویل داده شده است.")
	if not isinstance(get_order("subdomain"), str) or not SUBDOMAIN_RE.fullmatch(get_order("subdomain")):
		raise ValueError("زیردامنهٔ سفارش معتبر نیست.")
	if get_order("plan") != get_plan("name"):
		raise ValueError("پلن سفارش با VPS اختصاصی مطابقت ندارد.")
	if (
		get_plan("document_type") != "Site"
		or not _truthy(get_plan("enabled"))
		or normalize_site_plan_delivery_mode(get_plan("commerce_delivery_mode")) != "Create New Site"
		or not _truthy(get_plan("dedicated_server_plan"))
		or not _truthy(get_plan("private_bench_support"))
	):
		raise ValueError("پلن فعلی برای ساخت سایت روی VPS اختصاصی آماده نیست.")
	try:
		plan_price = int(get_plan("price_irr") or 0)
		order_amount = int(get_order("amount") or 0)
		plan_cost = int(get_plan("hostiran_monthly_cost_irr") or 0)
		snapshot_cost = int(get_order("hostiran_monthly_cost_irr_snapshot") or 0)
		interval = PLAN_INTERVALS.get(get_plan("interval"))
	except (TypeError, ValueError, OverflowError):
		raise ValueError("مبلغ یا دورهٔ پلن VPS معتبر نیست.") from None
	product_code = str(get_plan("hostiran_product_code") or "").strip()
	if (
		plan_price < 10_000
		or plan_price != order_amount
		or interval != get_order("interval")
		or not PRODUCT_CODE_RE.fullmatch(product_code)
		or product_code != get_order("hostiran_product_code_snapshot")
		or plan_cost <= 0
		or plan_cost != snapshot_cost
	):
		raise ValueError("قیمت، SKU یا هزینهٔ ثبت‌شدهٔ پلن با snapshot سفارش تطابق ندارد.")
	if not isinstance(provider_reference, str):
		raise ValueError("شمارهٔ سفارش خرید هاست‌ایران معتبر نیست.")
	provider_reference = provider_reference.strip()
	if not provider_reference or len(provider_reference) > 120 or any(ord(char) < 32 for char in provider_reference):
		raise ValueError("شمارهٔ سفارش خرید هاست‌ایران معتبر نیست.")
	try:
		order_team = str(get_order("team") or "").strip()
		server_team = str(get_server("team") or "").strip()
		cluster = str(get_server("cluster") or "").strip()
		server_name = str(get_server("name") or "").strip()
	except (TypeError, ValueError):
		raise ValueError("مشخصات VPS در Press معتبر نیست.") from None
	if (
		not order_team
		or server_team != order_team
		or get_server("status") != "Active"
		or _truthy(get_server("public"))
		or not _truthy(get_server("is_server_setup"))
		or not _truthy(get_server("is_standalone"))
		or not _truthy(get_server("is_standalone_setup"))
		or not _truthy(get_server("is_self_hosted"))
		or not cluster
		or not server_name
		or (get_order("hostiran_server") and get_order("hostiran_server") != server_name)
	):
		raise ValueError("انتخاب کن یک VPS اختصاصی فعال و آمادهٔ همان تیم مشتری باشد.")

	return {
		"provider_reference": provider_reference,
		"product_code": product_code,
		"monthly_cost_irr": plan_cost,
		"server": server_name,
		"cluster": cluster,
	}


def is_verified_hostiran_deployment(order, deployment) -> bool:
	"""Allow Site Group Deploy to bypass native site quotas only for its paid order."""
	get_order = _getter(order)
	get_deployment = _getter(deployment)
	if not get_order("hostiran_server") or not get_order("hostiran_order_reference"):
		return False
	try:
		validate_hostiran_fulfillment(
			order,
			{
				"name": get_order("plan"),
				"enabled": 1,
				"document_type": "Site",
				"commerce_delivery_mode": "Create New Site",
				"dedicated_server_plan": 1,
				"private_bench_support": 1,
				"price_irr": get_order("amount"),
				"interval": {"Monthly": "Monthly", "Yearly": "Annually"}.get(get_order("interval")),
				"hostiran_product_code": get_order("hostiran_product_code_snapshot"),
				"hostiran_monthly_cost_irr": get_order("hostiran_monthly_cost_irr_snapshot"),
			},
			{
				"name": get_order("hostiran_server"),
				"team": get_order("team"),
				"status": "Active",
				"public": 0,
				"is_server_setup": 1,
				"is_standalone": 1,
				"is_standalone_setup": 1,
				"is_self_hosted": 1,
				"cluster": get_deployment("cluster"),
			},
			get_order("hostiran_order_reference"),
		)
	except (TypeError, ValueError):
		return False
	return bool(
		get_order("status") == "Provisioning"
		and get_order("hostiran_fulfillment_status") in {"VPS Ready", "Deploying Bench", "Creating Site"}
		and get_order("name") == get_deployment("commerce_order")
		and get_order("team") == get_deployment("team")
		and get_order("plan") == get_deployment("site_plan")
		and get_order("subdomain") == get_deployment("subdomain")
		and get_order("hostiran_server") == get_deployment("server")
	)


def _getter(value):
	return value.get if isinstance(value, dict) else lambda field: getattr(value, field, None)


def _truthy(value) -> bool:
	return value is True or value == 1 or value == "1"
