from __future__ import annotations

import hashlib
import json

from press.saas.commerce.pricing import normalize_zarinpal_price
from press.saas.commerce.service_pricing import calculate_service_quote
from press.saas.commerce.service_requests import _clean_text, normalize_service_contact


def build_service_order_snapshot(
	*,
	module_ids: list[str],
	addon_ids: list[str],
	prices: dict,
	customer: str,
	team: str,
	full_name: str,
	phone: str,
	company: str = "",
	quoted_at: str | None = None,
) -> dict:
	"""Build a server-priced, immutable snapshot for a one-month Asumi service order."""
	quote = calculate_service_quote(module_ids, addon_ids, prices)
	contact = normalize_service_contact(full_name, phone, company)
	customer = _clean_text(customer, "customer", 140, required=True)
	team = _clean_text(team, "team", 140, required=True)
	quoted_at = _clean_text(quoted_at, "quoted_at", 80) or None
	quote_snapshot = {**quote, "quoted_at": quoted_at}
	total_toman = quote["total"]
	amount_irr = normalize_zarinpal_price(total_toman * 10)

	fingerprint_payload = {
		"customer": customer,
		"team": team,
		"module_ids": sorted(module_ids),
		"addon_ids": sorted(addon_ids),
		"total_toman": total_toman,
	}
	fingerprint = hashlib.sha256(
		json.dumps(fingerprint_payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
	).hexdigest()

	service_title = quote["package_title"] or "، ".join(line["title"] for line in quote["lines"])
	return {
		"order_type": "Asumi Service",
		"interval": "Monthly",
		"currency": "IRR",
		"amount": amount_irr,
		"service_amount_toman": total_toman,
		"service_title": service_title,
		"service_quote_snapshot": quote_snapshot,
		"service_contact_name": contact["full_name"],
		"service_contact_phone": contact["phone"],
		"service_company": contact["company"],
		"service_fingerprint": fingerprint,
	}
