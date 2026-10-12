from __future__ import annotations

from urllib.parse import quote

import frappe
from frappe import _

from press.saas.commerce.order_lifecycle import (
	customer_provisioning_message,
	refund_order_update,
	transition_order,
)
from press.saas.commerce.order_snapshot import marketplace_app_order_snapshot
from press.saas.commerce.periods import period_end
from press.saas.commerce.pricing import normalize_interval, normalize_price, normalize_zarinpal_price
from press.saas.commerce.service_delivery import normalize_site_plan_delivery_mode
from press.saas.commerce.zarinpal import (
	build_payment_request,
	checkout_url,
	create_payment,
	get_payment_authority,
	get_payment_reference,
	payment_is_verified,
	verify_payment,
)
from press.utils import get_current_team, has_role, is_user_part_of_team


def _get_settings():
	if not frappe.db.exists("DocType", "Commerce Settings"):
		return None
	return frappe.get_doc("Commerce Settings")


def _merchant_id(settings) -> str | None:
	if not settings:
		return None
	try:
		return settings.get_password("merchant_id", raise_exception=False) or None
	except Exception:
		return None


def _checkout_enabled(settings) -> bool:
	return bool(
		settings
		and settings.enabled
		and settings.allow_marketplace_app_sales
		and _merchant_id(settings)
	)


def _require_commerce_admin():
	if not (has_role("System Manager") or has_role("Press Admin")):
		frappe.throw(_("Only a Press system administrator can manage commerce."), frappe.PermissionError)


@frappe.whitelist()
def checkout_status() -> dict:
	"""Return public configuration state without exposing gateway credentials."""
	settings = _get_settings()
	return {
		"enabled": _checkout_enabled(settings),
		"sandbox_mode": bool(settings and settings.sandbox_mode),
		"currency": "IRR",
	}


@frappe.whitelist()
def my_purchase_sites() -> list[dict]:
	if frappe.session.user == "Guest":
		frappe.throw(_("Please sign in to purchase an app plan."), frappe.AuthenticationError)
	team = get_current_team()
	return frappe.get_all(
		"Site",
		filters={"team": team, "status": "Active"},
		fields=["name", "subdomain", "domain"],
		order_by="name asc",
		limit_page_length=100,
		ignore_permissions=True,
	)


@frappe.whitelist()
def available_app_plans(site: str) -> dict:
	if frappe.session.user == "Guest":
		frappe.throw(_("Please sign in to purchase an app plan."), frappe.AuthenticationError)
	team = get_current_team(get_doc=True)
	site_values = frappe.db.get_value("Site", site, ["name", "team", "status"], as_dict=True)
	if not site_values or site_values.team != team.name or site_values.status != "Active":
		frappe.throw(_("سایت انتخاب‌شده فعال نیست یا به این حساب تعلق ندارد."), frappe.PermissionError)
	settings = _get_settings()
	app_names = frappe.get_all("Site App", filters={"parent": site, "parenttype": "Site"}, pluck="app")
	apps = frappe.get_all(
		"Marketplace App",
		filters={"app": ["in", app_names or [""]], "status": "Published"},
		fields=["name", "app", "title", "route"],
	)
	app_by_name = {app.name: app for app in apps}
	plans = frappe.get_all(
		"Marketplace App Plan",
		filters={"app": ["in", list(app_by_name) or [""]], "enabled": 1, "price_irr": [">", 0]},
		fields=["name", "app", "title", "interval", "price_irr"],
		order_by="price_irr asc",
	)
	for plan in plans:
		app = app_by_name.get(plan.app)
		plan.update({"app_title": app.title, "app_route": app.route})
	return {
		"site": site,
		"plans": plans,
		"checkout_enabled": _checkout_enabled(settings),
		"message": "" if _checkout_enabled(settings) else "پرداخت آنلاین هنوز توسط مدیر آسومی پیکربندی نشده است.",
	}


