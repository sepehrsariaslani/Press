from __future__ import annotations

import hashlib
import json
import socket
import ssl
import time
from urllib.parse import quote

import frappe
from frappe import _

from press.saas.commerce.order_lifecycle import (
	customer_provisioning_message,
	refund_order_update,
	transition_order,
)
from press.saas.commerce.order_snapshot import (
	SITE_SUBDOMAIN_PATTERN,
	hosting_order_snapshot,
	marketplace_app_order_snapshot,
)
from press.saas.commerce.marketplace_plan_admin import build_marketplace_plan_draft
from press.saas.commerce.marketplace_install import (
	is_marketplace_app_sellable,
	marketplace_install_state,
	should_install_marketplace_app,
)
from press.saas.commerce.periods import period_end
from press.saas.commerce.provisioning_recovery import subscription_recovery_state
from press.saas.commerce.hosting_readiness import (
	build_hosting_readiness,
	hosting_capacity_reservations,
	hosting_plan_fits_capacity,
	normalize_capacity_reserve,
	resolve_ipv4,
	wildcard_dns_guidance,
)
from press.saas.commerce.checkout_access import checkout_available_for_actor, sale_enabled_for_settings
from press.saas.commerce.pricing import (
	ZARINPAL_MINIMUM_AMOUNT_IRR,
	marketplace_plan_supported_by_asumi_checkout,
	normalize_marketplace_app_plan_prices,
	normalize_interval,
	normalize_price,
	normalize_zarinpal_price,
)
from press.saas.commerce.service_delivery import (
	new_site_delivery_action,
	new_site_hosting_order_action,
	new_hosted_site_renewal_action,
	normalize_site_plan_delivery_mode,
)
from press.saas.commerce.dedicated_hosting import validate_hostiran_fulfillment
from press.saas.commerce.site_plan_admin import (
	HOSTIRAN_DEDICATED_VPS,
	build_site_plan_draft,
	normalize_site_plan_admin_update,
)
from press.saas.commerce.service_requests import (
	build_service_request_lead,
	normalize_service_request_status,
)
from press.saas.commerce.service_orders import build_service_order_snapshot
from press.saas.commerce.service_pricing import (
	calculate_service_quote,
	default_service_prices,
	normalize_service_prices,
)
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

ASUMI_ROOT_DOMAIN = "asumi.ir"
HOSTING_CAPACITY_ORDER_STATUSES = (
	"Pending Payment",
	"Paid",
	"Provisioning",
	"Provisioning Failed",
	"Active",
	"Expired",
)
HOSTING_CAPACITY_ORDER_LIMIT = 5000
MARKETPLACE_INSTALL_TIMEOUT_SECONDS = 10800
MARKETPLACE_INSTALL_POLL_SECONDS = 3
MARKETPLACE_PROVISION_TIMEOUT_SECONDS = MARKETPLACE_INSTALL_TIMEOUT_SECONDS * 2 + 300


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


def _hosting_access_email_ready(user: str | None = None) -> bool:
	if not frappe.db.exists("Email Account", {"enable_outgoing": 1}):
		return False
	if not user:
		return True
	email = frappe.db.get_value("User", user, "email")
	return isinstance(email, str) and "@" in email


def _checkout_enabled(settings, sale_type: str = "marketplace") -> bool:
	return bool(
		settings
		and settings.enabled
		and sale_enabled_for_settings(settings, sale_type)
		and _merchant_id(settings)
	)


def _has_commerce_admin_role() -> bool:
	return bool(has_role("System Manager") or has_role("Press Admin"))


def _checkout_available_for_user(settings, sale_type: str = "marketplace") -> bool:
	sandbox_mode = bool(settings and settings.sandbox_mode)
	return checkout_available_for_actor(
		enabled=bool(settings and settings.enabled),
		sale_enabled=sale_enabled_for_settings(settings, sale_type),
		merchant_id_configured=bool(_merchant_id(settings)),
		sandbox_mode=sandbox_mode,
		is_commerce_admin=not sandbox_mode or _has_commerce_admin_role(),
	)


def _sandbox_checkout_restricted(settings, sale_type: str = "marketplace") -> bool:
	return bool(
		settings
		and settings.sandbox_mode
		and _checkout_enabled(settings, sale_type)
		and not _has_commerce_admin_role()
	)


def _free_marketplace_purchase_enabled(settings) -> bool:
	return bool(settings and settings.enabled and settings.allow_marketplace_app_sales)


def _free_service_purchase_enabled(settings) -> bool:
	return bool(settings and settings.enabled and sale_enabled_for_settings(settings, "services"))


def _acquire_transaction_lock(lock_name: str, timeout: int = 10) -> bool:
	"""Hold a MySQL advisory lock until this request commits or rolls back."""
	db = frappe.db
	lock = db.sql("SELECT GET_LOCK(%s, %s)", (lock_name, timeout), as_list=True)
	if not lock or not lock[0] or lock[0][0] != 1:
		return False

	def release_lock():
		db.sql("SELECT RELEASE_LOCK(%s)", (lock_name,))

	db.after_commit.add(release_lock)
	db.after_rollback.add(release_lock)
	return True


def _acquire_hosting_capacity_lock() -> None:
	"""Serialize new hosted-site orders while capacity and pending reservations are checked."""
	if not _acquire_transaction_lock("asumi-hosting-capacity"):
		frappe.throw(_("یک سفارش میزبانی دیگر در حال ثبت است؛ کمی بعد دوباره تلاش کنید."))


def _require_commerce_admin():
	if not (has_role("System Manager") or has_role("Press Admin")):
		frappe.throw(_("Only a Press system administrator can manage commerce."), frappe.PermissionError)


def _get_service_prices() -> dict[str, dict[str, int]]:
	if not frappe.db.exists("DocType", "Asumi Service Pricing"):
		return default_service_prices()

	doc = frappe.get_single("Asumi Service Pricing")
	stored = {
		"modules": doc.get("module_prices"),
		"addons": doc.get("addon_prices"),
		"packages": doc.get("package_prices"),
	}
	if all(value in (None, "") for value in stored.values()):
		return default_service_prices()
	if any(value in (None, "") for value in stored.values()):
		frappe.throw(_("تنظیمات تعرفهٔ خدمات آسومی ناقص است؛ مدیر باید تعرفه‌ها را دوباره ذخیره کند."))

	try:
		decoded = {key: json.loads(value) for key, value in stored.items()}
		return normalize_service_prices(decoded["modules"], decoded["addons"], decoded["packages"])
	except (json.JSONDecodeError, TypeError, ValueError) as error:
		frappe.throw(_(f"تنظیمات تعرفهٔ خدمات آسومی معتبر نیست: {error}"))


def _parse_service_selection(value: str, field: str) -> list[str]:
	if not isinstance(value, str) or len(value) > 2000:
		raise ValueError(f"{field} is invalid")
	try:
		parsed = json.loads(value)
	except json.JSONDecodeError as error:
		raise ValueError(f"{field} must be a JSON array") from error
	if not isinstance(parsed, list):
		raise ValueError(f"{field} must be a JSON array")
	return parsed


def _sellable_marketplace_app_rows(*, published_only: bool = False) -> list[dict]:
	filters = {"status": "Published"} if published_only else {}
	apps = frappe.get_all(
		"Marketplace App",
		filters=filters,
		fields=["name", "app", "title"],
		limit_page_length=500,
		ignore_permissions=True,
	)
	return [app for app in apps if is_marketplace_app_sellable(app.app)]


@frappe.whitelist(allow_guest=True)
def checkout_status() -> dict:
	"""Return public configuration state without exposing gateway credentials."""
	settings = _get_settings()
	return {
		"enabled": _checkout_available_for_user(settings),
		"marketplace_apps_enabled": _checkout_available_for_user(settings, "marketplace"),
		"hosting_enabled": _checkout_available_for_user(settings, "hosting"),
		"services_enabled": _checkout_available_for_user(settings, "services"),
		"sandbox_mode": bool(settings and settings.sandbox_mode),
		"currency": "IRR",
	}


def _resolve_ipv4(hostname: str) -> list[str]:
	return resolve_ipv4(hostname)


def _wildcard_dns_targets_apex(root_addresses: list[str] | None = None) -> bool:
	root_addresses = root_addresses or _resolve_ipv4(ASUMI_ROOT_DOMAIN)
	probe_addresses = _resolve_ipv4(f"hosting-check.{ASUMI_ROOT_DOMAIN}")
	return bool(root_addresses and probe_addresses and set(probe_addresses).issubset(root_addresses))


def _wildcard_tls_ready(host_addresses: list[str]) -> bool:
	context = ssl.create_default_context()
	for address in host_addresses[:5]:
		try:
			with socket.create_connection((address, 443), timeout=3) as connection:
				with context.wrap_socket(connection, server_hostname=f"hosting-check.{ASUMI_ROOT_DOMAIN}"):
					return True
		except (OSError, ssl.SSLError):
			continue
	return False


def _press_shared_bench_ready(domain_doc) -> bool:
	if not domain_doc or not domain_doc.default_cluster:
		return False
	benches = frappe.get_all(
		"Bench",
		filters={"cluster": domain_doc.default_cluster, "status": "Active"},
		fields=["name", "server", "group"],
		limit_page_length=100,
		ignore_permissions=True,
	)
	for bench in benches:
		if not bench.server or not bench.group:
			continue
		server = frappe.db.get_value(
			"Server", bench.server, ["status", "public", "proxy_server"], as_dict=True
		)
		group = frappe.db.get_value(
			"Release Group", bench.group, ["enabled", "public", "version"], as_dict=True
		)
		if not (
			server
			and server.status == "Active"
			and server.public
			and server.proxy_server
			and group
			and group.enabled
			and group.public
			and group.version
		):
			continue
		proxy_status = frappe.db.get_value("Proxy Server", server.proxy_server, "status")
		if proxy_status == "Active" and frappe.db.exists(
			"Proxy Server Domain", {"parent": server.proxy_server, "domain": ASUMI_ROOT_DOMAIN}
		):
			bench_apps = {row.app for row in frappe.get_doc("Bench", bench.name).apps}
			if "frappe" in bench_apps:
				return True
	return False


def _live_docker_snapshot() -> dict:
	try:
		from press.api.docker_control import _client, _host_doc

		host = _host_doc()
		if host.connection_status != "Connected":
			return {"connected": False, "resources": {}}
		client = _client(host)
		health = client.health(timeout=(2, 3))
		resource_snapshot = client.resources()
		available_apps = client.available_apps()
		resources = resource_snapshot.get("resources")
		return {
			"connected": health.get("protocol_version") == 1
			and resource_snapshot.get("protocol_version") == 1
			and isinstance(available_apps, list),
			"resources": resources if isinstance(resources, dict) else {},
			"apps": available_apps,
			"host": host.name,
		}
	except Exception:
		return {"connected": False, "resources": {}, "apps": []}


def _hosting_capacity_reservation_totals(
	exclude_order: str | None = None, exclude_site: str | None = None
) -> dict:
	"""Return fail-closed resource reservations for every pending or provisioned hosted site."""
	filters = {
		"order_type": "Hosting",
		"service_delivery_mode": "Create New Site",
		"status": ["in", list(HOSTING_CAPACITY_ORDER_STATUSES)],
	}
	if exclude_order:
		filters["name"] = ["!=", exclude_order]
	orders = frappe.get_all(
		"Commerce Order",
		filters=filters,
		fields=["site", "docker_site", "subdomain", "plan"],
		limit_page_length=HOSTING_CAPACITY_ORDER_LIMIT + 1,
		ignore_permissions=True,
	)
	if len(orders) > HOSTING_CAPACITY_ORDER_LIMIT:
		raise ValueError("تعداد سفارش‌های میزبانی برای بررسی ظرفیت بیش از حد مجاز است.")
	if not orders:
		return {"sites": 0, "reserved_disk_mib": 0, "reserved_memory_mib": 0}

	reservation_rows = []
	plan_names = set()
	for order in orders:
		get_value = order.get if isinstance(order, dict) else lambda field: getattr(order, field, None)
		plan_name = get_value("plan")
		reservation_key = get_value("docker_site") or get_value("site")
		if not reservation_key:
			subdomain = get_value("subdomain")
			if isinstance(subdomain, str) and subdomain.strip():
				reservation_key = f"{subdomain.strip()}.{ASUMI_ROOT_DOMAIN}"
		if not plan_name or not reservation_key:
			raise ValueError("اطلاعات سایت یا پلن یکی از سفارش‌های میزبانی کامل نیست.")
		reservation_rows.append({"reservation_key": reservation_key, "plan": plan_name})
		plan_names.add(plan_name)
	if exclude_site:
		reservation_rows = [row for row in reservation_rows if row["reservation_key"] != exclude_site]
		plan_names = {row["plan"] for row in reservation_rows}
		if not reservation_rows:
			return {"sites": 0, "reserved_disk_mib": 0, "reserved_memory_mib": 0}

	plan_rows = frappe.get_all(
		"Site Plan",
		filters={"name": ["in", sorted(plan_names)]},
		fields=["name", "max_storage_usage", "memory"],
		limit_page_length=len(plan_names),
		ignore_permissions=True,
	)
	plans_by_name = {}
	for plan in plan_rows:
		if isinstance(plan, dict):
			plan_values = dict(plan)
		elif hasattr(plan, "as_dict"):
			plan_values = plan.as_dict()
		else:
			plan_values = vars(plan)
		plans_by_name[plan.name] = plan_values
	return hosting_capacity_reservations(reservation_rows, plans_by_name)


