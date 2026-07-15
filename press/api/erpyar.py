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
