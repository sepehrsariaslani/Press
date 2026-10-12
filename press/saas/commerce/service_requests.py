from __future__ import annotations

import re


SUPPORTED_SERVICE_REQUESTS = {"module_pricing", "website_design"}
SERVICE_REQUEST_STATUSES = {"New", "Contacted", "Qualified", "Lost"}
MAX_SERVICE_CONTEXT_LENGTH = 5000


def _normalize_digits(value: str) -> str:
	def normalize(character: str) -> str:
		codepoint = ord(character)
		for start in (0x06F0, 0x0660):
			if start <= codepoint <= start + 9:
				return chr(ord("0") + codepoint - start)
		return character

	return "".join(normalize(character) for character in value)


def _clean_text(value: str | None, field: str, max_length: int, required: bool = False) -> str:
	cleaned = str(value or "").strip()
	if required and not cleaned:
		raise ValueError(f"{field} is required")
	if len(cleaned) > max_length:
		raise ValueError(f"{field} is too long")
	if "\x00" in cleaned:
		raise ValueError(f"{field} contains invalid characters")
	return cleaned


def _normalize_phone(value: str | None) -> str:
	phone = _normalize_digits(str(value or "").strip())
	phone = re.sub(r"[\s().-]", "", phone)
	if not re.fullmatch(r"\+?[0-9]{7,15}", phone):
		raise ValueError("phone must contain 7 to 15 digits")
	return phone


def build_service_request_lead(
	*,
	service: str,
	full_name: str,
	phone: str,
	company: str = "",
	context: str = "",
	source_path: str = "",
	source_host: str = "",
) -> dict[str, str]:
	"""Validate an Asumi service inquiry and map it to the existing lead schema."""
	service = _clean_text(service, "service", 40, required=True)
	if service not in SUPPORTED_SERVICE_REQUESTS:
		raise ValueError("service is not supported")

	full_name = _clean_text(full_name, "name", 140, required=True)
	phone = _normalize_phone(phone)
	company = _clean_text(company, "company", 140)
	context = _clean_text(context, "context", MAX_SERVICE_CONTEXT_LENGTH)
	source_path = _clean_text(source_path, "source_path", 240)
	source_host = _clean_text(source_host, "source_host", 140)

	message = "درخواست بررسی برآورد خدمات آسومی. این درخواست فاکتور یا پرداخت نیست."
	if context:
		message = f"{message}\n\n{context}"

	return {
		"full_name": full_name,
		"phone": phone,
		"company": company,
		"lead_type": "contact",
		"status": "New",
		"product_interest": f"asumi_service_request:{service}",
		"message": message,
		"source_path": source_path,
		"source_host": source_host,
	}


def normalize_service_request_status(value: str) -> str:
	status = str(value or "").strip()
	if status not in SERVICE_REQUEST_STATUSES:
		raise ValueError("status is not supported")
	return status