@frappe.whitelist()
def admin_hosting_readiness() -> dict:
	"""Return the current hosting prerequisites to Press system administrators."""
	_require_commerce_admin()
	settings = _get_settings()
	merchant_ready = bool(
		settings
		and settings.enabled
		and settings.allow_site_plan_sales
		and not settings.sandbox_mode
		and _merchant_id(settings)
	)

	root_addresses = _resolve_ipv4(ASUMI_ROOT_DOMAIN)
	root_domain_ready = bool(root_addresses)
	wildcard_dns_ready = _wildcard_dns_targets_apex(root_addresses)
	wildcard_tls_ready = bool(root_addresses and _wildcard_tls_ready(root_addresses))

	plans = frappe.get_all(
		"Site Plan",
		filters={
			"document_type": "Site",
			"enabled": 1,
			"is_trial_plan": 0,
			"legacy_plan": 0,
			"commerce_delivery_mode": "Create New Site",
			"private_bench_support": 1,
		},
		fields=[
			"name", "plan_title", "price_irr", "interval", "max_storage_usage", "memory",
			"disk", "vcpu", "hostiran_product_code", "hostiran_monthly_cost_irr", "private_bench_support",
		],
		limit_page_length=100,
		ignore_permissions=True,
	)
	valid_plans = []
	for plan in plans:
		try:
			price = normalize_zarinpal_price(plan.price_irr)
		except ValueError:
			continue
		if (
			price >= ZARINPAL_MINIMUM_AMOUNT_IRR
			and plan.interval in {"Monthly", "Annually"}
			and int(plan.max_storage_usage or 0) > 0
			and int(plan.memory or 0) > 0
			and int(plan.disk or 0) > 0
			and int(plan.vcpu or 0) > 0
			and bool(plan.hostiran_product_code)
			and int(plan.hostiran_monthly_cost_irr or 0) > 0
			and bool(plan.private_bench_support)
		):
			valid_plans.append(plan)

	resources = {}
	capacity_ready = bool(valid_plans)
	capacity_detail = (
		"پلن‌های VPS دارای SKU و منابع ثبت شده‌اند؛ ظرفیت هر مشتری جداگانه پس از خرید VPS بررسی می‌شود."
		if capacity_ready
		else "برای هر پلن ساخت سایت، SKU و هزینهٔ واقعی ماهانهٔ VPS هاست‌ایران را ثبت کنید."
	)
	dedicated_provisioning_ready = bool(frappe.db.exists("DocType", "Site Group Deploy"))

	facts = {
		"live_payment": {
			"ready": merchant_ready,
			"detail": (
				"درگاه تولید زرین‌پال آماده است."
				if merchant_ready
				else "شناسهٔ پذیرنده، حالت تولید و فعال‌سازی فروش میزبانی لازم است."
			),
		},
		"site_plan": {
			"ready": bool(valid_plans),
			"detail": (
				f"{len(valid_plans)} پلن ساخت سایت با قیمت پولی و سقف منابع ثبت شده است."
				if valid_plans
				else "یک Site Plan ساخت سایت با قیمت حداقل ۱۰٬۰۰۰ ریال، دوره و سقف دیسک و حافظه بسازید."
			),
		},
		"root_domain": {
			"ready": root_domain_ready,
			"detail": (
				"رکورد A دامنهٔ اصلی آسومی پاسخ می‌دهد."
				if root_domain_ready
				else "رکورد A برای asumi.ir ثبت کنید و پس از انتشار دوباره بررسی کنید."
			),
		},
		"wildcard_dns": {
			"ready": wildcard_dns_ready,
			"detail": wildcard_dns_guidance(wildcard_dns_ready, root_addresses),
		},
		"wildcard_tls": {
			"ready": wildcard_tls_ready,
			"detail": (
				"گواهی معتبر HTTPS نام زیردامنه را پوشش می‌دهد."
				if wildcard_tls_ready
				else "گواهی TLS معتبر برای *.asumi.ir روی ورودی وب نصب کنید."
			),
		},
		"press_infrastructure": {
			"ready": dedicated_provisioning_ready,
			"detail": (
				"مسیر بنچ خصوصی Press برای VPS اختصاصی در دسترس است."
				if dedicated_provisioning_ready
				else "ساختار Site Group Deploy برای راه‌اندازی بنچ خصوصی موجود نیست."
			),
		},
		"capacity": {"ready": capacity_ready, "detail": capacity_detail},
		"access_email": {
			"ready": _hosting_access_email_ready(),
			"detail": (
				"حساب SMTP خروجی برای تحویل دسترسی آماده است."
				if _hosting_access_email_ready()
				else "یک Email Account با ارسال خروجی فعال کنید تا اطلاعات ورود مشتری تحویل شود."
			),
		},
	}
	return build_hosting_readiness(facts, resources)


@frappe.whitelist()
def my_purchase_sites() -> list[dict]:
	if frappe.session.user == "Guest":
		frappe.throw(_("Please sign in to purchase an app plan."), frappe.AuthenticationError)
	team = get_current_team()
	sites = frappe.get_all(
		"Site",
		filters={"team": team, "status": "Active"},
		fields=["name", "subdomain", "domain"],
		order_by="name asc",
		limit_page_length=100,
		ignore_permissions=True,
	)
	for site in sites:
		site.update(
			{
				"site_type": "Site",
				"key": f"Site:{site.name}",
				"label": f"{site.subdomain}.{site.domain}" if site.subdomain else site.name,
			}
		)
	docker_sites = frappe.get_all(
		"Docker Control Site",
		filters={"team": team, "enabled": 1},
		fields=["domain", "hosted_status"],
		order_by="domain asc",
		limit_page_length=100,
		ignore_permissions=True,
	)
	for site in docker_sites:
		if site.hosted_status and site.hosted_status != "Active":
			continue
		sites.append(
			{
				"name": site.domain,
				"site_type": "Docker Control Site",
				"key": f"Docker Control Site:{site.domain}",
				"label": site.domain,
			}
		)
	return sites


def _docker_bench_apps() -> list[str]:
	from press.api.docker_control import DockerControlError, _client, _host_doc

	try:
		return _client(_host_doc()).available_apps()
	except DockerControlError as error:
		frappe.throw(str(error))


def _marketplace_purchase_site(site_name: str, site_type: str, team: str) -> dict:
	if site_type == "Docker Control Site":
		site = frappe.db.get_value(
			"Docker Control Site",
			{"domain": site_name, "team": team, "enabled": 1},
			["domain", "team", "enabled", "hosted_status"],
			as_dict=True,
		)
		if not site or (site.hosted_status and site.hosted_status != "Active"):
			frappe.throw(_("سایت انتخاب‌شده فعال نیست یا به این حساب تعلق ندارد."), frappe.PermissionError)
		installed_apps = frappe.get_all(
			"Docker Control Site App",
			filters={"parent": site_name, "parenttype": "Docker Control Site", "parentfield": "apps"},
			pluck="app",
			ignore_permissions=True,
		)
		return {
			"name": site.domain,
			"team": site.team,
			"enabled": site.enabled,
			"status": "Active",
			"site_type": "Docker Control Site",
			"installed_apps": installed_apps,
			"available_apps": _docker_bench_apps(),
		}
	if site_type != "Site":
		frappe.throw(_("نوع سایت برای خرید برنامه معتبر نیست."))
	site = frappe.db.get_value("Site", site_name, ["name", "team", "status", "bench"], as_dict=True)
	if not site or site.team != team or site.status != "Active":
		frappe.throw(_("سایت انتخاب‌شده فعال نیست یا به این حساب تعلق ندارد."), frappe.PermissionError)
	bench_apps = []
	if site.bench and frappe.db.exists("Bench", site.bench):
		bench_apps = [row.app for row in frappe.get_doc("Bench", site.bench).apps if row.app != "frappe"]
	return {
		**site,
		"site_type": "Site",
		"installed_apps": frappe.get_all(
			"Site App", filters={"parent": site_name, "parenttype": "Site"}, pluck="app"
		),
		"available_apps": bench_apps,
	}


def _wait_for_site_backup(backup_name: str) -> dict:
	deadline = time.monotonic() + MARKETPLACE_INSTALL_TIMEOUT_SECONDS
	while time.monotonic() < deadline:
		backup = frappe.db.get_value(
			"Site Backup",
			backup_name,
			["status", "with_files", "database_file", "public_file", "private_file"],
			as_dict=True,
		)
		if not backup:
			frappe.throw(_("رکورد پشتیبان سایت پیدا نشد."))
		if backup.status == "Failure":
			frappe.throw(_("پشتیبان‌گیری سایت ناموفق شد؛ نصب برنامه آغاز نشد."))
		if backup.status == "Success":
			if not backup.with_files or not all(
				(backup.database_file, backup.public_file, backup.private_file)
			):
				frappe.throw(_("پشتیبان کامل پایگاه داده و فایل‌های سایت تأیید نشد."))
			return backup
		frappe.db.commit()
		time.sleep(MARKETPLACE_INSTALL_POLL_SECONDS)
	frappe.throw(_("زمان پشتیبان‌گیری به پایان رسید؛ نصب برنامه آغاز نشد."))


def _wait_for_site_agent_job(job_name: str) -> None:
	deadline = time.monotonic() + MARKETPLACE_INSTALL_TIMEOUT_SECONDS
	while time.monotonic() < deadline:
		status = frappe.db.get_value("Agent Job", job_name, "status")
		if status == "Success":
			return
		if status in {"Failure", "Delivery Failure"}:
			frappe.throw(_("نصب برنامه روی سایت ناموفق شد؛ پشتیبان برای رسیدگی حفظ شده است."))
		if not status:
			frappe.throw(_("کار نصب برنامه پیدا نشد."))
		frappe.db.commit()
		time.sleep(MARKETPLACE_INSTALL_POLL_SECONDS)
	frappe.throw(_("زمان نصب برنامه به پایان رسید؛ وضعیت عملیات در پنل مدیر ثبت شده است."))


def _install_marketplace_app_for_order(order, site, app) -> None:
	if order.docker_site:
		from press.api.docker_control import execute_marketplace_app_install

		execute_marketplace_app_install(order, app.app)
		return

	from press.agent import Agent
	from press.press.doctype.site_activity.site_activity import log_site_activity

	backup = frappe.get_doc(
		{
			"doctype": "Site Backup",
			"site": site.name,
			"team": order.team,
			"with_files": 1,
			"offsite": 0,
			"physical": 0,
		}
	).insert(ignore_permissions=True)
	order.db_set("install_backup", backup.name)
	frappe.db.commit()
	backup_result = _wait_for_site_backup(backup.name)
	if not all((backup_result.database_file, backup_result.public_file, backup_result.private_file)):
		frappe.throw(_("پشتیبان کامل سایت تأیید نشد؛ نصب برنامه آغاز نشد."))

	job = Agent(site.server).install_app_site(site, app.app)
	frappe.db.set_value("Site", site.name, "status", "Pending")
	log_site_activity(site.name, "Install App", app.app, job.name)
	order.db_set("agent_job", job.name)
	frappe.db.commit()
	_wait_for_site_agent_job(job.name)
	updated_site = frappe.get_doc("Site", site.name)
	updated_site.sync_apps()
	updated_site.reload()
	if app.app not in {row.app for row in updated_site.apps}:
		frappe.throw(_("موجودی سایت نصب برنامه را تأیید نکرد؛ پشتیبان برای رسیدگی حفظ شده است."))


def _enqueue_provision_paid_order(order_name: str) -> None:
	frappe.enqueue(
		"press.saas.commerce.api.provision_paid_order",
		queue="long",
		timeout=MARKETPLACE_PROVISION_TIMEOUT_SECONDS + 60,
		enqueue_after_commit=True,
		order_name=order_name,
	)


def _new_site_plan_config(
	plan_doc,
	subdomain: str | None = None,
	docker_snapshot: dict | None = None,
	exclude_order: str | None = None,
	exclude_site: str | None = None,
) -> dict | None:
	"""Resolve a dedicated HostIran plan without consulting the shared Docker host."""
	plan_values = plan_doc.as_dict() if hasattr(plan_doc, "as_dict") else dict(plan_doc)
	if not plan_values.get("dedicated_server_plan") or not plan_values.get("private_bench_support"):
		return None
	product_code = str(plan_values.get("hostiran_product_code") or "").strip()
	try:
		monthly_cost_irr = int(plan_values.get("hostiran_monthly_cost_irr") or 0)
		vcpu = int(plan_values.get("vcpu") or 0)
		memory = int(plan_values.get("memory") or 0)
		disk = int(plan_values.get("disk") or 0)
	except (TypeError, ValueError, OverflowError):
		return None
	if (
		not product_code
		or len(product_code) > 40
		or monthly_cost_irr <= 0
		or vcpu <= 0
		or memory <= 0
		or disk <= 0
	):
		return None
	root_addresses = _resolve_ipv4(ASUMI_ROOT_DOMAIN)
	if (
		not root_addresses
		or not _wildcard_dns_targets_apex(root_addresses)
		or not _wildcard_tls_ready(root_addresses)
	):
		return None
	available_apps = _site_plan_app_choices().get(HOSTIRAN_DEDICATED_VPS, [])
	if not available_apps:
		return None
	allowed_apps = frappe.get_all(
		"Site Plan Allowed App",
		filters={
			"parent": getattr(plan_doc, "name", plan_values.get("name")),
			"parenttype": "Site Plan",
			"parentfield": "allowed_apps",
		},
		pluck="app",
		ignore_permissions=True,
	)
	apps = sorted(set(allowed_apps).intersection(available_apps)) if allowed_apps else available_apps
	if "frappe" not in apps or set(allowed_apps).difference(available_apps):
		return None
	return {
		"domain": ASUMI_ROOT_DOMAIN,
		"apps": apps,
		"backend": "HostIran Dedicated VPS",
		"provider_product_code": product_code,
		"provider_monthly_cost_irr": monthly_cost_irr,
	}


