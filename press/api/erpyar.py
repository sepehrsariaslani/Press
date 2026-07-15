from __future__ import annotations

from urllib.parse import urlparse

import frappe
from frappe.rate_limiter import rate_limit
from frappe.utils import cstr, validate_email_address, validate_phone_number

ALLOWED_HOSTS = {"erpyar.ir", "www.erpyar.ir"}
ALLOWED_LEAD_TYPES = {"contact", "demo"}
LEAD_SOURCE_PATH_BY_TYPE = {
	"contact": "/contact",
	"demo": "/demo",
}
MAX_LENGTHS = {
	"full_name": 140,
	"company": 140,
	"phone": 32,
	"email": 140,
	"product_interest": 140,
	"company_size": 80,
	"message": 3000,
	"source_path": 64,
	"source_host": 64,
	"referrer": 280,
	"utm_source": 120,
	"utm_medium": 120,
	"utm_campaign": 120,
}


class LeadValidationError(Exception):
	def __init__(self, message: str, status_code: int = 400):
		super().__init__(message)
		self.status_code = status_code


def _request_host() -> str:
	request = getattr(frappe.local, "request", None)
	host = (getattr(request, "host", "") or "").split(":", 1)[0].lower()
	return host


def _sanitize_text(value: str | None, fieldname: str, *, multiline: bool = False) -> str:
	value = cstr(value or "").strip()
	if multiline:
		value = value.replace("\r", "")
	else:
		value = " ".join(value.split())

	max_length = MAX_LENGTHS[fieldname]
	if len(value) > max_length:
		raise LeadValidationError(f"{fieldname} is too long")
	return value


def _sanitize_source_path(source_path: str | None, lead_type: str) -> str:
	expected_path = LEAD_SOURCE_PATH_BY_TYPE[lead_type]
	if not source_path:
		return expected_path

	source_path = cstr(source_path).strip()
	parsed = urlparse(source_path)
	if parsed.scheme or parsed.netloc:
		raise LeadValidationError("Invalid source path")

	normalized_path = parsed.path or "/"
	normalized_path = "/" + normalized_path.strip("/") if normalized_path != "/" else "/"
	if normalized_path != expected_path:
		raise LeadValidationError("Invalid source path")
	if len(normalized_path) > MAX_LENGTHS["source_path"]:
		raise LeadValidationError("source_path is too long")

	return normalized_path


def _get_referrer_from_header() -> str:
	request = getattr(frappe.local, "request", None)
	referrer = ""
	if request and hasattr(request, "headers"):
		referrer = request.headers.get("Referer") or request.headers.get("Referrer") or ""
	return _sanitize_text(referrer, "referrer")


def _error_response(message: str, status_code: int):
	frappe.local.response["http_status_code"] = status_code
	return {"ok": False, "message": message}


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=20, seconds=60 * 10)
def submit_lead(
	lead_type: str,
	full_name: str,
	phone: str,
	email: str | None = None,
	company: str | None = None,
	product_interest: str | None = None,
	company_size: str | None = None,
	message: str | None = None,
	source_path: str | None = None,
	utm_source: str | None = None,
	utm_medium: str | None = None,
	utm_campaign: str | None = None,
	website: str | None = None,
):
	try:
		host = _request_host()
		if host not in ALLOWED_HOSTS:
			raise LeadValidationError("Forbidden host", status_code=403)

		if cstr(website or "").strip():
			raise LeadValidationError("Spam check failed")

		normalized_lead_type = " ".join(cstr(lead_type or "").split()).strip().lower()
		if len(normalized_lead_type) > 20:
			raise LeadValidationError("Invalid lead type")
		if normalized_lead_type not in ALLOWED_LEAD_TYPES:
			raise LeadValidationError("Invalid lead type")

		normalized_full_name = _sanitize_text(full_name, "full_name")
		normalized_phone = _sanitize_text(phone, "phone")
		validate_phone_number(normalized_phone, throw=True)

		normalized_email = _sanitize_text(email, "email") if email else ""
		if normalized_email:
			validate_email_address(normalized_email, throw=True)

		normalized_company = _sanitize_text(company, "company") if company else ""
		normalized_product_interest = (
			_sanitize_text(product_interest, "product_interest") if product_interest else ""
		)
		normalized_company_size = _sanitize_text(company_size, "company_size") if company_size else ""
		normalized_message = _sanitize_text(message, "message", multiline=True) if message else ""

		if normalized_lead_type == "contact" and not normalized_message:
			raise LeadValidationError("message is required")
		if normalized_lead_type == "demo" and not normalized_product_interest:
			raise LeadValidationError("product_interest is required")

		normalized_source_path = _sanitize_source_path(source_path, normalized_lead_type)
		normalized_referrer = _get_referrer_from_header()
		normalized_utm_source = _sanitize_text(utm_source, "utm_source") if utm_source else ""
		normalized_utm_medium = _sanitize_text(utm_medium, "utm_medium") if utm_medium else ""
		normalized_utm_campaign = _sanitize_text(utm_campaign, "utm_campaign") if utm_campaign else ""

		lead = frappe.get_doc(
			{
				"doctype": "Erpyar Lead",
				"full_name": normalized_full_name,
				"lead_type": normalized_lead_type,
				"status": "New",
				"company": normalized_company,
				"phone": normalized_phone,
				"email": normalized_email,
				"product_interest": normalized_product_interest,
				"company_size": normalized_company_size,
				"message": normalized_message,
				"source_path": normalized_source_path,
				"source_host": host[: MAX_LENGTHS["source_host"]],
				"referrer": normalized_referrer,
				"utm_source": normalized_utm_source,
				"utm_medium": normalized_utm_medium,
				"utm_campaign": normalized_utm_campaign,
			}
		).insert(ignore_permissions=True)

		return {"ok": True, "message": "Lead submitted successfully", "lead_id": lead.name}

	except LeadValidationError as exc:
		return _error_response(str(exc), exc.status_code)
	except frappe.ValidationError:
		return _error_response("Invalid lead data", 400)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Erpyar Lead Submission")
		return _error_response("Unable to submit lead right now", 500)