@frappe.whitelist()
def start_marketplace_app_purchase(plan: str, site: str) -> dict:
	if frappe.session.user == "Guest":
		frappe.throw(_("Please sign in before purchasing an app plan."), frappe.AuthenticationError)
	team_doc = get_current_team(get_doc=True)
	if team_doc.user != frappe.session.user and not is_user_part_of_team(frappe.session.user, team_doc.name):
		frappe.throw(_("You do not have access to this team."), frappe.PermissionError)

	settings = _get_settings()
	merchant_id = _merchant_id(settings)
	if not _checkout_enabled(settings) or not merchant_id:
		frappe.throw(_("پرداخت آنلاین هنوز توسط مدیر آسومی پیکربندی نشده است."))

	plan_doc = frappe.get_doc("Marketplace App Plan", plan)
	app_doc = frappe.get_doc("Marketplace App", plan_doc.app)
	site_values = frappe.db.get_value("Site", site, ["name", "team", "status"], as_dict=True)
	if not site_values:
		frappe.throw(_("سایت انتخاب‌شده پیدا نشد."))
	installed_apps = frappe.get_all("Site App", filters={"parent": site, "parenttype": "Site"}, pluck="app")
	snapshot = marketplace_app_order_snapshot(
		plan_doc.as_dict(),
		app_doc.as_dict(),
		{**site_values, "installed_apps": installed_apps},
		{"name": team_doc.name, "currency": team_doc.currency},
		frappe.session.user,
	)
	active_plan = frappe.db.exists(
		"Subscription",
		{"site": site, "plan_type": "Marketplace App Plan", "plan": plan_doc.name, "enabled": 1},
	)
	active_commerce_plan = frappe.db.exists(
		"Commerce Order",
		{"site": site, "plan": plan_doc.name, "status": "Active"},
	)
	if active_plan and not active_commerce_plan:
		frappe.throw(_("این تعرفه همین حالا روی سایت شما فعال است."))
	pending_order = frappe.get_all(
		"Commerce Order",
		filters={
			"customer": frappe.session.user,
			"team": team_doc.name,
			"plan": plan_doc.name,
			"site": site,
			"status": "Pending Payment",
		},
		fields=["name", "authority", "sandbox_mode"],
		order_by="creation desc",
		limit_page_length=1,
		ignore_permissions=True,
	)
	if pending_order and pending_order[0].authority:
		return {
			"order": pending_order[0].name,
			"checkout_url": checkout_url(pending_order[0].authority, sandbox=bool(pending_order[0].sandbox_mode)),
		}
	if not frappe.db.exists("Currency", "IRR"):
		frappe.throw(_("واحد پول ریال در تنظیمات آسومی ثبت نشده است."))

	base_url = frappe.utils.get_url()
	callback_url = f"{base_url.rstrip('/')}/api/method/press.saas.commerce.api.zarinpal_callback"
	payload = build_payment_request(
		merchant_id=merchant_id,
		amount=snapshot["amount"],
		callback_url=callback_url,
		description=f"Asumi marketplace plan: {plan_doc.title or plan_doc.name}",
		email=frappe.session.user if "@" in frappe.session.user else None,
	)
	order = frappe.get_doc(
		{"doctype": "Commerce Order", **snapshot, "sandbox_mode": int(bool(settings.sandbox_mode))}
	).insert(ignore_permissions=True)
	try:
		response = create_payment(payload, sandbox=bool(settings.sandbox_mode))
		authority = get_payment_authority(response)
		if not authority:
			frappe.db.set_value(
				"Commerce Order",
				order.name,
				{"status": "Payment Failed", "payment_error": "درگاه درخواست پرداخت را نپذیرفت."},
			)
			frappe.throw(_("درگاه نتوانست درخواست پرداخت را ایجاد کند. لطفاً بعداً دوباره تلاش کنید."))
	except Exception:
		if frappe.db.get_value("Commerce Order", order.name, "status") == "Pending Payment":
			frappe.db.set_value(
				"Commerce Order",
				order.name,
				{"status": "Payment Failed", "payment_error": "ارتباط با درگاه پرداخت برقرار نشد."},
			)
			frappe.db.commit()
		raise

	frappe.db.set_value("Commerce Order", order.name, "authority", authority)
	return {
		"order": order.name,
		"checkout_url": checkout_url(authority, sandbox=bool(order.sandbox_mode)),
	}