def _new_site_plan_renewal_sites(plan_name: str, team: str) -> list[dict]:
	"""Return only existing Asumi sites previously created under this exact plan."""
	orders = frappe.get_all(
		"Commerce Order",
		filters={
			"team": team,
			"plan": plan_name,
			"order_type": "Hosting",
			"service_delivery_mode": "Create New Site",
			"status": ["in", ["Paid", "Provisioning", "Provisioning Failed", "Active", "Expired"]],
		},
		fields=["site", "docker_site"],
		limit_page_length=500,
		ignore_permissions=True,
	)
	site_names = list({row.site for row in orders if row.site})
	docker_site_names = list({row.docker_site for row in orders if row.docker_site})
	sites = []
	if site_names:
		sites.extend(
			frappe.get_all(
				"Site",
				filters={
					"name": ["in", site_names],
					"team": team,
					"domain": ASUMI_ROOT_DOMAIN,
					"plan": plan_name,
					"status": ["in", ["Active", "Suspended"]],
				},
				fields=["name", "subdomain", "domain", "status", "plan"],
				order_by="name asc",
				limit_page_length=100,
				ignore_permissions=True,
			)
		)
	if docker_site_names:
		rows = frappe.get_all(
			"Docker Control Site",
			filters={
				"domain": ["in", docker_site_names],
				"team": team,
				"hosting_plan": plan_name,
				"hosted_status": ["in", ["Active", "Suspended"]],
			},
			fields=["domain", "team", "hosting_plan", "hosted_status"],
			limit_page_length=100,
			ignore_permissions=True,
		)
		for row in rows:
			sites.append(
				{
					"name": row.domain,
					"subdomain": row.domain.removesuffix(f".{ASUMI_ROOT_DOMAIN}"),
					"domain": ASUMI_ROOT_DOMAIN,
					"status": row.hosted_status,
					"plan": row.hosting_plan,
					"team": row.team,
					"site_type": "Docker Control Site",
				}
			)
	return sorted(sites, key=lambda site: site["name"])


@frappe.whitelist()
def available_site_plan_offers() -> dict:
	if frappe.session.user == "Guest":
		frappe.throw(_("برای خرید میزبانی ابتدا وارد حساب شوید."), frappe.AuthenticationError)
	team = get_current_team(get_doc=True)
	settings = _get_settings()
	sites = frappe.get_all(
		"Site",
		filters={"team": team.name, "status": "Active"},
		fields=["name", "subdomain", "domain", "plan"],
		order_by="name asc",
		limit_page_length=100,
		ignore_permissions=True,
	)
	user_roles = set(frappe.get_roles(frappe.session.user))
	plans = frappe.get_all(
		"Site Plan",
		filters={"document_type": "Site", "enabled": 1, "is_trial_plan": 0, "legacy_plan": 0},
		fields=[
			"name",
			"plan_title",
			"plan_description",
			"interval",
			"price_irr",
			"commerce_delivery_mode",
			"private_bench_support",
		],
		order_by="plan_title asc",
		limit_page_length=100,
		ignore_permissions=True,
	)
	offers = []
	for plan in plans:
		roles = set(
			frappe.get_all(
				"Has Role",
				filters={"parent": plan.name, "parenttype": "Site Plan", "parentfield": "roles"},
				pluck="role",
			)
		)
		if roles and not roles.intersection(user_roles):
			continue
		try:
			mode = normalize_site_plan_delivery_mode(plan.commerce_delivery_mode)
			normalize_zarinpal_price(plan.price_irr)
			valid_interval = plan.interval in {"Daily", "Monthly", "Annually"}
		except ValueError:
			mode = plan.commerce_delivery_mode
			valid_interval = False
		price_valid = int(plan.price_irr or 0) >= 10_000
		config = _new_site_plan_config(frappe.get_doc("Site Plan", plan.name)) if mode == "Create New Site" else None
		renewable_sites = (
			_new_site_plan_renewal_sites(plan.name, team.name)
			if mode == "Create New Site"
			else []
		)
		ready = (
			_checkout_available_for_user(settings, "hosting")
			and (mode != "Create New Site" or not settings.sandbox_mode)
			and price_valid
			and valid_interval
			and (
				bool(sites)
				if mode == "Upgrade Existing Site"
				else bool(renewable_sites or (config and _hosting_access_email_ready()))
			)
		)
		offers.append(
			{
				**plan,
				"commerce_delivery_mode": mode,
				"price_irr": int(plan.price_irr or 0),
				"available": ready,
				"apps": config["apps"] if config else [],
				"domain": config["domain"] if config else ASUMI_ROOT_DOMAIN,
				"new_site_available": bool(config),
				"renewable_sites": renewable_sites,
				"message": "" if ready else (
					"حالت آزمایشی فقط برای مدیران آسومی فعال است؛ برای خرید مشتریان، پرداخت زنده را فعال کنید."
					if _sandbox_checkout_restricted(settings, "hosting")
					else "تنظیمات پرداخت، پلن VPS هاست‌ایران، دامنه یا ایمیل تحویل هنوز آمادهٔ خرید نیست."
				),
			}
		)
	return {
		"plans": offers,
		"sites": [{key: site.get(key) for key in ("name", "subdomain", "domain", "plan")} for site in sites],
		"checkout_enabled": _checkout_available_for_user(settings, "hosting"),
		"domain": ASUMI_ROOT_DOMAIN,
	}


@frappe.whitelist()
def available_app_plans(site: str, site_type: str = "Site") -> dict:
	if frappe.session.user == "Guest":
		frappe.throw(_("Please sign in to purchase an app plan."), frappe.AuthenticationError)
	team = get_current_team(get_doc=True)
	site_values = _marketplace_purchase_site(site, site_type, team.name)
	settings = _get_settings()
	apps = frappe.get_all(
		"Marketplace App",
		filters={"app": ["in", site_values["available_apps"] or [""]], "status": "Published"},
		fields=["name", "app", "title", "route"],
	)
	app_by_name = {app.name: app for app in apps}
	plan_rows = frappe.get_all(
		"Marketplace App Plan",
		filters={"app": ["in", list(app_by_name) or [""]], "enabled": 1},
		fields=["name", "app", "title", "interval", "price_inr", "price_usd", "price_irr"],
		order_by="price_irr asc",
	)
	plans = []
	for plan in plan_rows:
		try:
			prices = normalize_marketplace_app_plan_prices(plan)
			plan.price_irr = normalize_zarinpal_price(prices["price_irr"])
		except ValueError:
			continue
		app = app_by_name.get(plan.app)
		if not app:
			continue
		try:
			installation = marketplace_install_state(
				app.app, site_values["installed_apps"], site_values["available_apps"]
			)
		except ValueError:
			continue
		plan.update(
			{
				"app_title": app.title,
				"app_route": app.route,
				"installation_required": installation["installation_required"],
				"asumi_checkout_supported": marketplace_plan_supported_by_asumi_checkout(prices),
				"asumi_checkout_message": (
					"برای خرید مستقیم، قیمت ریالی وارد کنید؛ تعرفهٔ غیرریالی بدون قیمت ریالی رایگان نمی‌شود."
					if not marketplace_plan_supported_by_asumi_checkout(prices)
					else ""
				),
			}
		)
		plans.append(plan)
	free_purchase_enabled = _free_marketplace_purchase_enabled(settings)
	checkout_enabled = _checkout_available_for_user(settings)
	message = ""
	if any(not plan.asumi_checkout_supported for plan in plans):
		message = "پرداخت مستقیم آسومی فقط با ریال انجام می‌شود؛ برای تعرفه‌های پولی، قیمت IRR را هم ثبت کنید."
	elif any(not plan.price_irr for plan in plans) and not free_purchase_enabled:
		message = "فعال‌سازی تعرفه‌های رایگان فعلاً توسط مدیر آسومی خاموش است."
	elif any(plan.price_irr for plan in plans) and _sandbox_checkout_restricted(settings):
		message = "درگاه روی حالت آزمایشی است؛ خرید آزمایشی فقط برای مدیران آسومی فعال است و مشتریان پس از فعال‌شدن پرداخت زنده می‌توانند خرید کنند."
	elif any(plan.price_irr for plan in plans) and not checkout_enabled:
		message = "پرداخت تعرفه‌های پولی هنوز توسط مدیر آسومی پیکربندی نشده است."
	return {
		"site": site,
		"site_type": site_type,
		"plans": plans,
		"checkout_enabled": checkout_enabled,
		"free_purchase_enabled": free_purchase_enabled,
		"message": message,
	}


