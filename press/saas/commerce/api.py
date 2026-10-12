from __future__ import annotations

import socket
import ssl
from urllib.parse import quote

import frappe
from frappe import _

from press.saas.commerce.order_lifecycle import (
	customer_provisioning_message,
	refund_order_update,
	transition_order,
)
from press.saas.commerce.order_snapshot import hosting_order_snapshot, marketplace_app_order_snapshot
from press.saas.commerce.periods import period_end
from press.saas.commerce.hosting_readiness import (
	build_hosting_readiness,
	hosting_plan_fits_capacity,
	normalize_capacity_reserve,
	resolve_ipv4,
)
from press.saas.commerce.pricing import (
	ZARINPAL_MINIMUM_AMOUNT_IRR,
	normalize_interval,
	normalize_price,
	normalize_zarinpal_price,
)
from press.saas.commerce.service_delivery import (
	has_active_wildcard_certificate,
	is_public_shared_site_server,
	is_proxy_dns_ready,
	new_site_delivery_action,
	new_site_hosting_order_action,
	normalize_site_plan_delivery_mode,
)
from press.saas.commerce.site_plan_admin import (
	build_site_plan_draft,
	normalize_site_plan_admin_update,
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
from press.utils import get_current_team, has_role, is_user_part_of_team, validate_subdomain
from press.utils.dns import check_dns_a, check_dns_cname

ASUMI_ROOT_DOMAIN = "asumi.ir"


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


def _checkout_enabled(settings, sale_type: str = "marketplace") -> bool:
	allow_sale = (
		getattr(settings, "allow_site_plan_sales", False)
		if sale_type == "hosting"
		else getattr(settings, "allow_marketplace_app_sales", False)
	)
	return bool(
		settings
		and settings.enabled
		and allow_sale
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
		"marketplace_apps_enabled": _checkout_enabled(settings, "marketplace"),
		"hosting_enabled": _checkout_enabled(settings, "hosting"),
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
		resources = resource_snapshot.get("resources")
		return {
			"connected": health.get("protocol_version") == 1
			and resource_snapshot.get("protocol_version") == 1,
			"resources": resources if isinstance(resources, dict) else {},
		}
	except Exception:
		return {"connected": False, "resources": {}}


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

	domain_doc = None
	if frappe.db.exists("Root Domain", ASUMI_ROOT_DOMAIN):
		domain_doc = frappe.get_doc("Root Domain", ASUMI_ROOT_DOMAIN)
	root_domain_ready = bool(domain_doc and domain_doc.enabled and domain_doc.default_cluster)

	root_addresses = _resolve_ipv4(ASUMI_ROOT_DOMAIN)
	wildcard_dns_ready = _wildcard_dns_targets_apex(root_addresses)
	certificate_record_ready = frappe.db.exists(
		"TLS Certificate",
		{"domain": ASUMI_ROOT_DOMAIN, "wildcard": 1, "status": "Active"},
	)
	wildcard_tls_ready = bool(certificate_record_ready and root_addresses and _wildcard_tls_ready(root_addresses))

	plans = frappe.get_all(
		"Site Plan",
		filters={
			"document_type": "Site",
			"enabled": 1,
			"is_trial_plan": 0,
			"legacy_plan": 0,
			"commerce_delivery_mode": "Create New Site",
			"private_bench_support": 0,
		},
		fields=["name", "plan_title", "price_irr", "interval", "max_storage_usage", "memory"],
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
			and plan.interval in {"Daily", "Monthly", "Annually"}
			and int(plan.max_storage_usage or 0) > 0
			and int(plan.memory or 0) > 0
		):
			valid_plans.append(plan)

	docker_snapshot = _live_docker_snapshot()
	resources = docker_snapshot["resources"]
	try:
		reserve_disk = normalize_capacity_reserve(
			getattr(settings, "hosting_min_free_disk_gb", None), allow_zero=True
		)
		reserve_memory = normalize_capacity_reserve(
			getattr(settings, "hosting_min_free_memory_gb", None), allow_zero=True
		)
	except ValueError:
		reserve_disk = reserve_memory = 0
	disk_free = resources.get("disk_free_bytes")
	memory_available = resources.get("memory_available_bytes")
	capacity_ready = bool(
		reserve_disk > 0
		and reserve_memory > 0
		and any(
			hosting_plan_fits_capacity(plan.as_dict(), resources, reserve_disk, reserve_memory)
			for plan in valid_plans
		)
	)
	if not valid_plans:
		capacity_detail = "پلن ساخت سایت پولی با سقف معتبر دیسک و حافظه ثبت نشده است."
	elif not docker_snapshot["connected"] or not isinstance(disk_free, int) or not isinstance(memory_available, int):
		capacity_detail = "اطلاعات زندهٔ منابع Docker در دسترس نیست."
	elif reserve_disk <= 0 or reserve_memory <= 0:
		capacity_detail = "حداقل فضای آزاد دیسک و حافظه را در تنظیمات تعیین کنید؛ مقدار صفر یعنی ظرفیت تأیید نشده است."
	elif capacity_ready:
		capacity_detail = (
			f"فضای آزاد دیسک: {disk_free / 1024**3:.1f} گیگابایت؛ "
			f"حافظهٔ در دسترس: {memory_available / 1024**3:.1f} گیگابایت؛ ذخیرهٔ تعریف‌شده رعایت می‌شود."
		)
	else:
		capacity_detail = (
			f"فضای آزاد: دیسک {disk_free / 1024**3:.1f} و حافظه "
			f"{memory_available / 1024**3:.1f} گیگابایت است؛ برای هیچ پلنی سقف منابع و ذخیرهٔ تعریف‌شده جا نمی‌شود."
		)
	docker_connected = docker_snapshot["connected"]
	press_infrastructure_ready = _press_shared_bench_ready(domain_doc)

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
				"دامنهٔ asumi.ir در Press فعال است."
				if root_domain_ready
				else "Root Domain با نام asumi.ir و یک Cluster پیش‌فرض در Press ثبت کنید."
			),
		},
		"wildcard_dns": {
			"ready": wildcard_dns_ready,
			"detail": (
				"زیردامنهٔ آزمایشی به همان سرور دامنهٔ اصلی می‌رسد."
				if wildcard_dns_ready
				else "رکورد DNS از نوع * برای زیردامنه‌های asumi.ir به سرور میزبان اضافه کنید."
			),
		},
		"wildcard_tls": {
			"ready": wildcard_tls_ready,
			"detail": (
				"گواهی معتبر HTTPS نام زیردامنه را پوشش می‌دهد."
				if wildcard_tls_ready
				else "گواهی TLS wildcard برای *.asumi.ir نصب و در Press ثبت کنید."
			),
		},
		"press_infrastructure": {
			"ready": press_infrastructure_ready,
			"detail": (
				"بنچ عمومی، Release Group و Proxy آماده‌اند."
				if press_infrastructure_ready
				else "سرور عمومی، بنچ فعال، Release Group و اتصال Proxy در Press لازم است."
			),
		},
		"capacity": {"ready": capacity_ready, "detail": capacity_detail},
		"docker_agent": {
			"ready": docker_connected,
			"detail": "عامل Docker پاسخ می‌دهد." if docker_connected else "عامل Docker متصل یا پاسخ‌گو نیست.",
		},
	}
	return build_hosting_readiness(facts, resources)


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


