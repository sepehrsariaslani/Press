"""Validation for the customer-service delivery choice on a Site Plan."""

import re

EXISTING_SITE_UPGRADE = "Upgrade Existing Site"
NEW_SITE_PROVISIONING = "Create New Site"
SITE_PLAN_DELIVERY_MODES = {EXISTING_SITE_UPGRADE, NEW_SITE_PROVISIONING}
ASUMI_SUBDOMAIN_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{3,30}[a-z0-9])$")


def has_active_wildcard_certificate(root_domain, certificates) -> bool:
	return any(
		certificate.get("domain") == root_domain
		and bool(certificate.get("wildcard"))
		and certificate.get("status") == "Active"
		for certificate in certificates or []
	)


def is_proxy_dns_ready(cname_result, a_result) -> bool:
	return bool((cname_result or {}).get("matched") or (a_result or {}).get("matched"))


def is_public_shared_site_server(server) -> bool:
	return bool(
		server
		and server.get("status") == "Active"
		and server.get("public")
		and server.get("proxy_server")
	)


def new_site_hosting_order_action(site_status, order_status):
	if order_status != "Provisioning":
		return None
	if site_status == "Active":
		return "activate"
	if site_status == "Broken":
		return "fail"
	return None


def normalize_site_plan_delivery_mode(value, default: str = EXISTING_SITE_UPGRADE) -> str:
	mode = value or default
	if mode not in SITE_PLAN_DELIVERY_MODES:
		raise ValueError("روش تحویل این تعرفه معتبر نیست")
	return mode


def new_site_delivery_action(order, site) -> str:
	"""Validate an existing new-site order target and return its safe next action."""
	if (
		not order
		or not site
		or any(order.get(key) != site.get(key) for key in ("team", "plan", "subdomain"))
		or site.get("domain") != "asumi.ir"
		or site.get("name") != f"{site.get('subdomain')}.asumi.ir"
	):
		raise ValueError("سایت ساخته‌شده با سفارش و تیم مشتری تطابق ندارد.")

	status = site.get("status")
	if status == "Active":
		return "activate"
	if status in {"Pending", "Installing", "Updating", "Recovering"}:
		return "wait"
	if status == "Suspended":
		return "resume"
	if status == "Broken":
		raise ValueError("ساخت سایت با خطا متوقف شده است؛ ابتدا سایت را از بخش مدیریت تعمیر کنید.")
	raise ValueError("وضعیت سایت برای تحویل سفارش قابل استفاده نیست.")


def is_verified_hosting_site_creation(order, site, current_user) -> bool:
	"""Allow the paid checkout flow to create only its verified Asumi site."""
	return bool(
		order
		and site
		and order.get("status") == "Provisioning"
		and order.get("order_type") == "Hosting"
		and order.get("service_delivery_mode") == NEW_SITE_PROVISIONING
		and order.get("customer") == current_user
		and order.get("team") == site.get("team")
		and order.get("plan") == site.get("subscription_plan")
		and order.get("subdomain") == site.get("subdomain")
		and site.get("domain") == "asumi.ir"
	)


def new_hosted_site_renewal_action(order, site, original_order) -> str:
	"""Validate a paid renewal for an existing Docker-hosted Asumi site."""
	if not order or not site or not original_order:
		raise ValueError("سفارش تمدید یا سایت میزبانی ثبت نشده است.")
	subdomain = (site.get("domain") or "").removesuffix(".asumi.ir")
	try:
		amount = int(order.get("amount") or 0)
	except (TypeError, ValueError):
		amount = 0
	if not (
		ASUMI_SUBDOMAIN_PATTERN.fullmatch(subdomain)
		and order.get("status") == "Provisioning"
		and order.get("order_type") == "Hosting"
		and order.get("service_delivery_mode") == NEW_SITE_PROVISIONING
		and order.get("provider") == "ZarinPal"
		and not order.get("sandbox_mode")
		and order.get("currency") == "IRR"
		and amount >= 10_000
		and order.get("paid_at")
		and order.get("payment_reference")
		and order.get("docker_site") == site.get("domain")
		and order.get("team") == site.get("team")
		and order.get("plan") == site.get("hosting_plan")
		and order.get("subdomain") == subdomain
		and original_order.get("name") == site.get("hosting_order")
		and original_order.get("order_type") == "Hosting"
		and original_order.get("service_delivery_mode") == NEW_SITE_PROVISIONING
		and original_order.get("status") in {"Active", "Expired"}
		and original_order.get("team") == site.get("team")
		and original_order.get("plan") == site.get("hosting_plan")
		and original_order.get("subdomain") == subdomain
		and original_order.get("docker_site") == site.get("domain")
	):
		raise ValueError("سفارش تمدید با سایت میزبانی‌شدهٔ آسومی تطابق ندارد.")
	if site.get("hosted_status") == "Suspended":
		return "resume"
	if site.get("hosted_status") == "Active":
		return "activate"
	raise ValueError("وضعیت سایت برای تمدید قابل استفاده نیست.")