@frappe.whitelist()
def start_marketplace_app_purchase(plan: str, site: str, site_type: str = "Site") -> dict:
	if frappe.session.user == "Guest":
		frappe.throw(_("Please sign in before purchasing an app plan."), frappe.AuthenticationError)
	team_doc = get_current_team(get_doc=True)
	if team_doc.user != frappe.session.user and not is_user_part_of_team(frappe.session.user, team_doc.name):
		frappe.throw(_("You do not have access to this team."), frappe.PermissionError)

	settings = _get_settings()
	plan_doc = frappe.get_doc("Marketplace App Plan", plan)
	app_doc = frappe.get_doc("Marketplace App", plan_doc.app)
	site_values = _marketplace_purchase_site(site, site_type, team_doc.name)
	snapshot = marketplace_app_order_snapshot(
		plan_doc.as_dict(),
		app_doc.as_dict(),
		site_values,
		{"name": team_doc.name, "currency": team_doc.currency},
		frappe.session.user,
	)
	is_free = snapshot["amount"] == 0
	if is_free:
		if not _free_marketplace_purchase_enabled(settings):
			frappe.throw(_("فعال‌سازی تعرفه‌های رایگان فعلاً توسط مدیر آسومی خاموش است."))
	else:
		merchant_id = _merchant_id(settings)
		if not _checkout_available_for_user(settings) or not merchant_id:
			if _sandbox_checkout_restricted(settings):
				frappe.throw(_("پرداخت آزمایشی فقط برای مدیران آسومی در دسترس است؛ برای خرید مشتریان، حالت آزمایشی را خاموش کنید."))
			frappe.throw(_("پرداخت آنلاین هنوز توسط مدیر آسومی پیکربندی نشده است."))
	lock_digest = hashlib.sha256(f"{site_type}:{site}:{plan_doc.name}".encode()).hexdigest()[:40]
	if not _acquire_transaction_lock(f"asumi-marketplace:{lock_digest}"):
		frappe.throw(_("درخواست خرید این برنامه برای این سایت هم‌اکنون در حال ثبت است؛ کمی بعد دوباره تلاش کنید."))
	target_field = "docker_site" if site_type == "Docker Control Site" else "site"
	target_filters = {target_field: site}
	active_plan = frappe.db.exists(
		"Press Subscription",
		target_filters
		| {"plan_type": "Marketplace App Plan", "plan": plan_doc.name, "enabled": 1},
	)
	active_commerce_plan = frappe.db.exists(
		"Commerce Order",
		target_filters
		| {
			"plan": plan_doc.name,
			"order_type": "Marketplace App",
			"status": ["in", ["Paid", "Provisioning", "Provisioning Failed", "Active"]],
		},
	)
	if active_plan and not active_commerce_plan:
		frappe.throw(_("این تعرفه همین حالا روی سایت شما فعال است."))
	if is_free:
		active_free_order = frappe.db.get_value(
			"Commerce Order",
			target_filters
			| {
				"plan": plan_doc.name,
				"order_type": "Marketplace App",
				"status": "Active",
				"amount": 0,
			},
			"name",
		)
		if active_free_order:
			return {"order": active_free_order, "free": True, "already_active": True}
		in_flight_free_orders = frappe.get_all(
			"Commerce Order",
			filters=target_filters
			| {
				"plan": plan_doc.name,
				"order_type": "Marketplace App",
				"amount": 0,
				"status": ["in", ["Paid", "Provisioning", "Provisioning Failed"]],
			},
			fields=["name", "status"],
			order_by="creation desc",
			limit_page_length=1,
			ignore_permissions=True,
		)
		if in_flight_free_orders:
			order = in_flight_free_orders[0]
			if order.status == "Provisioning Failed":
				_enqueue_provision_paid_order(order.name)
			return {"order": order.name, "free": True, "already_requested": True}
		if not frappe.db.exists("Currency", "IRR"):
			frappe.throw(_("واحد پول ریال در تنظیمات آسومی ثبت نشده است."))
		order = frappe.get_doc(
			{
				"doctype": "Commerce Order",
				**snapshot,
				"provider": "Free",
				"sandbox_mode": 0,
			}
		).insert(ignore_permissions=True)
		order.db_set(
			{
				"status": transition_order("Pending Payment", "Paid"),
				"paid_at": frappe.utils.now_datetime(),
			}
		)
		_enqueue_provision_paid_order(order.name)
		return {"order": order.name, "free": True}
	pending_order = frappe.get_all(
		"Commerce Order",
		filters={
			"customer": frappe.session.user,
			"team": team_doc.name,
			"plan": plan_doc.name,
			target_field: site,
			"order_type": "Marketplace App",
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


def _create_zarinpal_checkout(snapshot: dict, settings, description: str, pending_filters: dict) -> dict:
	pending = frappe.get_all(
		"Commerce Order",
		filters={**pending_filters, "status": "Pending Payment"},
		fields=["name", "authority", "sandbox_mode"],
		order_by="creation desc",
		limit_page_length=1,
		ignore_permissions=True,
	)
	if pending and pending[0].authority:
		return {
			"order": pending[0].name,
			"checkout_url": checkout_url(pending[0].authority, sandbox=bool(pending[0].sandbox_mode)),
		}
	if not frappe.db.exists("Currency", "IRR"):
		frappe.throw(_("واحد پول ریال در تنظیمات آسومی ثبت نشده است."))
	merchant_id = _merchant_id(settings)
	if not merchant_id:
		frappe.throw(_("پرداخت آنلاین هنوز توسط مدیر آسومی پیکربندی نشده است."))
	callback_url = f"{frappe.utils.get_url().rstrip('/')}/api/method/press.saas.commerce.api.zarinpal_callback"
	payload = build_payment_request(
		merchant_id=merchant_id,
		amount=snapshot["amount"],
		callback_url=callback_url,
		description=description[:250],
		email=frappe.session.user if "@" in frappe.session.user else None,
	)
	order_values = {"doctype": "Commerce Order", **snapshot, "sandbox_mode": int(bool(settings.sandbox_mode))}
	for fieldname in ("apps", "service_quote_snapshot"):
		if isinstance(order_values.get(fieldname), (dict, list)):
			order_values[fieldname] = frappe.as_json(order_values[fieldname])
	order = frappe.get_doc(order_values).insert(ignore_permissions=True)
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
	return {"order": order.name, "checkout_url": checkout_url(authority, sandbox=bool(order.sandbox_mode))}


@frappe.whitelist()
def start_site_plan_purchase(
	plan: str,
	site: str | None = None,
	subdomain: str | None = None,
	apps: str | list[str] | None = None,
) -> dict:
	if frappe.session.user == "Guest":
		frappe.throw(_("برای خرید میزبانی ابتدا وارد حساب شوید."), frappe.AuthenticationError)
	team = get_current_team(get_doc=True)
	if team.user != frappe.session.user and not is_user_part_of_team(frappe.session.user, team.name):
		frappe.throw(_("به این تیم دسترسی ندارید."), frappe.PermissionError)
	settings = _get_settings()
	if not _checkout_available_for_user(settings, "hosting"):
		if _sandbox_checkout_restricted(settings, "hosting"):
			frappe.throw(_("پرداخت آزمایشی میزبانی فقط برای مدیران آسومی در دسترس است؛ برای خرید مشتریان، حالت آزمایشی را خاموش کنید."))
		frappe.throw(_("خرید میزبانی هنوز توسط مدیر آسومی فعال نشده است."))
	plan_doc = frappe.get_doc("Site Plan", plan)
	if plan_doc.document_type != "Site" or not plan_doc.enabled or plan_doc.is_trial_plan or plan_doc.legacy_plan:
		frappe.throw(_("این تعرفهٔ میزبانی برای خرید فعال نیست."))
	plan_roles = set(
		frappe.get_all(
			"Has Role",
			filters={"parent": plan_doc.name, "parenttype": "Site Plan", "parentfield": "roles"},
			pluck="role",
		)
	)
	if plan_roles and not plan_roles.intersection(frappe.get_roles(frappe.session.user)):
		frappe.throw(_("این پلن برای نقش کاربری شما در دسترس نیست."), frappe.PermissionError)

	delivery_mode = normalize_site_plan_delivery_mode(plan_doc.commerce_delivery_mode)
	is_new_site_renewal = bool(site and delivery_mode == "Create New Site")
	selected_site = None
	if site:
		if frappe.db.exists("Site", site):
			selected_site = frappe.db.get_value(
				"Site",
				site,
				["name", "team", "status", "plan", "server", "cluster", "group", "subdomain", "domain"],
				as_dict=True,
			)
			selected_site.site_type = "Site"
		elif delivery_mode == "Create New Site" and frappe.db.exists(
			"Docker Control Site", {"domain": site, "enabled": 1, "hosted_status": ["in", ["Active", "Suspended"]]}
		):
			docker_site = frappe.db.get_value(
				"Docker Control Site",
				site,
				["domain", "team", "hosting_plan", "hosted_status"],
				as_dict=True,
			)
			selected_site = frappe._dict(
				{
					"name": docker_site.domain,
					"team": docker_site.team,
					"status": docker_site.hosted_status,
					"plan": docker_site.hosting_plan,
					"subdomain": docker_site.domain.removesuffix(f".{ASUMI_ROOT_DOMAIN}"),
					"domain": ASUMI_ROOT_DOMAIN,
					"site_type": "Docker Control Site",
				}
			)
		allowed_statuses = {"Active"}
		if delivery_mode == "Create New Site":
			allowed_statuses.add("Suspended")
		if not selected_site or selected_site.team != team.name or selected_site.status not in allowed_statuses:
			frappe.throw(_("سایت انتخاب‌شده فعال نیست یا به این حساب تعلق ندارد."), frappe.PermissionError)
	if is_new_site_renewal and not frappe.db.exists(
		"Commerce Order",
		{
			("docker_site" if selected_site.site_type == "Docker Control Site" else "site"): selected_site.name,
			"team": team.name,
			"plan": plan_doc.name,
			"order_type": "Hosting",
			"service_delivery_mode": "Create New Site",
			"status": ["in", ["Paid", "Provisioning", "Provisioning Failed", "Active", "Expired"]],
		},
	):
		frappe.throw(_("این سایت با همین پلن میزبانی ساخته نشده است و قابل تمدید نیست."))
	try:
		app_list = frappe.parse_json(apps) if isinstance(apps, str) else (apps or [])
		snapshot = hosting_order_snapshot(
			plan_doc.as_dict(),
			{"name": team.name, "currency": team.currency},
			frappe.session.user,
			site=selected_site,
			subdomain=subdomain,
			apps=app_list,
			renew_new_site=is_new_site_renewal,
			root_domain=ASUMI_ROOT_DOMAIN,
		)
	except (TypeError, ValueError) as error:
		frappe.throw(str(error))

	if snapshot["service_delivery_mode"] == "Create New Site":
		if selected_site:
			if selected_site.plan != plan_doc.name or selected_site.domain != ASUMI_ROOT_DOMAIN:
				frappe.throw(_("فقط سایت آسومی ساخته‌شده با همین پلن قابل تمدید است."))
		else:
			if settings.sandbox_mode:
				frappe.throw(_("ساخت سایت فقط پس از پرداخت واقعی زرین‌پال انجام می‌شود؛ حالت آزمایشی را خاموش کنید."))
			if not _hosting_access_email_ready(frappe.session.user):
				frappe.throw(_("برای تحویل امن دسترسی سایت، ایمیل معتبر و SMTP خروجی لازم است."))
			config = _new_site_plan_config(plan_doc, snapshot["subdomain"])
			if not config:
				frappe.throw(_("مشخصات VPS هاست‌ایران، دامنه یا گواهی برای سفارش این سایت آماده نیست."))
			if any(app not in config["apps"] for app in snapshot["apps"]):
				frappe.throw(_("یکی از برنامه‌های انتخاب‌شده برای ساخت بنچ اختصاصی این پلن آماده نیست."))
			full_site_name = f"{snapshot['subdomain']}.{ASUMI_ROOT_DOMAIN}"
			if frappe.db.exists("Site", full_site_name) or frappe.db.exists(
				"Docker Control Site", full_site_name
			):
				frappe.throw(_("این زیردامنه قبلاً استفاده شده است."))
	else:
		from press.api.site import validate_plan

		try:
			validate_plan(selected_site.server, plan_doc.name)
		except Exception as error:
			frappe.throw(_("این پلن برای سایت انتخاب‌شده قابل استفاده نیست: {0}").format(str(error)))
		previous_orders = frappe.get_all(
			"Commerce Order",
			filters={
				"site": selected_site.name,
				"order_type": "Hosting",
				"status": ["in", ["Paid", "Provisioning", "Provisioning Failed", "Active"]],
			},
			fields=["name", "plan", "original_plan", "service_ends_at"],
			order_by="creation desc",
			limit_page_length=1,
			ignore_permissions=True,
		)
		if selected_site.plan == plan_doc.name and not previous_orders:
			frappe.throw(_("این سایت همین حالا روی این پلن است."))
		if previous_orders and previous_orders[0].plan != plan_doc.name:
			frappe.throw(_("تا پایان سفارش فعال میزبانی، تغییر پلن دیگری ثبت نمی‌شود."))
		if previous_orders:
			snapshot["original_plan"] = previous_orders[0].original_plan or selected_site.plan

	pending_filters = {
		"customer": frappe.session.user,
		"team": team.name,
		"plan": plan_doc.name,
		("docker_site" if snapshot.get("docker_site") else "site"): snapshot.get("docker_site") or snapshot["site"],
		"subdomain": snapshot["subdomain"],
		"order_type": "Hosting",
	}
	if snapshot["service_delivery_mode"] == "Create New Site":
		lock_name = f"asumi-site:{snapshot['subdomain']}"
		if not _acquire_transaction_lock(lock_name):
			frappe.throw(_("ثبت این زیردامنه هم‌اکنون در حال انجام است؛ کمی بعد دوباره تلاش کنید."))
		matching_pending = frappe.get_all(
			"Commerce Order",
			filters={**pending_filters, "status": "Pending Payment"},
			fields=["name", "authority", "sandbox_mode"],
			order_by="creation desc",
			limit_page_length=1,
			ignore_permissions=True,
		)
		if matching_pending:
			if matching_pending[0].authority:
				return {
					"order": matching_pending[0].name,
					"checkout_url": checkout_url(
						matching_pending[0].authority,
						sandbox=bool(matching_pending[0].sandbox_mode),
					),
				}
			frappe.throw(_("درخواست پرداخت قبلی همین زیردامنه هنوز در حال ثبت است."))
		if not selected_site:
			if frappe.db.exists("Site", full_site_name):
				frappe.throw(_("این زیردامنه قبلاً استفاده شده است."))
			reserved = frappe.db.exists(
				"Commerce Order",
				{
					"subdomain": snapshot["subdomain"],
					"order_type": "Hosting",
					"status": ["in", ["Pending Payment", "Paid", "Provisioning", "Provisioning Failed", "Active"]],
				},
			)
			if reserved:
				frappe.throw(_("این زیردامنه قبلاً برای یک سفارش رزرو شده است."))
		return _create_zarinpal_checkout(
			snapshot,
			settings,
			f"Asumi hosting plan: {plan_doc.plan_title or plan_doc.name}",
			pending_filters,
		)

	return _create_zarinpal_checkout(
		snapshot,
		settings,
		f"Asumi hosting plan: {plan_doc.plan_title or plan_doc.name}",
		pending_filters,
	)


@frappe.whitelist(methods=["POST"])
def start_service_purchase(
	module_ids: str,
	addon_ids: str,
	full_name: str,
	phone: str,
	company: str = "",
) -> dict:
	"""Create a one-month service order using only server-managed prices."""
	if frappe.session.user == "Guest":
		frappe.throw(_("برای خرید خدمات آسومی ابتدا وارد حساب شوید."), frappe.AuthenticationError)

	settings = _get_settings()
	if not _free_service_purchase_enabled(settings):
		frappe.throw(_("فروش خدمات آسومی هنوز توسط مدیر فعال نشده است."))

	team = get_current_team(get_doc=True)
	if not team or (team.user != frappe.session.user and not is_user_part_of_team(frappe.session.user, team.name)):
		frappe.throw(_("به این تیم دسترسی ندارید."), frappe.PermissionError)
	try:
		module_selection = _parse_service_selection(module_ids, "module_ids")
		addon_selection = _parse_service_selection(addon_ids, "addon_ids")
		snapshot = build_service_order_snapshot(
			module_ids=module_selection,
			addon_ids=addon_selection,
			prices=_get_service_prices(),
			customer=frappe.session.user,
			team=team.name,
			full_name=full_name,
			phone=phone,
			company=company,
			quoted_at=str(frappe.utils.now_datetime()),
		)
		snapshot["customer"] = frappe.session.user
		snapshot["team"] = team.name
	except (TypeError, ValueError) as error:
		frappe.throw(_(str(error)))

	is_free = snapshot["amount"] == 0
	if not is_free:
		merchant_id = _merchant_id(settings)
		if not merchant_id or not _checkout_available_for_user(settings, "services"):
			if _sandbox_checkout_restricted(settings, "services"):
				frappe.throw(_("پرداخت آزمایشی خدمات فقط برای مدیران آسومی در دسترس است؛ برای خرید مشتریان، حالت آزمایشی را خاموش کنید."))
			frappe.throw(_("پرداخت آنلاین خدمات آسومی هنوز توسط مدیر پیکربندی نشده است."))

	if not frappe.db.exists("Currency", "IRR"):
		frappe.throw(_("واحد پول ریال در تنظیمات آسومی ثبت نشده است."))
	fingerprint = snapshot["service_fingerprint"]
	lock_digest = hashlib.sha256(fingerprint.encode()).hexdigest()[:40]
	if not _acquire_transaction_lock(f"asumi-service:{lock_digest}"):
		frappe.throw(_("ثبت همین سفارش خدمات هم‌اکنون در حال انجام است؛ کمی بعد دوباره تلاش کنید."))

	pending_filters = {
		"customer": frappe.session.user,
		"team": team.name,
		"order_type": "Asumi Service",
		"service_fingerprint": fingerprint,
	}
	existing_orders = frappe.get_all(
		"Commerce Order",
		filters={
			**pending_filters,
			"status": ["in", ["Pending Payment", "Paid", "Provisioning", "Provisioning Failed", "Active"]],
		},
		fields=["name", "status", "authority", "sandbox_mode"],
		order_by="creation desc",
		limit_page_length=1,
		ignore_permissions=True,
	)
	if existing_orders:
		previous = existing_orders[0]
		if previous.status == "Pending Payment":
			if previous.authority:
				return {
					"order": previous.name,
					"checkout_url": checkout_url(previous.authority, sandbox=bool(previous.sandbox_mode)),
				}
			frappe.throw(_("درخواست پرداخت قبلی همین سفارش هنوز در حال ثبت است."))
		return {"order": previous.name, "free": is_free, "already_requested": True, "status": previous.status}

	if is_free:
		order_values = {"doctype": "Commerce Order", **snapshot, "provider": "Free", "sandbox_mode": 0}
		order_values["service_quote_snapshot"] = frappe.as_json(order_values["service_quote_snapshot"])
		order = frappe.get_doc(order_values).insert(ignore_permissions=True)
		order.db_set(
			{
				"status": transition_order("Pending Payment", "Paid"),
				"paid_at": frappe.utils.now_datetime(),
			}
		)
		return {"order": order.name, "free": True}

	return _create_zarinpal_checkout(
		snapshot,
		settings,
		f"Asumi service: {snapshot['service_title']}",
		pending_filters,
	)


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
		if order.order_type != "Asumi Service" and order.status in {"Paid", "Provisioning Failed"}:
			_enqueue_provision_paid_order(order.name)
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
	if order.order_type != "Asumi Service":
		_enqueue_provision_paid_order(order.name)
	return _redirect_to_orders("paid", order.name)


def _redirect_to_orders(result: str, order: str | None = None):
	query = f"?payment={quote(result)}"
	if order:
		query += f"&order={quote(order)}"
	frappe.local.response["type"] = "redirect"
	frappe.local.response["location"] = f"/dashboard/orders{query}"
	return


def _hostiran_server_usage(server_names: list[str], *, exclude_order: str | None = None) -> tuple[set[str], set[str]]:
	if not server_names:
		return set(), set()
	order_filters = {"hostiran_server": ["in", server_names]}
	if exclude_order:
		order_filters["name"] = ["!=", exclude_order]
	assigned_servers = set(
		frappe.get_all(
			"Commerce Order",
			filters=order_filters,
			pluck="hostiran_server",
			limit_page_length=5000,
			ignore_permissions=True,
		)
	)
	benched_servers = set(
		frappe.get_all(
			"Bench",
			filters={"server": ["in", server_names]},
			pluck="server",
			limit_page_length=5000,
			ignore_permissions=True,
		)
	)
	return assigned_servers, benched_servers


def _is_ready_hostiran_server(server, team: str) -> bool:
	get_value = server.get if isinstance(server, dict) else lambda field: getattr(server, field, None)
	return bool(
		get_value("team") == team
		and get_value("status") == "Active"
		and not get_value("public")
		and get_value("is_server_setup")
		and get_value("is_standalone")
		and get_value("is_standalone_setup")
		and get_value("is_self_hosted")
		and get_value("cluster")
	)


@frappe.whitelist()
def admin_hostiran_server_options(order: str) -> dict:
	"""List ready, exclusive VPSs purchased for one customer's paid HostIran order."""
	_require_commerce_admin()
	order_doc = frappe.get_doc("Commerce Order", order)
	if (
		order_doc.order_type != "Hosting"
		or order_doc.service_delivery_mode != "Create New Site"
		or order_doc.status not in {"Paid", "Provisioning Failed", "Provisioning"}
		or order_doc.hostiran_site_group_deploy
	):
		return {"servers": [], "message": "این سفارش در مرحلهٔ انتخاب VPS نیست."}
	servers = frappe.get_all(
		"Server",
		filters={
			"team": order_doc.team,
			"status": "Active",
			"public": 0,
			"is_server_setup": 1,
			"is_standalone": 1,
			"is_standalone_setup": 1,
			"is_self_hosted": 1,
		},
		fields=["name", "title", "ip", "cluster", "ram", "provider", "team", "status", "public", "is_server_setup", "is_standalone", "is_standalone_setup", "is_self_hosted"],
		order_by="title asc, name asc",
		limit_page_length=5000,
		ignore_permissions=True,
	)
	if order_doc.hostiran_server:
		servers = [server for server in servers if server.name == order_doc.hostiran_server]
	assigned_servers, benched_servers = _hostiran_server_usage(
		[server.name for server in servers], exclude_order=order_doc.name
	)
	ready_servers = [
		server
		for server in servers
		if _is_ready_hostiran_server(server, order_doc.team)
		and server.name not in assigned_servers
		and server.name not in benched_servers
	]
	return {
		"servers": [
			{
				"name": server.name,
				"title": server.title or server.name,
				"ip": server.ip,
				"cluster": server.cluster,
				"ram": server.ram,
				"provider": server.provider,
			}
			for server in ready_servers
		],
		"message": "" if ready_servers else "یک VPS اختصاصی هاست‌ایرانِ فعال و آماده برای همین تیم در Press ثبت کنید.",
	}


@frappe.whitelist(methods=["POST"])
def admin_prepare_hostiran_site(order: str, server: str, hostiran_order_reference: str) -> dict:
	"""Attach a paid new-site order to its dedicated VPS and start a private-bench deployment."""
	_require_commerce_admin()
	order_doc = frappe.get_doc("Commerce Order", order, for_update=True)
	if order_doc.hostiran_site_group_deploy:
		if (
			order_doc.hostiran_server != server
			or order_doc.hostiran_order_reference != (hostiran_order_reference or "").strip()
		):
			frappe.throw(_("این سفارش قبلاً به VPS یا شمارهٔ خرید دیگری متصل شده است."))
		return {
			"name": order_doc.name,
			"status": order_doc.status,
			"hostiran_fulfillment_status": order_doc.hostiran_fulfillment_status,
			"hostiran_server": order_doc.hostiran_server,
			"hostiran_site_group_deploy": order_doc.hostiran_site_group_deploy,
		}
	if order_doc.site or order_doc.docker_site:
		frappe.throw(_("این سفارش قبلاً سایت دارد و نمی‌توان VPS تازه‌ای به آن متصل کرد."))
	server_lock = hashlib.sha256(f"asumi-hostiran-server:{server}".encode()).hexdigest()[:40]
	if not _acquire_transaction_lock(server_lock):
		frappe.throw(_("این VPS هم‌زمان برای سفارش دیگری در حال استفاده است؛ کمی بعد دوباره تلاش کنید."))

	plan = frappe.get_doc("Site Plan", order_doc.plan)
	server_doc = frappe.get_doc("Server", server)
	try:
		validation = validate_hostiran_fulfillment(
			order_doc, plan, server_doc, hostiran_order_reference
		)
	except ValueError as error:
		frappe.throw(_(str(error)))
	assigned_servers, benched_servers = _hostiran_server_usage(
		[server_doc.name], exclude_order=order_doc.name
	)
	if server_doc.name in assigned_servers or server_doc.name in benched_servers:
		frappe.throw(_("این VPS قبلاً به سفارش یا بنچ دیگری اختصاص داده شده است."))
	if frappe.db.get_single_value("Press Settings", "domain") != ASUMI_ROOT_DOMAIN:
		frappe.throw(_("دامنهٔ Press باید پیش از راه‌اندازی VPS روی asumi.ir تنظیم شود."))
	config = _new_site_plan_config(plan, order_doc.subdomain, exclude_order=order_doc.name)
	if not config:
		frappe.throw(_("DNS، گواهی یا تنظیمات پلن VPS برای تحویل سایت آماده نیست."))
	try:
		selected_apps = json.loads(order_doc.apps or "[]") if isinstance(order_doc.apps, str) else (order_doc.apps or [])
	except (TypeError, json.JSONDecodeError):
		frappe.throw(_("فهرست برنامه‌های سفارش معتبر نیست."))
	if not isinstance(selected_apps, list) or any(
		not isinstance(app, str) or app not in config["apps"] for app in selected_apps
	):
		frappe.throw(_("یکی از برنامه‌های انتخاب‌شده در نسخهٔ VPS آماده نیست."))
	selected_apps = list(dict.fromkeys(["frappe", *selected_apps]))
	target = f"{order_doc.subdomain}.{ASUMI_ROOT_DOMAIN}"
	if frappe.db.exists("Site", target) or frappe.db.exists("Docker Control Site", target):
		frappe.throw(_("این زیردامنه قبلاً برای سایت دیگری استفاده شده است."))
	if frappe.db.exists("Release Group", {"title": order_doc.subdomain}):
		frappe.throw(_("برای این زیردامنه قبلاً یک بنچ ثبت شده است."))
	if frappe.db.exists(
		"Commerce Order",
		{
			"subdomain": order_doc.subdomain,
			"order_type": "Hosting",
			"service_delivery_mode": "Create New Site",
			"status": ["in", ["Pending Payment", "Paid", "Provisioning", "Provisioning Failed", "Active"]],
			"name": ["!=", order_doc.name],
		},
	):
		frappe.throw(_("این زیردامنه به سفارش دیگری تعلق دارد."))
	team_doc = frappe.get_doc("Team", order_doc.team)
	if not team_doc.enabled:
		frappe.throw(_("حساب مشتری غیرفعال است و امکان ساخت سایت ندارد."))
	versions = frappe.get_all(
		"Frappe Version",
		filters={"status": "stable"},
		fields=["name"],
		order_by="number desc",
		limit_page_length=1,
		ignore_permissions=True,
	)
	if not versions:
		frappe.throw(_("نسخهٔ پایدار Frappe برای ساخت بنچ آماده نیست."))

	new_status = (
		transition_order(order_doc.status, "Provisioning")
		if order_doc.status != "Provisioning"
		else order_doc.status
	)
	order_doc.db_set(
		{
			"status": new_status,
			"hostiran_fulfillment_status": "Deploying Bench",
			"hostiran_server": validation["server"],
			"hostiran_order_reference": validation["provider_reference"],
			"provisioning_attempts": int(order_doc.provisioning_attempts or 0) + 1,
			"provisioning_error": "",
		}
	)
	previous_user = frappe.session.user
	previous_team = getattr(frappe.local, "team_name", None)
	frappe.set_user(team_doc.user)
	frappe.local.team_name = team_doc.name
	try:
		from press.api.site import create_site_on_private_bench

		deployment = create_site_on_private_bench(
			subdomain=order_doc.subdomain,
			plan=plan.name,
			cluster=validation["cluster"],
			apps=selected_apps,
			version=versions[0].name,
			provider="",
			server=validation["server"],
			commerce_order=order_doc.name,
		)
	finally:
		frappe.set_user(previous_user)
		if previous_team is None:
			try:
				delattr(frappe.local, "team_name")
			except AttributeError:
				pass
		else:
			frappe.local.team_name = previous_team
	order_doc.db_set("hostiran_site_group_deploy", deployment["site_group_deploy"])
	return {
		"name": order_doc.name,
		"status": order_doc.status,
		"hostiran_fulfillment_status": order_doc.hostiran_fulfillment_status,
		"hostiran_server": order_doc.hostiran_server,
		"hostiran_site_group_deploy": order_doc.hostiran_site_group_deploy,
	}


def provision_paid_order(order_name: str):
	"""Idempotently deliver a verified marketplace or hosting order."""
	order = frappe.get_doc("Commerce Order", order_name, for_update=True)
	if order.order_type == "Asumi Service":
		return order.status
	if order.status not in {"Paid", "Provisioning Failed"}:
		return order.status
	if (
		order.order_type == "Hosting"
		and order.service_delivery_mode == "Create New Site"
		and not order.site
		and not order.docker_site
	):
		if order.hostiran_site_group_deploy:
			return order.status
		order.db_set(
			{
				"hostiran_fulfillment_status": "VPS Ready" if order.hostiran_server else "Awaiting VPS",
				"provisioning_error": "",
			}
		)
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
		if order.order_type == "Hosting":
			return _provision_hosting_order(order)
		plan = frappe.get_doc("Marketplace App Plan", order.plan)
		app = frappe.get_doc("Marketplace App", order.marketplace_app)
		if (
			plan.app != app.name
			or not plan.enabled
			or int(plan.price_irr or 0) != int(order.amount)
			or plan.interval != order.interval
		):
			frappe.throw(_("مشخصات تعرفه با مبلغ ثبت‌شدهٔ سفارش تطابق ندارد."))
		if order.docker_site:
			site = frappe.get_doc("Docker Control Site", order.docker_site)
			installed_apps = [row.app for row in site.apps]
			if not site.enabled or site.team != order.team:
				frappe.throw(_("سایت سفارش دیگر فعال یا متعلق به تیم سفارش نیست."))
			available_apps = _docker_bench_apps()
		else:
			if not order.site:
				frappe.throw(_("سایت سفارش ثبت نشده است."))
			site = frappe.get_doc("Site", order.site)
			installed_apps = [row.app for row in site.apps]
			if not site or site.team != order.team or site.status != "Active":
				frappe.throw(_("سایت سفارش دیگر فعال یا متعلق به تیم سفارش نیست."))
			bench_apps = (
				[row.app for row in frappe.get_doc("Bench", site.bench).apps if row.app != "frappe"]
				if site.bench and frappe.db.exists("Bench", site.bench)
				else []
			)
			available_apps = bench_apps
		try:
			install_app = should_install_marketplace_app(
				app.app,
				bool(order.installation_required),
				installed_apps,
				available_apps,
			)
		except ValueError as error:
			frappe.throw(_(str(error)))
		if install_app:
			_install_marketplace_app_for_order(order, site, app)
			if order.docker_site:
				site = frappe.get_doc("Docker Control Site", order.docker_site)
			else:
				site = frappe.get_doc("Site", order.site)
			installed_apps = [row.app for row in site.apps]
		if app.app not in installed_apps:
			frappe.throw(_("موجودی سایت نصب برنامه را تأیید نکرد."))

		subscription = _get_app_subscription(order, app)
		previous_subscription = None
		if subscription:
			previous_subscription = {
				"plan": subscription.plan,
				"enabled": subscription.enabled,
				"team": subscription.team,
				"secret_key": subscription.secret_key,
			}
			subscription.plan = plan.name
			subscription.enabled = 1
			subscription.team = order.team
			subscription.save(ignore_permissions=True)
		else:
			subscription_values = {
				"doctype": "Press Subscription",
				"document_type": "Marketplace App",
				"document_name": app.app,
				"plan_type": "Marketplace App Plan",
				"plan": plan.name,
				"team": order.team,
				"enabled": 1,
			}
			if order.docker_site:
				subscription_values["docker_site"] = order.docker_site
			else:
				subscription_values["site"] = site.name
			subscription = frappe.get_doc(subscription_values).insert(ignore_permissions=True)
		_sync_marketplace_subscription_config(order, app, subscription.secret_key)
		service_start = frappe.utils.now_datetime()
		target_field = "docker_site" if order.docker_site else "site"
		previous_orders = frappe.get_all(
			"Commerce Order",
			filters={
				target_field: order.docker_site or order.site,
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
		failed_subscription = locals().get("subscription")
		if failed_subscription:
			try:
				recovery = subscription_recovery_state(locals().get("previous_subscription"))
				for field, value in recovery["fields"].items():
					setattr(failed_subscription, field, value)
				failed_subscription.save(ignore_permissions=True)
				if order.docker_site:
					_sync_docker_site_subscription(order.docker_site, order.app, recovery["secret_key"])
				else:
					_set_site_marketplace_subscription_key(
						order.site, order.app, recovery["secret_key"]
					)
			except Exception:
				frappe.log_error(
					f"Could not restore marketplace access after order {order.name} failed.",
					"Asumi Commerce",
				)
		order.db_set(
			{
				"status": transition_order("Provisioning", "Provisioning Failed"),
				"provisioning_error": str(error)[:500],
			}
		)
		frappe.log_error(f"Commerce order {order.name} provisioning failed: {error}", "Asumi Commerce")
		return order.status
	return order.status


def _provision_hosting_order(order):
	plan = frappe.get_doc("Site Plan", order.plan)
	current_interval = {"Daily": "Daily", "Monthly": "Monthly", "Annually": "Yearly"}.get(plan.interval)
	if (
		plan.document_type != "Site"
		or int(plan.price_irr or 0) != int(order.amount)
		or current_interval != order.interval
		or normalize_site_plan_delivery_mode(plan.commerce_delivery_mode) != order.service_delivery_mode
	):
		frappe.throw(_("مشخصات پلن با مبلغ ثبت‌شدهٔ سفارش تطابق ندارد."))

	if order.service_delivery_mode == "Create New Site":
		if order.site:
			# Preserve delivery of older orders already handed to Press's native Agent.
			site = frappe.get_doc("Site", order.site)
			site.reload()
			action = new_site_delivery_action(order.as_dict(), site.as_dict())
			if action == "wait":
				return order.status
			if action == "resume":
				site.unsuspend(reason="Asumi hosting plan renewed")
				site.save(ignore_permissions=True)
				site.reload()
				order.reload()
				if order.status == "Active":
					return order.status
				if new_site_delivery_action(order.as_dict(), site.as_dict()) != "activate":
					return order.status
			return _activate_hosting_order(order)

		if order.docker_site and order.name != frappe.db.get_value(
			"Docker Control Site", order.docker_site, "hosting_order"
		):
			site = frappe.get_doc("Docker Control Site", order.docker_site)
			original_order = frappe.get_doc("Commerce Order", site.hosting_order)
			try:
				action = new_hosted_site_renewal_action(
					order.as_dict(), site.as_dict(), original_order.as_dict()
				)
			except ValueError as error:
				frappe.throw(_(str(error)))
			if action == "resume":
				from press.api.docker_control import set_asumi_hosted_site_maintenance

				set_asumi_hosted_site_maintenance(order, site, enabled=False)
			return _activate_hosting_order(order)

		frappe.throw(_("برای سایت جدید، ابتدا VPS اختصاصی هاست‌ایران را در پنل سفارش ثبت کنید."))

	if not order.site:
		frappe.throw(_("سایت سفارش میزبانی ثبت نشده است."))
	site = frappe.get_doc("Site", order.site)
	if site.team != order.team or site.status != "Active":
		frappe.throw(_("سایت سفارش دیگر فعال یا متعلق به تیم سفارش نیست."))
	if site.plan != order.plan:
		from press.api.site import validate_plan

		current_user = frappe.session.user
		try:
			frappe.set_user(order.customer)
			validate_plan(site.server, plan.name)
			site.change_plan(plan.name, ignore_card_setup=True)
		finally:
			frappe.set_user(current_user)
	return _activate_hosting_order(order)


def _activate_hosting_order(order):
	if order.status == "Active":
		return order.status
	if order.status != "Provisioning":
		return order.status
	service_start = frappe.utils.now_datetime()
	target = order.docker_site or order.site
	previous_orders = frappe.get_all(
		"Commerce Order",
		filters={
			"order_type": "Hosting",
			"status": "Active",
			"service_ends_at": [">", service_start],
			"name": ["!=", order.name],
		},
		or_filters=[{"site": target}, {"docker_site": target}],
		fields=["service_ends_at"],
		order_by="service_ends_at desc",
		limit_page_length=1,
		ignore_permissions=True,
	)
	if previous_orders:
		service_start = previous_orders[0].service_ends_at
	values = {
		"status": transition_order("Provisioning", "Active"),
		"service_starts_at": service_start,
		"service_ends_at": period_end(service_start, order.interval),
		"provisioning_error": "",
	}
	if order.hostiran_server and order.hostiran_site_group_deploy:
		values["hostiran_fulfillment_status"] = "Active"
	order.db_set(values)
	return order.status


def update_hostiran_order_from_site_group_deploy(doc, method=None):
	"""Map private-bench deployment progress to its verified Asumi hosting order."""
	if doc.doctype != "Site Group Deploy" or not doc.commerce_order:
		return
	from press.saas.commerce.dedicated_hosting import is_verified_hostiran_deployment

	order = frappe.get_doc("Commerce Order", doc.commerce_order, for_update=True)
	if order.hostiran_site_group_deploy and order.hostiran_site_group_deploy != doc.name:
		return
	if not is_verified_hostiran_deployment(order, doc):
		return
	values = {"hostiran_site_group_deploy": doc.name}
	if doc.site:
		site = frappe.db.get_value(
			"Site",
			doc.site,
			["name", "team", "plan", "subdomain", "domain", "status"],
			as_dict=True,
		)
		if not (
			site
			and site.name == f"{order.subdomain}.{ASUMI_ROOT_DOMAIN}"
			and site.team == order.team
			and site.plan == order.plan
			and site.subdomain == order.subdomain
			and site.domain == ASUMI_ROOT_DOMAIN
		):
			values.update(
				{
					"status": transition_order("Provisioning", "Provisioning Failed"),
					"hostiran_fulfillment_status": "Failed",
					"provisioning_error": "سایت ساخته‌شده با سفارش، تیم یا زیردامنه تطابق ندارد.",
				}
			)
		else:
			values["site"] = doc.site
	if doc.status in {"Bench Deploy Failed", "Site Creation Failed"}:
		failure_message = (
			"راه‌اندازی بنچ خصوصی VPS ناموفق شد."
			if doc.status == "Bench Deploy Failed"
			else "ساخت سایت روی VPS ناموفق شد؛ وضعیت سایت را در Press بررسی کنید."
		)
		if order.status == "Provisioning":
			values["status"] = transition_order("Provisioning", "Provisioning Failed")
		values["hostiran_fulfillment_status"] = "Failed"
		values["provisioning_error"] = failure_message
	elif doc.status in {"Pending", "Deploying Bench", "Bench Deployed", "Creating Site", "Site Created"}:
		values["hostiran_fulfillment_status"] = (
			"Creating Site"
			if doc.status in {"Bench Deployed", "Creating Site", "Site Created"} or doc.site
			else "Deploying Bench"
		)
	order.db_set(values)
	if (
		doc.status == "Site Created"
		and order.status == "Provisioning"
		and doc.site
		and site
		and site.status == "Active"
		and not values.get("status")
	):
		order.reload()
		_activate_hosting_order(order)


def activate_new_site_commerce_orders(doc, method=None):
	"""Finish a paid new-site order when Press's Agent makes its Site active."""
	if doc.doctype != "Site" or doc.status not in {"Active", "Broken"}:
		return
	orders = frappe.get_all(
		"Commerce Order",
		filters={
			"site": doc.name,
			"team": doc.team,
			"order_type": "Hosting",
			"service_delivery_mode": "Create New Site",
			"status": "Provisioning",
		},
		fields=["name"],
		limit_page_length=20,
		ignore_permissions=True,
	)
	for row in orders:
		order = frappe.get_doc("Commerce Order", row.name, for_update=True)
		action = new_site_hosting_order_action(doc.status, order.status)
		if action == "fail":
			order.db_set(
				{
					"status": transition_order("Provisioning", "Provisioning Failed"),
					"provisioning_error": "ساخت سایت توسط بنچ با خطا متوقف شد.",
				}
			)
		elif action == "activate" and order.plan == doc.plan and order.subdomain == doc.subdomain:
			_activate_hosting_order(order)


def _sync_docker_site_subscription(site: str, app: str, secret_key: str | None) -> dict:
	from press.api.docker_control import _client, _host_doc

	return _client(_host_doc()).set_site_subscription(site, app, secret_key)


def _sync_marketplace_subscription_config(order, app, secret_key: str) -> None:
	if not secret_key:
		frappe.throw(_("کلید اشتراک برنامه ایجاد نشده است."))
	if order.docker_site:
		_sync_docker_site_subscription(order.docker_site, app.app, secret_key)
		return
	_set_site_marketplace_subscription_key(order.site, app.app, secret_key)


def _set_site_marketplace_subscription_key(
	site_name: str, app_name: str, secret_key: str | None
) -> None:
	"""Set or remove only the marketplace key while preserving the site's other config."""
	site = frappe.get_doc("Site", site_name)
	key = f"sk_{app_name}"
	configuration = [
		{"key": row.key, "value": row.value, "type": row.type}
		for row in site.configuration
		if row.key != key
	]
	if secret_key:
		configuration.append({"key": key, "value": secret_key, "type": "String"})
	site.update_site_config(configuration)


def _get_app_subscription(order, app):
	target_field = "docker_site" if order.docker_site else "site"
	target = order.docker_site or order.site
	rows = frappe.get_all(
		"Press Subscription",
		filters={
			target_field: target,
			"document_type": "Marketplace App",
			"plan_type": "Marketplace App Plan",
		},
		fields=["name", "plan", "document_name"],
		order_by="creation asc",
	)
	for row in rows:
		if row.document_name in {app.name, app.app}:
			return frappe.get_doc("Press Subscription", row.name)
		if row.plan and frappe.db.get_value("Marketplace App Plan", row.plan, "app") == app.name:
			return frappe.get_doc("Press Subscription", row.name)
	return None


def expire_commerce_orders():
	"""Expire direct-checkout access and return hosting sites to their prior state."""
	if not frappe.db.exists("DocType", "Commerce Order"):
		return
	now = frappe.utils.now_datetime()
	expired_orders = frappe.get_all(
		"Commerce Order",
		filters={"status": "Active", "service_ends_at": ["<=", now]},
		fields=["name", "site", "docker_site", "app", "plan", "marketplace_app", "subscription", "order_type", "original_plan"],
		limit_page_length=500,
		ignore_permissions=True,
	)
	for row in expired_orders:
		order = frappe.get_doc("Commerce Order", row.name, for_update=True)
		if order.status != "Active" or order.service_ends_at > now:
			continue
		if order.order_type == "Hosting":
			try:
				_restore_hosting_site_after_term(order, now)
			except Exception as error:
				frappe.log_error(
					f"Commerce hosting order {order.name} could not be restored after expiry: {error}",
					"Asumi Commerce",
				)
				continue
			order.db_set("status", transition_order("Active", "Expired"))
			continue
		subscription = frappe.get_doc("Press Subscription", order.subscription) if order.subscription else None
		if subscription and subscription.plan == order.plan:
			target_field = "docker_site" if order.docker_site else "site"
			future_orders = frappe.get_all(
				"Commerce Order",
				filters={
					target_field: order.docker_site or order.site,
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
				if order.docker_site:
					try:
						_sync_docker_site_subscription(order.docker_site, order.app, None)
					except Exception:
						frappe.log_error(
							f"Could not remove the expired app key for order {order.name}.",
							"Asumi Commerce",
						)
		order.db_set("status", transition_order("Active", "Expired"))


def _restore_hosting_site_after_term(order, now):
	if order.docker_site:
		if not frappe.db.exists("Docker Control Site", order.docker_site):
			return
		or_filters = [{"docker_site": order.docker_site}, {"site": order.docker_site}]
		for statuses, service_filter in (
			(["Active"], {"service_ends_at": [">", now]}),
			(["Paid", "Provisioning", "Provisioning Failed"], {}),
		):
			filters = {
				"order_type": "Hosting",
				"status": ["in", statuses],
				"name": ["!=", order.name],
				**service_filter,
			}
			if frappe.get_all(
				"Commerce Order",
				filters=filters,
				or_filters=or_filters,
				fields=["name"],
				limit_page_length=1,
				ignore_permissions=True,
			):
				return
		site = frappe.get_doc("Docker Control Site", order.docker_site)
		if site.hosting_plan != order.plan or site.hosted_status != "Active":
			return
		from press.api.docker_control import set_asumi_hosted_site_maintenance

		set_asumi_hosted_site_maintenance(order, site, enabled=True)
		return
	if not order.site or not frappe.db.exists("Site", order.site):
		return
	future_orders = frappe.get_all(
		"Commerce Order",
		filters={
			"site": order.site,
			"order_type": "Hosting",
			"status": "Active",
			"service_ends_at": [">", now],
			"name": ["!=", order.name],
		},
		fields=["name"],
		limit_page_length=1,
		ignore_permissions=True,
	)
	if future_orders:
		return
	paid_or_provisioning_orders = frappe.get_all(
		"Commerce Order",
		filters={
			"site": order.site,
			"order_type": "Hosting",
			"status": ["in", ["Paid", "Provisioning", "Provisioning Failed"]],
			"name": ["!=", order.name],
		},
		fields=["name"],
		limit_page_length=1,
		ignore_permissions=True,
	)
	if paid_or_provisioning_orders:
		return
	site = frappe.get_doc("Site", order.site)
	if site.plan != order.plan:
		return
	if order.original_plan and order.original_plan != order.plan and frappe.db.exists(
		"Site Plan", order.original_plan
	):
		site.change_plan(
			order.original_plan,
			ignore_card_setup=True,
			commerce_expiry_revert=True,
		)
	elif site.status == "Active":
		site.suspend(reason="Asumi hosting plan term expired")
		site.save(ignore_permissions=True)


@frappe.whitelist()
def my_orders(limit: int = 50) -> list[dict]:
	if frappe.session.user == "Guest":
		frappe.throw(_("Please sign in to view your orders."), frappe.AuthenticationError)
	team = get_current_team()
	rows = frappe.get_all(
		"Commerce Order",
		filters={"customer": frappe.session.user, "team": team},
		fields=["name", "status", "order_type", "plan", "interval", "marketplace_app", "app", "installation_required", "site", "docker_site", "subdomain", "service_delivery_mode", "hostiran_fulfillment_status", "service_title", "service_amount_toman", "service_quote_snapshot", "service_contact_name", "service_contact_phone", "service_company", "amount", "currency", "payment_reference", "paid_at", "service_starts_at", "service_ends_at", "authority", "sandbox_mode", "payment_error", "creation"],
		order_by="creation desc",
		limit_page_length=min(max(int(limit or 50), 1), 100),
		ignore_permissions=True,
	)
	for row in rows:
		row.site_label = row.site or row.docker_site or (f"{row.subdomain}.{ASUMI_ROOT_DOMAIN}" if row.subdomain else "")
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
		fields=["name", "status", "order_type", "plan", "interval", "marketplace_app", "app", "installation_required", "site", "docker_site", "subdomain", "service_delivery_mode", "hostiran_fulfillment_status", "hostiran_product_code_snapshot", "hostiran_monthly_cost_irr_snapshot", "hostiran_server", "hostiran_order_reference", "hostiran_site_group_deploy", "service_title", "service_amount_toman", "service_quote_snapshot", "service_contact_name", "service_contact_phone", "service_company", "team", "customer", "amount", "currency", "provider", "payment_reference", "paid_at", "service_starts_at", "service_ends_at", "agent_job", "install_backup", "install_backup_id", "install_operation", "provisioning_attempts", "provisioning_error", "payment_error", "refund_reference", "refund_note", "refunded_at", "refunded_by", "creation"],
		order_by="creation desc",
		limit_page_length=min(max(int(limit or 100), 1), 200),
		ignore_permissions=True,
	)


@frappe.whitelist(methods=["POST"])
def submit_service_request(
	service: str,
	full_name: str,
	phone: str,
	company: str = "",
	context: str = "",
	module_ids: str = "[]",
	addon_ids: str = "[]",
) -> dict:
	"""Save an authenticated service inquiry; this never creates a commerce order."""
	if frappe.session.user == "Guest":
		frappe.throw(_("برای ثبت درخواست بررسی، ابتدا وارد حساب آسومی شوید."), frappe.AuthenticationError)
	if not frappe.db.exists("DocType", "Erpyar Lead"):
		frappe.throw(_("ساختار ثبت درخواست در حال حاضر آماده نیست."))
	quote_snapshot = None
	if service == "module_pricing":
		try:
			module_selection = _parse_service_selection(module_ids, "module_ids")
			addon_selection = _parse_service_selection(addon_ids, "addon_ids")
			quote_snapshot = calculate_service_quote(module_selection, addon_selection, _get_service_prices())
			quote_snapshot["quoted_at"] = str(frappe.utils.now_datetime())
		except ValueError as error:
			frappe.throw(_(str(error)))
	try:
		lead_values = build_service_request_lead(
			service=service,
			full_name=full_name,
			phone=phone,
			company=company,
			context=context,
			quote_snapshot=quote_snapshot,
			source_path="/#website-design" if service == "website_design" else "/#pricing",
			source_host=frappe.local.request.host if getattr(frappe.local, "request", None) else "",
		)
	except ValueError as error:
		frappe.throw(_(str(error)))

	lead = frappe.get_doc({"doctype": "Erpyar Lead", **lead_values}).insert(ignore_permissions=True)
	result = {"name": lead.name, "status": lead.status}
	if quote_snapshot:
		result["quote"] = quote_snapshot
	return result


@frappe.whitelist(allow_guest=True)
def service_pricing() -> dict[str, dict[str, int]]:
	"""Return the public Asumi service price maps without other commerce settings."""
	return _get_service_prices()


@frappe.whitelist()
def admin_service_pricing() -> dict[str, dict[str, int]]:
	_require_commerce_admin()
	return _get_service_prices()


@frappe.whitelist(methods=["POST"])
def save_admin_service_pricing(
	module_prices: str,
	addon_prices: str,
	package_prices: str,
) -> dict[str, dict[str, int]]:
	_require_commerce_admin()
	try:
		prices = normalize_service_prices(
			json.loads(module_prices),
			json.loads(addon_prices),
			json.loads(package_prices),
		)
	except (json.JSONDecodeError, TypeError, ValueError) as error:
		frappe.throw(_(str(error)))

	doc = frappe.get_single("Asumi Service Pricing")
	doc.set("module_prices", json.dumps(prices["modules"], ensure_ascii=False, sort_keys=True))
	doc.set("addon_prices", json.dumps(prices["addons"], ensure_ascii=False, sort_keys=True))
	doc.set("package_prices", json.dumps(prices["packages"], ensure_ascii=False, sort_keys=True))
	doc.save(ignore_permissions=True)
	return prices


@frappe.whitelist()
def admin_service_requests(limit: int = 100) -> list[dict]:
	_require_commerce_admin()
	return frappe.get_all(
		"Erpyar Lead",
		filters=[["product_interest", "like", "asumi_service_request:%"]],
		fields=[
			"name",
			"full_name",
			"phone",
			"email",
			"company",
			"product_interest",
			"message",
			"status",
			"creation",
		],
		order_by="creation desc",
		limit_page_length=min(max(int(limit or 100), 1), 200),
		ignore_permissions=True,
	)


@frappe.whitelist(methods=["POST"])
def update_service_request_status(name: str, status: str) -> dict:
	_require_commerce_admin()
	try:
		status = normalize_service_request_status(status)
	except ValueError as error:
		frappe.throw(_(str(error)))

	lead = frappe.get_doc("Erpyar Lead", name, for_update=True)
	if not (lead.product_interest or "").startswith("asumi_service_request:"):
		frappe.throw(_("این سرنخ مربوط به درخواست خدمات آسومی نیست."), frappe.PermissionError)
	lead.status = status
	lead.save(ignore_permissions=True)
	return {"name": lead.name, "status": lead.status}


@frappe.whitelist()
def retry_provisioning(order: str) -> dict:
	_require_commerce_admin()
	doc = frappe.get_doc("Commerce Order", order, for_update=True)
	if doc.order_type == "Asumi Service":
		frappe.throw(_("سفارش خدمات آسومی به‌صورت دستی تحویل می‌شود و در صف نصب یا میزبانی قرار نمی‌گیرد."))
	if doc.status != "Provisioning Failed":
		frappe.throw(_("فقط سفارش‌های دارای خطای تحویل قابل تلاش مجدد هستند."))
	if (
		doc.order_type == "Hosting"
		and doc.service_delivery_mode == "Create New Site"
		and doc.hostiran_site_group_deploy
	):
		return _retry_hostiran_bench_deployment(doc)
	if doc.order_type == "Hosting" and doc.service_delivery_mode == "Create New Site" and doc.site:
		site_status = frappe.db.get_value("Site", doc.site, "status")
		if site_status == "Broken":
			frappe.throw(_("ابتدا سایت را از بخش مدیریت تعمیر کنید؛ سپس تحویل سفارش را دوباره اجرا کنید."))
		if site_status and site_status not in {"Pending", "Installing", "Updating", "Recovering", "Active", "Suspended"}:
			frappe.throw(_("وضعیت فعلی سایت برای تلاش مجدد تحویل مناسب نیست."))
	_enqueue_provision_paid_order(doc.name)
	return {"name": doc.name, "queued": True}


def _retry_hostiran_bench_deployment(order) -> dict:
	deployment = frappe.get_doc("Site Group Deploy", order.hostiran_site_group_deploy, for_update=True)
	if deployment.status == "Site Creation Failed" or deployment.site:
		frappe.throw(_("سایت ساخته‌شده را ابتدا از ابزارهای Press تعمیر کنید؛ این تلاش مجدد فقط برای خطای ساخت بنچ است."))
	if (
		deployment.status != "Bench Deploy Failed"
		or deployment.commerce_order != order.name
		or deployment.team != order.team
		or deployment.site_plan != order.plan
		or deployment.subdomain != order.subdomain
		or deployment.server != order.hostiran_server
		or not deployment.release_group
	):
		frappe.throw(_("وضعیت بنچ یا مشخصات VPS برای تلاش مجدد با سفارش تطابق ندارد."))
	plan = frappe.get_doc("Site Plan", order.plan)
	server = frappe.get_doc("Server", order.hostiran_server)
	try:
		validate_hostiran_fulfillment(order, plan, server, order.hostiran_order_reference)
	except ValueError as error:
		frappe.throw(_(str(error)))
	server_lock = hashlib.sha256(f"asumi-hostiran-server:{server.name}".encode()).hexdigest()[:40]
	if not _acquire_transaction_lock(server_lock):
		frappe.throw(_("این VPS هم‌زمان در حال استفاده است؛ کمی بعد تلاش کنید."))
	release_group = frappe.get_doc("Release Group", deployment.release_group)
	if release_group.team != order.team or release_group.server != server.name:
		frappe.throw(_("گروه بنچ به تیم یا VPS سفارش تعلق ندارد."))
	order.db_set(
		{
			"status": transition_order("Provisioning Failed", "Provisioning"),
			"hostiran_fulfillment_status": "Deploying Bench",
			"provisioning_error": "",
			"provisioning_attempts": int(order.provisioning_attempts or 0) + 1,
		}
	)
	deployment.status = "Deploying Bench"
	deployment.save(ignore_permissions=True)
	release_group.initial_deploy()
	return {
		"name": order.name,
		"queued": True,
		"hostiran_fulfillment_status": "Deploying Bench",
		"hostiran_site_group_deploy": deployment.name,
	}


@frappe.whitelist(methods=["POST"])
def update_service_order_status(order: str, status: str) -> dict:
	"""Record the two administrator-controlled delivery steps for Asumi services."""
	_require_commerce_admin()
	doc = frappe.get_doc("Commerce Order", order, for_update=True)
	if doc.order_type != "Asumi Service":
		frappe.throw(_("این سفارش از نوع خدمات آسومی نیست."), frappe.PermissionError)
	if status not in {"Provisioning", "Active"}:
		frappe.throw(_("وضعیت تحویل خدمات آسومی معتبر نیست."))
	try:
		next_status = transition_order(doc.status, status)
	except ValueError as error:
		frappe.throw(_(str(error)))
	values = {"status": next_status, "provisioning_error": ""}
	if next_status == "Active":
		start = frappe.utils.now_datetime()
		values["service_starts_at"] = start
		values["service_ends_at"] = period_end(start, "Monthly")
	doc.db_set(values)
	return {"name": doc.name, "status": next_status}


@frappe.whitelist()
def record_refund(order: str, refund_reference: str, refund_note: str = "") -> dict:
	"""Record a refund already completed through the payment provider dashboard."""
	_require_commerce_admin()
	doc = frappe.get_doc("Commerce Order", order, for_update=True)
	if doc.provider == "Free" or not int(doc.amount or 0):
		frappe.throw(_("برای سفارش رایگان امکان ثبت بازپرداخت وجود ندارد."))
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

	if doc.order_type == "Hosting" and doc.status in {"Active", "Provisioning Failed"}:
		_restore_hosting_site_after_term(doc, frappe.utils.now_datetime())
	elif doc.status == "Active" and doc.subscription:
		subscription = frappe.get_doc("Press Subscription", doc.subscription, for_update=True)
		if subscription.plan == doc.plan:
			target_field = "docker_site" if doc.docker_site else "site"
			other_active_orders = frappe.get_all(
				"Commerce Order",
				filters={
					target_field: doc.docker_site or doc.site,
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
				if doc.docker_site:
					try:
						_sync_docker_site_subscription(doc.docker_site, doc.app, None)
					except Exception:
						frappe.log_error(
							f"Could not remove the refunded app key for order {doc.name}.",
							"Asumi Commerce",
						)

	doc.db_set(refund_fields)
	return {"name": doc.name, "status": "Refunded", "refund_reference": refund_fields["refund_reference"]}


@frappe.whitelist()
def admin_marketplace_plans() -> list[dict]:
	_require_commerce_admin()
	app_names = [app.name for app in _sellable_marketplace_app_rows()]
	return frappe.get_all(
		"Marketplace App Plan",
		filters={"app": ["in", app_names or [""]]},
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
def admin_marketplace_plan_options() -> dict:
	_require_commerce_admin()
	return {
		"apps": sorted(
			(
				{"name": app.name, "title": app.title}
				for app in _sellable_marketplace_app_rows(published_only=True)
			),
			key=lambda app: (app["title"] or app["name"]).casefold(),
		)
	}


@frappe.whitelist(methods=["POST"])
def create_marketplace_plan_draft(app: str, title: str, interval: str) -> dict:
	_require_commerce_admin()
	available_apps = [app_doc.name for app_doc in _sellable_marketplace_app_rows(published_only=True)]
	try:
		values = build_marketplace_plan_draft(
			app=app,
			title=title,
			interval=interval,
			available_apps=available_apps,
		)
	except ValueError as error:
		frappe.throw(str(error))
	if frappe.db.exists(
		"Marketplace App Plan",
		{"app": values["app"], "title": values["title"], "interval": values["interval"]},
	):
		frappe.throw(_("برای این برنامه، تعرفه‌ای با همین نام و دوره وجود دارد."))
	doc = frappe.get_doc({"doctype": "Marketplace App Plan", **values}).insert(ignore_permissions=True)
	return {
		"name": doc.name,
		"app": doc.app,
		"title": doc.title,
		"interval": doc.interval,
		"enabled": bool(doc.enabled),
		"price_inr": doc.price_inr,
		"price_usd": doc.price_usd,
		"price_irr": doc.price_irr,
	}


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
	app_id = frappe.db.get_value("Marketplace App", doc.app, "app")
	if not is_marketplace_app_sellable(app_id):
		frappe.throw(_("این برنامه در فروشگاه آسومی قابل‌فروش نیست و تعرفهٔ جداگانه نمی‌پذیرد."))
	active_subscriptions = frappe.db.count(
		"Press Subscription",
		{"document_type": "Marketplace App", "plan_type": "Marketplace App Plan", "plan": plan, "enabled": 1},
	)
	pending_orders = frappe.db.count(
		"Commerce Order",
		{
			"plan": plan,
			"order_type": "Marketplace App",
			"status": ["in", ["Pending Payment", "Paid", "Provisioning", "Provisioning Failed"]],
		},
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
			"max_database_usage",
			"max_storage_usage",
			"memory",
			"cpu_time_per_day",
			"vcpu",
			"disk",
			"dedicated_server_plan",
			"private_bench_support",
			"hostiran_product_code",
			"hostiran_monthly_cost_irr",
		],
		order_by="plan_title asc",
		limit_page_length=500,
		ignore_permissions=True,
	)
	plan_names = [plan.name for plan in plans]
	if plan_names:
		release_groups = frappe.get_all(
			"Site Plan Release Group",
			filters={"parent": ["in", plan_names], "parenttype": "Site Plan"},
			fields=["parent", "release_group", "idx"],
			order_by="parent asc, idx asc",
			limit_page_length=5000,
			ignore_permissions=True,
		)
		allowed_apps = frappe.get_all(
			"Site Plan Allowed App",
			filters={"parent": ["in", plan_names], "parenttype": "Site Plan"},
			fields=["parent", "app", "idx"],
			order_by="parent asc, idx asc",
			limit_page_length=5000,
			ignore_permissions=True,
		)
		groups_by_plan = {}
		apps_by_plan = {}
		for row in release_groups:
			groups_by_plan.setdefault(row.parent, []).append(row.release_group)
		for row in allowed_apps:
			if row.app != "frappe":
				apps_by_plan.setdefault(row.parent, []).append(row.app)
		for plan in plans:
			plan.release_groups = (
				[]
				if normalize_site_plan_delivery_mode(plan.commerce_delivery_mode) == "Create New Site"
				else groups_by_plan.get(plan.name, [])
			)
			plan.allowed_apps = apps_by_plan.get(plan.name, [])
	for plan in plans:
		plan.commerce_delivery_mode = normalize_site_plan_delivery_mode(plan.commerce_delivery_mode)
	return plans


def _site_plan_app_choices() -> dict[str, list[str]]:
	choices = {HOSTIRAN_DEDICATED_VPS: ["frappe"]}
	versions = frappe.get_all(
		"Frappe Version",
		filters={"status": "stable"},
		fields=["name"],
		order_by="number desc",
		limit_page_length=1,
		ignore_permissions=True,
	)
	if versions:
		app_versions = frappe.get_all(
			"Marketplace App Version",
			filters={"version": versions[0].name},
			fields=["parent", "source"],
			limit_page_length=1000,
			ignore_permissions=True,
		)
		apps_with_sources = {row.parent for row in app_versions if row.source}
		published_apps = frappe.get_all(
			"Marketplace App",
			filters={"name": ["in", sorted(apps_with_sources) or [""]], "status": "Published"},
			fields=["name"],
			limit_page_length=1000,
			ignore_permissions=True,
		)
		choices[HOSTIRAN_DEDICATED_VPS] = ["frappe", *sorted({row.name for row in published_apps})]
	groups = frappe.get_all(
		"Release Group",
		filters={"enabled": 1, "public": 1},
		fields=["name", "version"],
		order_by="name asc",
		limit_page_length=200,
		ignore_permissions=True,
	)
	for group in groups:
		benches = frappe.get_all(
			"Bench",
			filters={"group": group.name, "status": "Active"},
			fields=["name"],
			limit_page_length=200,
			ignore_permissions=True,
		)
		apps = set()
		for bench in benches:
			apps.update(frappe.get_all("Bench App", filters={"parent": bench.name}, pluck="app"))
		if "frappe" in apps:
			choices[group.name] = sorted(apps)
	return choices


@frappe.whitelist()
def admin_site_plan_options() -> dict:
	_require_commerce_admin()
	apps_by_group = _site_plan_app_choices()
	return {
		"domain": ASUMI_ROOT_DOMAIN,
		"hostiran_product_note": "برای هر مشتری یک VPS جداگانه از هاست‌ایران تهیه می‌شود؛ خرید از پنل هاست‌ایران انجام می‌شود.",
		"hostiran_apps": apps_by_group.get(HOSTIRAN_DEDICATED_VPS, ["frappe"]),
		"release_groups": [
			{
				"name": name,
				"title": name,
				"apps": apps,
			}
			for name, apps in sorted(apps_by_group.items())
		],
	}


@frappe.whitelist(methods=["POST"])
def create_site_plan(
	name: str,
	title: str,
	interval: str,
	delivery_mode: str,
	description: str | None = None,
	release_groups=None,
	allowed_apps=None,
) -> dict:
	_require_commerce_admin()
	apps_by_group = _site_plan_app_choices()
	try:
		if isinstance(release_groups, str):
			release_groups = frappe.parse_json(release_groups)
		if isinstance(allowed_apps, str):
			allowed_apps = frappe.parse_json(allowed_apps)
		values = build_site_plan_draft(
			name=name,
			title=title,
			description=description,
			interval=interval,
			delivery_mode=delivery_mode,
			release_groups=release_groups,
			allowed_apps=allowed_apps,
			available_apps_by_group=apps_by_group,
		)
	except (TypeError, ValueError) as error:
		frappe.throw(str(error))
	if frappe.db.exists("Site Plan", values["name"]):
		frappe.throw(_("این شناسهٔ پلن قبلاً استفاده شده است."))
	doc = frappe.get_doc({"doctype": "Site Plan", **values})
	doc.insert(ignore_permissions=True)
	return {
		"name": doc.name,
		"plan_title": doc.plan_title,
		"enabled": bool(doc.enabled),
		"commerce_delivery_mode": normalize_site_plan_delivery_mode(doc.commerce_delivery_mode),
	}


@frappe.whitelist()
def save_site_plan_prices(
	plan: str,
	price_inr,
	price_usd,
	price_irr,
	delivery_mode: str | None = None,
	interval: str | None = None,
	enabled: bool | None = None,
	plan_title: str | None = None,
	plan_description: str | None = None,
	max_database_usage: int | str | None = None,
	max_storage_usage: int | str | None = None,
	memory: int | str | None = None,
	cpu_time_per_day: float | str | None = None,
	vcpu: int | str | None = None,
	disk: int | str | None = None,
	hostiran_product_code: str | None = None,
	hostiran_monthly_cost_irr: int | str | None = None,
	release_groups=None,
	allowed_apps=None,
) -> dict:
	_require_commerce_admin()
	doc = frappe.get_doc("Site Plan", plan, for_update=True)
	if doc.document_type != "Site":
		frappe.throw(_("این تعرفه برای فروش سرویس میزبانی نیست."))
	current = {field: getattr(doc, field, None) for field in (
		"price_inr", "price_usd", "price_irr", "interval", "enabled", "commerce_delivery_mode",
		"max_database_usage", "max_storage_usage", "memory", "cpu_time_per_day",
		"vcpu", "disk", "dedicated_server_plan", "private_bench_support",
		"hostiran_product_code", "hostiran_monthly_cost_irr",
	)}
	current["release_groups"] = [row.release_group for row in doc.release_groups]
	current["allowed_apps"] = [row.app for row in doc.allowed_apps]
	current["commerce_delivery_mode"] = normalize_site_plan_delivery_mode(current["commerce_delivery_mode"])
	payload = {"price_inr": price_inr, "price_usd": price_usd, "price_irr": price_irr}
	for field, value in (
		("delivery_mode", delivery_mode), ("interval", interval), ("enabled", enabled),
		("max_database_usage", max_database_usage), ("max_storage_usage", max_storage_usage),
		("memory", memory), ("cpu_time_per_day", cpu_time_per_day), ("vcpu", vcpu), ("disk", disk),
		("hostiran_product_code", hostiran_product_code),
		("hostiran_monthly_cost_irr", hostiran_monthly_cost_irr),
	):
		if value is not None:
			payload[field] = value
	active_subscriptions = frappe.db.count("Press Subscription", {"document_type": "Site", "plan": plan, "enabled": 1})
	pending_orders = frappe.db.count(
		"Commerce Order",
		{
			"plan": plan,
			"order_type": "Hosting",
			"status": ["in", ["Pending Payment", "Paid", "Provisioning", "Provisioning Failed"]],
		},
	)
	active_orders = frappe.db.count(
		"Commerce Order",
		{
			"plan": plan,
			"order_type": "Hosting",
			"status": "Active",
			"service_ends_at": [">", frappe.utils.now_datetime()],
		},
	)
	try:
		if isinstance(release_groups, str):
			release_groups = frappe.parse_json(release_groups)
		if isinstance(allowed_apps, str):
			allowed_apps = frappe.parse_json(allowed_apps)
		if release_groups is not None:
			payload["release_groups"] = release_groups
		if allowed_apps is not None:
			payload["allowed_apps"] = allowed_apps
		update = normalize_site_plan_admin_update(
			payload,
			current=current,
			has_orders=bool(active_subscriptions or pending_orders or active_orders),
			available_apps_by_group=_site_plan_app_choices()
			if "release_groups" in payload or "allowed_apps" in payload
			else None,
		)
	except ValueError as error:
		frappe.throw(str(error))
	group_names = update["values"].pop("release_groups", None)
	app_names = update["values"].pop("allowed_apps", None)
	doc.update(update["values"])
	if group_names is not None:
		doc.set("release_groups", [])
		for group in group_names:
			doc.append("release_groups", {"release_group": group})
	if app_names is not None:
		doc.set("allowed_apps", [])
		for app in app_names:
			doc.append("allowed_apps", {"app": app})
	if plan_title is not None:
		doc.plan_title = str(plan_title).strip()[:140]
	if plan_description is not None:
		doc.plan_description = str(plan_description).strip()[:140]
	doc.save(ignore_permissions=True)
	return {
		"name": doc.name,
		**update["values"],
		"plan_title": doc.plan_title,
		"plan_description": doc.plan_description,
		"commerce_delivery_mode": normalize_site_plan_delivery_mode(doc.commerce_delivery_mode),
		"release_groups": [row.release_group for row in doc.release_groups],
		"allowed_apps": [row.app for row in doc.allowed_apps],
	}


@frappe.whitelist()
def admin_settings() -> dict:
	_require_commerce_admin()
	settings = _get_settings()
	return {
		"enabled": bool(settings and settings.enabled),
		"allow_marketplace_app_sales": bool(settings and settings.allow_marketplace_app_sales),
		"allow_site_plan_sales": bool(settings and settings.allow_site_plan_sales),
		"allow_service_sales": bool(settings and settings.allow_service_sales),
		"sandbox_mode": bool(settings is None or settings.sandbox_mode),
		"merchant_id_configured": bool(_merchant_id(settings)),
		"hosting_min_free_disk_gb": getattr(settings, "hosting_min_free_disk_gb", 0) if settings else 0,
		"hosting_min_free_memory_gb": getattr(settings, "hosting_min_free_memory_gb", 0) if settings else 0,
	}


@frappe.whitelist()
def save_admin_settings(
	enabled: bool,
	allow_marketplace_app_sales: bool,
	sandbox_mode: bool,
	allow_site_plan_sales: bool | None = None,
	allow_service_sales: bool | None = None,
	merchant_id: str | None = None,
	hosting_min_free_disk_gb: float | str | None = None,
	hosting_min_free_memory_gb: float | str | None = None,
) -> dict:
	_require_commerce_admin()
	settings = _get_settings() or frappe.get_doc({"doctype": "Commerce Settings"})
	settings.enabled = int(frappe.utils.cint(enabled))
	settings.allow_marketplace_app_sales = int(frappe.utils.cint(allow_marketplace_app_sales))
	if allow_site_plan_sales is not None:
		settings.allow_site_plan_sales = int(frappe.utils.cint(allow_site_plan_sales))
	if allow_service_sales is not None:
		settings.allow_service_sales = int(frappe.utils.cint(allow_service_sales))
	settings.sandbox_mode = int(frappe.utils.cint(sandbox_mode))
	try:
		if hosting_min_free_disk_gb is not None:
			settings.hosting_min_free_disk_gb = normalize_capacity_reserve(
				hosting_min_free_disk_gb, allow_zero=True
			)
		if hosting_min_free_memory_gb is not None:
			settings.hosting_min_free_memory_gb = normalize_capacity_reserve(
				hosting_min_free_memory_gb, allow_zero=True
			)
	except ValueError as error:
		frappe.throw(str(error))
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