@frappe.whitelist(allow_guest=True)
def zarinpal_callback():
	"""Verify a ZarinPal return using the stored order amount, never callback data."""
	authority = frappe.form_dict.get("Authority") or frappe.form_dict.get("authority")
	callback_status = frappe.form_dict.get("Status") or frappe.form_dict.get("status")
	order_name = frappe.db.get_value("Commerce Order", {"authority": authority}, "name") if authority else None
	if not order_name:
		return _redirect_to_orders("not-found")

	order = frappe.get_doc("Commerce Order", order_name, for_update=True)
	if order.status in {"Paid", "Provisioning", "Active", "Provisioning Failed"}:
		if order.status in {"Paid", "Provisioning Failed"}:
			frappe.enqueue(
				"press.saas.commerce.api.provision_paid_order",
				order_name=order.name,
				enqueue_after_commit=True,
			)
		return _redirect_to_orders(order.status.lower().replace(" ", "-"), order.name)
	if order.status != "Pending Payment":
		return _redirect_to_orders(order.status.lower().replace(" ", "-"), order.name)
	if callback_status != "OK":
		# A browser-controlled callback query is not evidence that the payment
		# failed. Leave the order retryable; only a verified response can mutate it.
		return _redirect_to_orders("cancelled", order.name)

	settings = _get_settings()
	merchant_id = _merchant_id(settings)
	if not merchant_id:
		frappe.log_error("Commerce payment callback received while gateway settings are unavailable", "Asumi Commerce")
		return _redirect_to_orders("verification-unavailable", order.name)

	try:
		response = verify_payment(
			merchant_id=merchant_id,
			amount=int(order.amount),
			authority=authority,
			sandbox=bool(order.sandbox_mode),
		)
	except Exception:
		frappe.log_error("ZarinPal verification request failed", "Asumi Commerce")
		return _redirect_to_orders("verification-unavailable", order.name)

	if not payment_is_verified(response):
		order.db_set("payment_error", "درگاه پرداخت، واریز مبلغ سفارش را تأیید نکرد.")
		return _redirect_to_orders("not-verified", order.name)

	order.db_set(
		{
			"status": transition_order(order.status, "Paid"),
			"payment_reference": get_payment_reference(response),
			"paid_at": frappe.utils.now_datetime(),
			"payment_error": "",
		}
	)
	frappe.enqueue(
		"press.saas.commerce.api.provision_paid_order",
		order_name=order.name,
		enqueue_after_commit=True,
	)
	return _redirect_to_orders("paid", order.name)


def _redirect_to_orders(result: str, order: str | None = None):
	query = f"?payment={quote(result)}"
	if order:
		query += f"&order={quote(order)}"
	frappe.local.response["type"] = "redirect"
	frappe.local.response["location"] = f"/dashboard/orders{query}"
	return


def provision_paid_order(order_name: str):
	"""Idempotently apply a verified marketplace plan to its installed site."""
	order = frappe.get_doc("Commerce Order", order_name, for_update=True)
	if order.status not in {"Paid", "Provisioning Failed"}:
		return order.status
	new_status = transition_order(order.status, "Provisioning")
	order.db_set(
		{
			"status": new_status,
			"provisioning_attempts": (order.provisioning_attempts or 0) + 1,
			"provisioning_error": "",
		}
	)
	try:
		plan = frappe.get_doc("Marketplace App Plan", order.plan)
		app = frappe.get_doc("Marketplace App", order.marketplace_app)
		site = frappe.get_doc("Site", order.site)
		if not site or site.team != order.team or site.status != "Active":
			frappe.throw(_("سایت سفارش دیگر فعال یا متعلق به تیم سفارش نیست."))
		if not any(row.app == app.app for row in site.apps):
			frappe.throw(_("برنامهٔ خریداری‌شده دیگر روی سایت نصب نیست."))
		if (
			plan.app != app.name
			or not plan.enabled
			or int(plan.price_irr or 0) != int(order.amount)
			or plan.interval != order.interval
		):
			frappe.throw(_("مشخصات تعرفه با مبلغ ثبت‌شدهٔ سفارش تطابق ندارد."))

		subscription = _get_app_subscription(order, app)
		if subscription:
			subscription.plan = plan.name
			subscription.enabled = 1
			subscription.team = order.team
			subscription.save(ignore_permissions=True)
		else:
			subscription = frappe.get_doc(
				{
					"doctype": "Subscription",
					"document_type": "Marketplace App",
					"document_name": app.app,
					"plan_type": "Marketplace App Plan",
					"plan": plan.name,
					"site": site.name,
					"team": order.team,
					"enabled": 1,
				}
			).insert(ignore_permissions=True)
		service_start = frappe.utils.now_datetime()
		previous_orders = frappe.get_all(
			"Commerce Order",
			filters={
				"site": order.site,
				"marketplace_app": order.marketplace_app,
				"plan": order.plan,
				"status": "Active",
				"service_ends_at": [">", service_start],
			},
			fields=["service_ends_at"],
			order_by="service_ends_at desc",
			limit_page_length=1,
			ignore_permissions=True,
		)
		if previous_orders:
			service_start = previous_orders[0].service_ends_at
		service_end = period_end(service_start, order.interval)
		order.db_set(
			{
				"status": transition_order("Provisioning", "Active"),
				"subscription": subscription.name,
				"service_starts_at": service_start,
				"service_ends_at": service_end,
				"provisioning_error": "",
			}
		)
	except Exception as error:
		order.db_set(
			{
				"status": transition_order("Provisioning", "Provisioning Failed"),
				"provisioning_error": str(error)[:500],
			}
		)
		frappe.log_error(f"Commerce order {order.name} provisioning failed: {error}", "Asumi Commerce")
		return order.status
	return order.status


