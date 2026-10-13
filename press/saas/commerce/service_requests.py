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


def normalize_service_contact(full_name: str, phone: str, company: str = "") -> dict[str, str]:
	"""Normalize the contact details shared by Asumi inquiries and paid service orders."""
	return {
		"full_name": _clean_text(full_name, "name", 140, required=True),
		"phone": _normalize_phone(phone),
		"company": _clean_text(company, "company", 140),
	}


def build_service_request_lead(
	*,
	service: str,
	full_name: str,
	phone: str,
	company: str = "",
	context: str = "",
	quote_snapshot: dict | None = None,
	source_path: str = "",
	source_host: str = "",
) -> dict[str, str]:
	"""Validate an Asumi service inquiry and map it to the existing lead schema."""
	service = _clean_text(service, "service", 40, required=True)
	if service not in SUPPORTED_SERVICE_REQUESTS:
		raise ValueError("service is not supported")

	contact = normalize_service_contact(full_name, phone, company)
	full_name = contact["full_name"]
	phone = contact["phone"]
	company = contact["company"]
	context = _clean_text(context, "context", MAX_SERVICE_CONTEXT_LENGTH)
	source_path = _clean_text(source_path, "source_path", 240)
	source_host = _clean_text(source_host, "source_host", 140)

	message = "درخواست بررسی برآورد خدمات آسومی. این درخواست فاکتور یا پرداخت نیست."
	if service == "module_pricing":
		message = f"{message}\n\n{_module_pricing_message(quote_snapshot)}"
	elif context:
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


def _module_pricing_message(quote_snapshot: dict | None) -> str:
	if not isinstance(quote_snapshot, dict):
		raise ValueError("quote_snapshot is required for module pricing")
	lines = quote_snapshot.get("lines")
	quoted_at = quote_snapshot.get("quoted_at")
	if not isinstance(lines, list) or not lines or not isinstance(quoted_at, str) or not quoted_at.strip():
		raise ValueError("quote_snapshot is incomplete")

	formatted_lines = []
	for line in lines:
		if not isinstance(line, dict) or not isinstance(line.get("title"), str):
			raise ValueError("quote_snapshot lines are invalid")
		amount = line.get("amount")
		if type(amount) is not int or amount < 0:
			raise ValueError("quote_snapshot line amount is invalid")
		formatted_lines.append(f"• {line['title']}: {_format_toman(amount)} تومان")

	total = quote_snapshot.get("total")
	listed_total = quote_snapshot.get("listed_total")
	discount = quote_snapshot.get("discount")
	if any(type(value) is not int or value < 0 for value in (total, listed_total, discount)):
		raise ValueError("quote_snapshot totals are invalid")

	parts = ["مبنای برآورد: تعرفهٔ ذخیره‌شده روی سرور"]
	if quote_snapshot.get("package_title"):
		parts.append(f"بستهٔ انتخاب‌شده: {quote_snapshot['package_title']}")
	parts.extend(("انتخاب‌ها:", *formatted_lines, f"جمع قیمت‌های تکی: {_format_toman(listed_total)} تومان"))
	if discount:
		discount_label = _clean_text(quote_snapshot.get("discount_label"), "discount_label", 140, required=True)
		parts.append(f"{discount_label}: −{_format_toman(discount)} تومان")
	parts.extend((f"مبلغ نهایی ماهانه: {_format_toman(total)} تومان", f"زمان محاسبه: {quoted_at.strip()}"))
	return "\n".join(parts)


def _format_toman(amount: int) -> str:
	return f"{amount:,}".translate(str.maketrans("0123456789,", "۰۱۲۳۴۵۶۷۸۹٬"))


def normalize_service_request_status(value: str) -> str:
	status = str(value or "").strip()
	if status not in SERVICE_REQUEST_STATUSES:
		raise ValueError("status is not supported")
	return status