@frappe.whitelist(allow_guest=True, methods=["POST"])
def provision_trial_site(slug: str, email: str, addons: str | None = None):
	"""
	Self-serve trial provisioning foundation (Phases 3 & 4).
	Prepares and validates the creation of slug.erpyar.ir trial site.
	"""
	slug = cstr(slug or "").strip().lower()
	email = cstr(email or "").strip().lower()
	if not slug:
		return _error_response("Subdomain (slug) is required", 400)
	if not email:
		return _error_response("Email address is required", 400)

	try:
		validate_email_address(email, throw=True)
	except Exception:
		return _error_response("Invalid email address", 400)

	if not slug.isalnum():
		return _error_response("Subdomain must be alphanumeric only", 400)

	# Check if site already exists
	existing_site = frappe.db.exists("Site", {"subdomain": slug, "domain": "erpyar.ir"})
	if existing_site:
		return _error_response("این آدرس قبلاً ثبت شده است. لطفاً آدرس دیگری انتخاب کنید.", 400)

	from frappe.utils import add_days, getdate
	today = getdate()
	trial_end = add_days(today, 14)

	addon_ids = [a.strip() for f in (addons or "").split(",") if (a := f.strip())]
	apps_to_install = []
	for addon_id in addon_ids:
		if addon_id == "erpnext":
			apps_to_install.append({"app": "erpnext"})
		elif addon_id == "crm":
			apps_to_install.append({"app": "crm"})
		elif addon_id == "restaurant":
			apps_to_install.append({"app": "restaurant"})
		elif addon_id == "coffeeyar":
			apps_to_install.append({"app": "coffeeyar"})

	try:
		bench = frappe.db.get_value("Bench", {"status": "Active"}, "name")
		server = frappe.db.get_value("Server", {"status": "Active"}, "name")

		team = frappe.db.get_value("Team", {"user": email}, "name")
		if not team:
			team = frappe.db.get_value("Team", {}, "name") or "Primary Team"

		site_doc = frappe.get_doc({
			"doctype": "Site",
			"subdomain": slug,
			"domain": "erpyar.ir",
			"bench": bench or "primary-bench",
			"server": server or "primary-server",
			"team": team,
			"status": "Pending",
			"apps": apps_to_install,
			"trial_end_date": trial_end,
			"free": 0,
			"is_standby": 0,
		})

		site_doc.insert(ignore_permissions=True)

		return {
			"ok": True,
			"message": "سایت آزمایشی شما با موفقیت رزرو شد و در صف راه‌اندازی قرار گرفت.",
			"site_name": f"{slug}.erpyar.ir",
			"trial_end_date": trial_end.strftime("%Y-%m-%d"),
		}
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Erpyar Provisioning Error")
		return _error_response(
			f"خطا در ایجاد بستر آزمایشی: {str(e)}. (زیرساخت فعال جهت جفت‌سازی سرور یافت نشد)",
			500
		)