def _get_app_subscription(order, app):
	rows = frappe.get_all(
		"Subscription",
		filters={
			"site": order.site,
			"document_type": "Marketplace App",
			"plan_type": "Marketplace App Plan",
		},
		fields=["name", "plan", "document_name"],
		order_by="creation asc",
	)
	for row in rows:
		if row.document_name in {app.name, app.app}:
			return frappe.get_doc("Subscription", row.name)
		if row.plan and frappe.db.get_value("Marketplace App Plan", row.plan, "app") == app.name:
			return frappe.get_doc("Subscription", row.name)
	return None


def expire_commerce_orders():
	"""Disable paid app subscriptions once their purchased interval ends."""
	if not frappe.db.exists("DocType", "Commerce Order"):
		return
	now = frappe.utils.now_datetime()
	expired_orders = frappe.get_all(
		"Commerce Order",
		filters={"status": "Active", "service_ends_at": ["<=", now]},
		fields=["name", "site", "plan", "marketplace_app", "subscription"],
		limit_page_length=500,
		ignore_permissions=True,
	)
	for row in expired_orders:
		order = frappe.get_doc("Commerce Order", row.name, for_update=True)
		if order.status != "Active" or order.service_ends_at > now:
			continue
		subscription = frappe.get_doc("Subscription", order.subscription) if order.subscription else None
		if subscription and subscription.plan == order.plan:
			future_orders = frappe.get_all(
				"Commerce Order",
				filters={
					"site": order.site,
					"marketplace_app": order.marketplace_app,
					"plan": order.plan,
					"status": "Active",
					"service_ends_at": [">", now],
				},
				fields=["name"],
				limit_page_length=1,
				ignore_permissions=True,
			)
			if not future_orders:
				subscription.enabled = 0
				subscription.save(ignore_permissions=True)
		order.db_set("status", transition_order("Active", "Expired"))


@frappe.whitelist()
def my_orders(limit: int = 50) -> list[dict]:
	if frappe.session.user == "Guest":
		frappe.throw(_("Please sign in to view your orders."), frappe.AuthenticationError)
	team = get_current_team()
	rows = frappe.get_all(
		"Commerce Order",
		filters={"customer": frappe.session.user, "team": team},
		fields=["name", "status", "order_type", "plan", "interval", "marketplace_app", "site", "amount", "currency", "payment_reference", "paid_at", "service_starts_at", "service_ends_at", "authority", "sandbox_mode", "payment_error", "creation"],
		order_by="creation desc",
		limit_page_length=min(max(int(limit or 50), 1), 100),
		ignore_permissions=True,
	)
	for row in rows:
		row.provisioning_error = customer_provisioning_message(row.status)
		if row.status == "Pending Payment" and row.authority:
			row.checkout_url = checkout_url(row.authority, sandbox=bool(row.sandbox_mode))
		row.pop("authority", None)
		row.pop("sandbox_mode", None)
	return rows