def _new_site_plan_config(
	plan_doc, subdomain: str | None = None, docker_snapshot: dict | None = None
) -> dict | None:
	"""Resolve a configured public Site Plan to one existing shared bench."""
	if plan_doc.private_bench_support:
		return None
	settings = _get_settings()
	try:
		reserve_disk = normalize_capacity_reserve(
			getattr(settings, "hosting_min_free_disk_gb", None)
		)
		reserve_memory = normalize_capacity_reserve(
			getattr(settings, "hosting_min_free_memory_gb", None)
		)
	except ValueError:
		return None
	docker_snapshot = docker_snapshot or _live_docker_snapshot()
	if not docker_snapshot["connected"] or not hosting_plan_fits_capacity(
		plan_doc.as_dict(), docker_snapshot["resources"], reserve_disk, reserve_memory
	):
		return None
	if not frappe.db.exists("Root Domain", ASUMI_ROOT_DOMAIN):
		return None
	domain = frappe.get_doc("Root Domain", ASUMI_ROOT_DOMAIN)
	if not domain.enabled or not domain.default_cluster:
		return None
	wildcard_certificates = frappe.get_all(
		"TLS Certificate",
		filters={"domain": ASUMI_ROOT_DOMAIN, "wildcard": 1, "status": "Active"},
		fields=["domain", "wildcard", "status"],
		limit_page_length=5,
	)
	if not has_active_wildcard_certificate(ASUMI_ROOT_DOMAIN, wildcard_certificates):
		return None
	root_addresses = _resolve_ipv4(ASUMI_ROOT_DOMAIN)
	if (
		not root_addresses
		or not _wildcard_dns_targets_apex(root_addresses)
		or not _wildcard_tls_ready(root_addresses)
	):
		return None

	allowed_apps = frappe.get_all(
		"Site Plan Allowed App",
		filters={"parent": plan_doc.name, "parenttype": "Site Plan", "parentfield": "allowed_apps"},
		pluck="app",
	)
	release_groups = frappe.get_all(
		"Site Plan Release Group",
		filters={"parent": plan_doc.name, "parenttype": "Site Plan", "parentfield": "release_groups"},
		pluck="release_group",
	)
	if not release_groups:
		return None

	for group_name in release_groups:
		group = frappe.db.get_value(
			"Release Group", group_name, ["enabled", "public", "version"], as_dict=True
		)
		if not group or not group.enabled or not group.public or not group.version:
			continue
		benches = frappe.get_all(
			"Bench",
			filters={"group": group_name, "cluster": domain.default_cluster, "status": "Active"},
			fields=["name", "server"],
			order_by="creation desc",
			limit_page_length=50,
		)
		for bench in benches:
			server = frappe.db.get_value(
				"Server", bench.server, ["status", "public", "proxy_server"], as_dict=True
			)
			if not is_public_shared_site_server(server):
				continue
			proxy_status = frappe.db.get_value("Proxy Server", server.proxy_server, "status")
			if proxy_status != "Active" or not frappe.db.exists(
				"Proxy Server Domain", {"parent": server.proxy_server, "domain": ASUMI_ROOT_DOMAIN}
			):
				continue

			bench_apps = [row.app for row in frappe.get_doc("Bench", bench.name).apps]
			if "frappe" not in bench_apps:
				continue
			if allowed_apps:
				if "frappe" not in allowed_apps:
					continue
				available_apps = [app for app in allowed_apps if app in bench_apps and app != "frappe"]
			else:
				available_apps = [app for app in bench_apps if app != "frappe"]

			if domain.dns_provider == "Generic":
				try:
					checked_subdomain = subdomain or "asumi-hosting-check"
					validate_subdomain(checked_subdomain)
					proxy_hostname = frappe.db.get_value("Proxy Server", server.proxy_server, "host_name")
					if not proxy_hostname:
						return None
					requested_domain = f"{checked_subdomain}.{ASUMI_ROOT_DOMAIN}"
					dns_cname = check_dns_cname(proxy_hostname, requested_domain)
					dns_a = check_dns_a(proxy_hostname, requested_domain)
				except Exception:
					return None
				if not is_proxy_dns_ready(dns_cname, dns_a):
					return None

			return {
				"domain": ASUMI_ROOT_DOMAIN,
				"cluster": domain.default_cluster,
				"group": group_name,
				"version": group.version,
				"apps": available_apps,
				"bench": bench.name,
				"server": bench.server,
			}
	return None


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
		fields=["site"],
		limit_page_length=500,
		ignore_permissions=True,
	)
	site_names = list({row.site for row in orders if row.site})
	if not site_names:
		return []
	return frappe.get_all(
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
	docker_snapshot = (
		_live_docker_snapshot()
		if any(plan.commerce_delivery_mode == "Create New Site" for plan in plans)
		else None
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
		config = (
			_new_site_plan_config(frappe.get_doc("Site Plan", plan.name), docker_snapshot=docker_snapshot)
			if mode == "Create New Site"
			else None
		)
		renewable_sites = (
			_new_site_plan_renewal_sites(plan.name, team.name)
			if mode == "Create New Site"
			else []
		)
		ready = (
			_checkout_enabled(settings, "hosting")
			and price_valid
			and valid_interval
			and (bool(sites) if mode == "Upgrade Existing Site" else bool(config or renewable_sites))
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
				"message": "" if ready else "تنظیمات پرداخت، ظرفیت یا دامنهٔ این پلن هنوز آمادهٔ خرید نیست.",
			}
		)
	return {
		"plans": offers,
		"sites": [{key: site.get(key) for key in ("name", "subdomain", "domain", "plan")} for site in sites],
		"checkout_enabled": _checkout_enabled(settings, "hosting"),
		"domain": ASUMI_ROOT_DOMAIN,
	}


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
		{"site": site, "plan": plan_doc.name, "order_type": "Marketplace App", "status": "Active"},
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
	if isinstance(order_values.get("apps"), list):
		order_values["apps"] = frappe.as_json(order_values["apps"])
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
	if not _checkout_enabled(settings, "hosting"):
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
		selected_site = frappe.db.get_value(
			"Site",
			site,
			["name", "team", "status", "plan", "server", "cluster", "group", "subdomain", "domain"],
			as_dict=True,
		)
		allowed_statuses = {"Active"}
		if delivery_mode == "Create New Site":
			allowed_statuses.add("Suspended")
		if not selected_site or selected_site.team != team.name or selected_site.status not in allowed_statuses:
			frappe.throw(_("سایت انتخاب‌شده فعال نیست یا به این حساب تعلق ندارد."), frappe.PermissionError)
	if is_new_site_renewal and not frappe.db.exists(
		"Commerce Order",
		{
			"site": selected_site.name,
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
			config = _new_site_plan_config(plan_doc, snapshot["subdomain"])
			if not config:
				frappe.throw(_("دامنه، گواهی یا ظرفیت ساخت سایت جدید هنوز آماده نیست؛ سفارش ثبت نشد."))
			if any(app not in config["apps"] for app in snapshot["apps"]):
				frappe.throw(_("یکی از برنامه‌های انتخاب‌شده روی بنچ این پلن آماده نیست."))
			full_site_name = f"{snapshot['subdomain']}.{ASUMI_ROOT_DOMAIN}"
			if frappe.db.exists("Site", full_site_name):
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
		"site": snapshot["site"],
		"subdomain": snapshot["subdomain"],
		"order_type": "Hosting",
	}
	if snapshot["service_delivery_mode"] == "Create New Site":
		lock_name = f"asumi-site:{snapshot['subdomain']}"
		lock = frappe.db.sql("SELECT GET_LOCK(%s, 10)", (lock_name,), as_list=True)
		if not lock or lock[0][0] != 1:
			frappe.throw(_("ثبت این زیردامنه هم‌اکنون در حال انجام است؛ کمی بعد دوباره تلاش کنید."))
		try:
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
		finally:
			frappe.db.sql("SELECT RELEASE_LOCK(%s)", (lock_name,))

	return _create_zarinpal_checkout(
		snapshot,
		settings,
		f"Asumi hosting plan: {plan_doc.plan_title or plan_doc.name}",
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
	"""Idempotently deliver a verified marketplace or hosting order."""
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
		if order.order_type == "Hosting":
			return _provision_hosting_order(order)
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
		if not order.site:
			config = _new_site_plan_config(plan, order.subdomain)
			if not config:
				frappe.throw(_("دامنه، گواهی یا ظرفیت بنچ برای ساخت این سایت دیگر آماده نیست."))
			apps = frappe.parse_json(order.apps or "[]")
			if any(app not in config["apps"] for app in apps):
				frappe.throw(_("یکی از برنامه‌های سفارش روی بنچ انتخاب‌شده آماده نیست."))
			if frappe.db.exists("Site", f"{order.subdomain}.{ASUMI_ROOT_DOMAIN}"):
				frappe.throw(_("این زیردامنه پس از ثبت سفارش در دسترس نیست."))
			team = frappe.get_doc("Team", order.team)
			if not team.enabled:
				frappe.throw(_("این حساب غیرفعال است و امکان ساخت سایت ندارد."))
			frappe.db.savepoint("asumi_hosting_site")
			try:
				current_user = frappe.session.user
				try:
					frappe.set_user(order.customer)
					site_doc = frappe.get_doc(
						{
							"doctype": "Site",
							"subdomain": order.subdomain,
							"domain": config["domain"],
							"cluster": config["cluster"],
							"group": config["group"],
							"bench": config["bench"],
							"server": config["server"],
							"apps": [{"app": app} for app in ["frappe", *apps]],
							"team": order.team,
							"free": team.free_account,
							"subscription_plan": plan.name,
							"version": config["version"],
						}
					)
					site_doc.flags.commerce_hosting_order = order.name
					site = site_doc.insert(ignore_permissions=True)
				finally:
					frappe.set_user(current_user)
				if site.team != order.team or site.plan != order.plan:
					frappe.throw(_("سایت ساخته‌شده با سفارش و تیم مشتری تطابق ندارد."))
				job = site.flags.get("new_site_agent_job_name") or frappe.db.get_value(
					"Agent Job",
					{"site": site.name, "job_type": ("in", ["New Site", "New Site from Backup"])},
				)
				order.db_set({"site": site.name, "agent_job": job or ""})
				order.reload()
			except Exception:
				frappe.db.rollback(save_point="asumi_hosting_site")
				raise
		else:
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
	previous_orders = frappe.get_all(
		"Commerce Order",
		filters={
			"site": order.site,
			"order_type": "Hosting",
			"status": "Active",
			"service_ends_at": [">", service_start],
			"name": ["!=", order.name],
		},
		fields=["service_ends_at"],
		order_by="service_ends_at desc",
		limit_page_length=1,
		ignore_permissions=True,
	)
	if previous_orders:
		service_start = previous_orders[0].service_ends_at
	order.db_set(
		{
			"status": transition_order("Provisioning", "Active"),
			"service_starts_at": service_start,
			"service_ends_at": period_end(service_start, order.interval),
			"provisioning_error": "",
		}
	)
	return order.status


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
	"""Expire direct-checkout access and return hosting sites to their prior state."""
	if not frappe.db.exists("DocType", "Commerce Order"):
		return
	now = frappe.utils.now_datetime()
	expired_orders = frappe.get_all(
		"Commerce Order",
		filters={"status": "Active", "service_ends_at": ["<=", now]},
		fields=["name", "site", "plan", "marketplace_app", "subscription", "order_type", "original_plan"],
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


def _restore_hosting_site_after_term(order, now):
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
		fields=["name", "status", "order_type", "plan", "interval", "marketplace_app", "site", "subdomain", "service_delivery_mode", "amount", "currency", "payment_reference", "paid_at", "service_starts_at", "service_ends_at", "authority", "sandbox_mode", "payment_error", "creation"],
		order_by="creation desc",
		limit_page_length=min(max(int(limit or 50), 1), 100),
		ignore_permissions=True,
	)
	for row in rows:
		row.site_label = row.site or (f"{row.subdomain}.{ASUMI_ROOT_DOMAIN}" if row.subdomain else "")
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
		fields=["name", "status", "order_type", "plan", "interval", "marketplace_app", "site", "subdomain", "service_delivery_mode", "team", "customer", "amount", "currency", "payment_reference", "paid_at", "service_starts_at", "service_ends_at", "provisioning_attempts", "provisioning_error", "payment_error", "refund_reference", "refund_note", "refunded_at", "refunded_by", "creation"],
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
	if doc.order_type == "Hosting" and doc.service_delivery_mode == "Create New Site" and doc.site:
		site_status = frappe.db.get_value("Site", doc.site, "status")
		if site_status == "Broken":
			frappe.throw(_("ابتدا سایت را از بخش مدیریت تعمیر کنید؛ سپس تحویل سفارش را دوباره اجرا کنید."))
		if site_status and site_status not in {"Pending", "Installing", "Updating", "Recovering", "Active", "Suspended"}:
			frappe.throw(_("وضعیت فعلی سایت برای تلاش مجدد تحویل مناسب نیست."))
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

	if doc.order_type == "Hosting" and doc.status in {"Active", "Provisioning Failed"}:
		_restore_hosting_site_after_term(doc, frappe.utils.now_datetime())
	elif doc.status == "Active" and doc.subscription:
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
			plan.release_groups = groups_by_plan.get(plan.name, [])
			plan.allowed_apps = apps_by_plan.get(plan.name, [])
	for plan in plans:
		plan.commerce_delivery_mode = normalize_site_plan_delivery_mode(plan.commerce_delivery_mode)
	return plans


def _site_plan_app_choices() -> dict[str, list[str]]:
	choices = {}
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
		"release_groups": [
			{"name": name, "apps": apps} for name, apps in sorted(apps_by_group.items())
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
	)}
	current["release_groups"] = [row.release_group for row in doc.release_groups]
	current["allowed_apps"] = [row.app for row in doc.allowed_apps]
	current["commerce_delivery_mode"] = normalize_site_plan_delivery_mode(current["commerce_delivery_mode"])
	payload = {"price_inr": price_inr, "price_usd": price_usd, "price_irr": price_irr}
	for field, value in (
		("delivery_mode", delivery_mode), ("interval", interval), ("enabled", enabled),
		("max_database_usage", max_database_usage), ("max_storage_usage", max_storage_usage),
		("memory", memory), ("cpu_time_per_day", cpu_time_per_day),
	):
		if value is not None:
			payload[field] = value
	active_subscriptions = frappe.db.count("Subscription", {"document_type": "Site", "plan": plan, "enabled": 1})
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