def check_erpyar_trial_lifecycle():
	"""
	Trial lifecycle state machine (Phase 5).
	Executes daily to suspend expired trial sites and enforce 7 days grace period.
	"""
	from frappe.utils import add_days, getdate, now_datetime
	today = getdate()

	# 1) Suspend trial sites whose trial has ended and are still active/pending
	expired_active_sites = frappe.get_all(
		"Site",
		filters={
			"domain": "erpyar.ir",
			"status": ["in", ["Active", "Pending"]],
			"trial_end_date": ["<", today]
		},
		fields=["name", "subdomain"]
	)

	for site in expired_active_sites:
		try:
			site_doc = frappe.get_doc("Site", site.name)
			site_doc.status = "Suspended"
			site_doc.suspended_at = now_datetime()
			site_doc.save(ignore_permissions=True)
			frappe.log_error(f"Erpyar site {site.subdomain}.erpyar.ir suspended due to trial expiration.", "Trial Lifecycle")
		except Exception as e:
			frappe.log_error(f"Failed to suspend site {site.name}: {str(e)}", "Trial Lifecycle")

	# 2) Disable/Archive sites that have been suspended past the 7 days grace period
	grace_limit = add_days(today, -7)
	expired_grace_sites = frappe.get_all(
		"Site",
		filters={
			"domain": "erpyar.ir",
			"status": "Suspended",
			"suspended_at": ["<", grace_limit]
		},
		fields=["name", "subdomain"]
	)

	for site in expired_grace_sites:
		try:
			site_doc = frappe.get_doc("Site", site.name)
			site_doc.status = "Archived"
			site_doc.save(ignore_permissions=True)
			frappe.log_error(f"Erpyar site {site.subdomain}.erpyar.ir archived after 7 days grace period.", "Trial Lifecycle")
		except Exception as e:
			frappe.log_error(f"Failed to archive site {site.name}: {str(e)}", "Trial Lifecycle")


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_catalog():
	"""
	API endpoint to fetch the curated public sellable catalog for Erpyar.
	Separates low-level installed app discovery from public marketing metadata.
	"""
	try:
		# Query dynamic Erpyar Product catalog from DB
		products = frappe.get_all(
			"Erpyar Product",
			fields=["product_id", "product_name", "price", "period", "is_addon", "linked_app", "description", "features"]
		)
		if products:
			# Format features JSON if stored as string
			import json
			for p in products:
				if p.get("features"):
					try:
						p["features"] = json.loads(p["features"])
					except Exception:
						# Fallback if stored as comma-separated or plain text
						p["features"] = [f.strip() for f in p["features"].split("\n") if f.strip()]
			return {"ok": True, "catalog": products}
	except Exception:
		# If table is not yet migrated or empty, proceed to fallback
		pass

	# Pre-populated Phase 1 fallback public inventory (preserving the 4 public products)
	fallback_catalog = [
		{
			"product_id": "base",
			"product_name": "پلتفرم پایه ارپ‌یار",
			"price": 5000000,
			"period": "ماهانه",
			"is_addon": 0,
			"linked_app": None,
			"description": "بستر ابری مدیریت‌شده ارپ‌یار با قابلیت پایداری بالا، پشتیبانی ۲۴/۷، بکاپ خودکار روزانه و ابزارهای مانیتورینگ پیشرفته.",
			"features": [
				"زیرساخت ابری پایدار روی لایه Press",
				"پشتیبانی فنی و مانیتورینگ ۲۴/۷",
				"پشتیبان‌گیری (بکاپ) خودکار روزانه و هفتگی",
				"دامنه اختصاصی با SSL رایگان",
				"۱۴ روز دوره تست کاملاً رایگان",
				"۷ روز مهلت پرداخت (Grace Period) پس از پایان تست"
			]
		},
		{
			"product_id": "erpnext",
			"product_name": "ERPNext",
			"price": 15000000,
			"period": "ماهانه",
			"is_addon": 1,
			"linked_app": "erpnext",
			"description": "ماژول حسابداری و مالی، مدیریت انبار، خرید و فروش، تولید و زنجیره تامین.",
			"features": [
				"یکپارچگی کامل مالی و خزانه‌داری",
				"مدیریت انبارداری چندسطحی",
				"کنترل زنجیره تامین و فروش",
				"گزارش‌دهی مالی و سود و زیان"
			]
		},
		{
			"product_id": "crm",
			"product_name": "CRM",
			"price": 10000000,
			"period": "ماهانه",
			"is_addon": 1,
			"linked_app": "crm",
			"description": "مدیریت ارتباط با مشتریان، سرنخ‌ها، فرصت‌های فروش و گزارش‌های تحلیلی تیم فروش.",
			"features": [
				"رهگیری سرنخ و قیف فروش",
				"مدیریت جلسات و وظایف تیم",
				"گزارش‌های تحلیلی نرخ تبدیل",
				"اتصال به ابزارهای ارتباطی"
			]
		},
		{
			"product_id": "restaurant",
			"product_name": "رستوران (Restaurant)",
			"price": 5000000,
			"period": "ماهانه",
			"is_addon": 1,
			"linked_app": "restaurant",
			"description": "مدیریت منو، ثبت سفارش سالن، صندوق فروشگاهی، فاکتوردهی سریع و تحلیل فروش رستوران.",
			"features": [
				"منوی دیجیتال و سفارش‌گیری سریع",
				"مدیریت میزها و سالن",
				"اتصال آسان به فیش پرینتر",
				"گزارش صندوق و صندوق‌دارها"
			]
		},
		{
			"product_id": "coffeeyar",
			"product_name": "کافی‌یار (Coffeeyar)",
			"price": 5000000,
			"period": "ماهانه",
			"is_addon": 1,
			"linked_app": "coffeeyar",
			"description": "سیستم هوشمند مدیریت کافه، سفارش‌گیری سریع، منوی اختصاصی و وفاداری مشتریان.",
			"features": [
				"پنل سفارش‌گیری لمسی و سریع",
				"باشگاه مشتریان و تخفیف‌ها",
				"مدیریت انبار مواد اولیه و بارکد",
				"تحلیل اقلام پرفروش کافه"
			]
		}
	]
	return {"ok": True, "catalog": fallback_catalog}