@frappe.whitelist()
def admin_orders(limit: int = 100) -> list[dict]:
	_require_commerce_admin()
	return frappe.get_all(
		"Commerce Order",
		fields=["name", "status", "order_type", "plan", "interval", "marketplace_app", "site", "team", "customer", "amount", "currency", "payment_reference", "paid_at", "service_starts_at", "service_ends_at", "provisioning_attempts", "provisioning_error", "payment_error", "refund_reference", "refund_note", "refunded_at", "refunded_by", "creation"],
		order_by="creation desc",
		limit_page_length=min(max(int(limit or 100), 1), 200),
		ignore_permissions=True,
	)


@frappe.whitelist()
def retry_provisioning(order: str) -> dict:
	_require_commerce_admin()
	doc = frappe.get_doc("Commerce Order", order, for_update=True)
	if doc.status != "Provisioning Failed":
		frappe.throw(_("فقط سفارش‌های دارای خطای تحویل قابل تلاش مجدد هستند."))
	frappe.enqueue("press.saas.commerce.api.provision_paid_order", order_name=doc.name, enqueue_after_commit=True)
	return {"name": doc.name, "queued": True}


@frappe.whitelist()
def record_refund(order: str, refund_reference: str, refund_note: str = "") -> dict:
	"""Record a refund already completed through the payment provider dashboard."""
	_require_commerce_admin()
	doc = frappe.get_doc("Commerce Order", order, for_update=True)
	if doc.refund_reference:
		frappe.throw(_("بازپرداخت این سفارش قبلاً ثبت شده است."))

	try:
		refund_fields = refund_order_update(
			doc.status,
			refund_reference,
			refund_note,
			frappe.session.user,
			frappe.utils.now_datetime(),
		)
	except ValueError as error:
		frappe.throw(str(error))

	if doc.status == "Active" and doc.subscription:
		subscription = frappe.get_doc("Subscription", doc.subscription, for_update=True)
		if subscription.plan == doc.plan:
			other_active_orders = frappe.get_all(
				"Commerce Order",
				filters={
					"site": doc.site,
					"marketplace_app": doc.marketplace_app,
					"plan": doc.plan,
					"status": "Active",
					"service_ends_at": [">", frappe.utils.now_datetime()],
					"name": ["!=", doc.name],
				},
				fields=["name"],
				limit_page_length=1,
				ignore_permissions=True,
			)
			if not other_active_orders:
				subscription.enabled = 0
				subscription.save(ignore_permissions=True)

	doc.db_set(refund_fields)
	return {"name": doc.name, "status": "Refunded", "refund_reference": refund_fields["refund_reference"]}


@frappe.whitelist()
def admin_marketplace_plans() -> list[dict]:
	_require_commerce_admin()
	return frappe.get_all(
		"Marketplace App Plan",
		fields=[
			"name",
			"app",
			"app.title as app_title",
			"app.status as app_status",
			"title",
			"interval",
			"enabled",
			"price_inr",
			"price_usd",
			"price_irr",
		],
		order_by="app_title asc, title asc",
		limit_page_length=500,
		ignore_permissions=True,
	)


@frappe.whitelist()
def save_marketplace_plan_prices(
	plan: str,
	price_inr,
	price_usd,
	price_irr,
	title: str | None = None,
	enabled: bool | None = None,
	interval: str | None = None,
) -> dict:
	_require_commerce_admin()
	doc = frappe.get_doc("Marketplace App Plan", plan, for_update=True)
	active_subscriptions = frappe.db.count(
		"Subscription",
		{"document_type": "Marketplace App", "plan_type": "Marketplace App Plan", "plan": plan, "enabled": 1},
	)
	pending_orders = frappe.db.count(
		"Commerce Order",
		{"plan": plan, "status": ["in", ["Pending Payment", "Paid", "Provisioning", "Provisioning Failed"]]},
	)
	prices = {
		"price_inr": normalize_price(price_inr, "INR"),
		"price_usd": normalize_price(price_usd, "USD"),
		"price_irr": normalize_zarinpal_price(price_irr),
	}
	updated_interval = normalize_interval(interval, doc.interval)
	if (
		any(prices[field] != float(getattr(doc, field) or 0) for field in prices)
		or updated_interval != doc.interval
	) and (active_subscriptions or pending_orders):
		frappe.throw(_("این تعرفه مشترک فعال دارد؛ برای تغییر قیمت، تعرفهٔ جدید بسازید."))
	doc.update(prices)
	doc.interval = updated_interval
	if title is not None:
		doc.title = title.strip()[:140]
	if enabled is not None:
		doc.enabled = int(frappe.utils.cint(enabled))
	doc.save(ignore_permissions=True)
	return {
		"name": doc.name,
		"price_inr": doc.price_inr,
		"price_usd": doc.price_usd,
		"price_irr": doc.price_irr,
		"interval": doc.interval,
	}


@frappe.whitelist()
def admin_site_plans() -> list[dict]:
	_require_commerce_admin()
	plans = frappe.get_all(
		"Site Plan",
		filters={"document_type": "Site"},
		fields=[
			"name",
			"plan_title",
			"plan_description",
			"enabled",
			"interval",
			"price_inr",
			"price_usd",
			"price_irr",
			"commerce_delivery_mode",
		],
		order_by="plan_title asc",
		limit_page_length=500,
		ignore_permissions=True,
	)
	for plan in plans:
		plan.commerce_delivery_mode = normalize_site_plan_delivery_mode(plan.commerce_delivery_mode)
	return plans


@frappe.whitelist()
def save_site_plan_prices(
	plan: str,
	price_inr,
	price_usd,
	price_irr,
	delivery_mode: str | None = None,
) -> dict:
	_require_commerce_admin()
	doc = frappe.get_doc("Site Plan", plan, for_update=True)
	if doc.document_type != "Site":
		frappe.throw(_("این تعرفه برای فروش سرویس میزبانی نیست."))
	prices = {
		"price_inr": normalize_price(price_inr, "INR"),
		"price_usd": normalize_price(price_usd, "USD"),
		"price_irr": normalize_zarinpal_price(price_irr),
	}
	active_subscriptions = frappe.db.count("Subscription", {"document_type": "Site", "plan": plan, "enabled": 1})
	pending_orders = frappe.db.count(
		"Commerce Order",
		{"plan": plan, "status": ["in", ["Pending Payment", "Paid", "Provisioning", "Provisioning Failed"]]},
	)
	if any(prices[field] != float(getattr(doc, field) or 0) for field in prices) and (active_subscriptions or pending_orders):
		frappe.throw(_("این تعرفه مشترک فعال دارد؛ برای تغییر قیمت، تعرفهٔ جدید بسازید."))
	doc.update(prices)
	if delivery_mode is not None:
		try:
			doc.commerce_delivery_mode = normalize_site_plan_delivery_mode(delivery_mode)
		except ValueError as error:
			frappe.throw(str(error))
	doc.save(ignore_permissions=True)
	return {
		"name": doc.name,
		**prices,
		"commerce_delivery_mode": normalize_site_plan_delivery_mode(doc.commerce_delivery_mode),
	}


@frappe.whitelist()
def admin_settings() -> dict:
	_require_commerce_admin()
	settings = _get_settings()
	return {
		"enabled": bool(settings and settings.enabled),
		"allow_marketplace_app_sales": bool(settings and settings.allow_marketplace_app_sales),
		"sandbox_mode": bool(settings is None or settings.sandbox_mode),
		"merchant_id_configured": bool(_merchant_id(settings)),
	}


@frappe.whitelist()
def save_admin_settings(
	enabled: bool,
	allow_marketplace_app_sales: bool,
	sandbox_mode: bool,
	merchant_id: str | None = None,
) -> dict:
	_require_commerce_admin()
	settings = _get_settings() or frappe.get_doc({"doctype": "Commerce Settings"})
	settings.enabled = int(frappe.utils.cint(enabled))
	settings.allow_marketplace_app_sales = int(frappe.utils.cint(allow_marketplace_app_sales))
	settings.sandbox_mode = int(frappe.utils.cint(sandbox_mode))
	if merchant_id:
		if len(merchant_id.strip()) > 100:
			frappe.throw(_("شناسهٔ پذیرنده معتبر نیست."))
		current_merchant_id = _merchant_id(settings)
		if current_merchant_id and current_merchant_id != merchant_id.strip() and frappe.db.count(
			"Commerce Order", {"status": "Pending Payment"}
		):
			frappe.throw(_("تا تعیین تکلیف پرداخت‌های در انتظار، شناسهٔ پذیرنده را تغییر ندهید."))
		settings.merchant_id = merchant_id.strip()
	if settings.is_new():
		settings.insert(ignore_permissions=True)
	else:
		settings.save(ignore_permissions=True)
	return admin_settings()
