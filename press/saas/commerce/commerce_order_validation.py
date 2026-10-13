from __future__ import annotations

import json
import re
from decimal import Decimal, InvalidOperation
from typing import Any


ORDER_PLAN_TYPES = {"Marketplace App": "Marketplace App Plan", "Hosting": "Site Plan"}


def validate_commerce_order(order: Any) -> None:
	"""Validate the immutable shape of service orders and existing plan-based orders."""
	get = order.get if isinstance(order, dict) else lambda field: getattr(order, field, None)
	order_type = get("order_type")
	if order_type == "Asumi Service":
		_validate_service_order(get)
		return

	expected_plan_type = ORDER_PLAN_TYPES.get(order_type)
	if not expected_plan_type:
		raise ValueError("نوع سفارش تجاری پشتیبانی نمی‌شود.")
	if get("plan_type") != expected_plan_type or not get("plan"):
		raise ValueError("سفارش میزبانی یا برنامه باید پلن متناظر داشته باشد.")


def _validate_service_order(get) -> None:
	if get("plan_type") or get("plan"):
		raise ValueError("سفارش خدمات آسومی نباید به پلن دیگری متصل باشد.")
	if get("interval") != "Monthly" or get("currency") != "IRR":
		raise ValueError("سفارش خدمات آسومی باید ماهانه و به ریال ثبت شود.")

	quote_snapshot = get("service_quote_snapshot")
	if isinstance(quote_snapshot, str):
		try:
			quote_snapshot = json.loads(quote_snapshot)
		except (TypeError, ValueError):
			raise ValueError("ریز سفارش خدمات آسومی معتبر نیست.") from None
	if not isinstance(quote_snapshot, dict):
		raise ValueError("ریز سفارش خدمات آسومی معتبر نیست.")
	total_toman = quote_snapshot.get("total")
	lines = quote_snapshot.get("lines")
	if type(total_toman) is not int or total_toman < 0 or not isinstance(lines, list) or not lines:
		raise ValueError("ریز سفارش خدمات آسومی ناقص است.")
	for line in lines:
		if (
			not isinstance(line, dict)
			or not isinstance(line.get("id"), str)
			or not isinstance(line.get("title"), str)
			or type(line.get("amount")) is not int
			or line["amount"] < 0
		):
			raise ValueError("اقلام snapshot سفارش خدمات آسومی معتبر نیستند.")

	if _as_nonnegative_integer(get("service_amount_toman"), "مبلغ تومانی") != total_toman:
		raise ValueError("مبلغ تومانی با snapshot سفارش خدمات آسومی هم‌خوان نیست.")
	if _as_nonnegative_integer(get("amount"), "مبلغ ریالی") != total_toman * 10:
		raise ValueError("مبلغ ریالی با snapshot سفارش خدمات آسومی هم‌خوان نیست.")
	if not isinstance(get("service_title"), str) or not get("service_title").strip():
		raise ValueError("عنوان سفارش خدمات آسومی لازم است.")
	if not isinstance(get("service_contact_name"), str) or not get("service_contact_name").strip():
		raise ValueError("نام تماس سفارش خدمات آسومی لازم است.")
	if not isinstance(get("service_contact_phone"), str) or not re.fullmatch(
		r"\+?[0-9]{7,15}", get("service_contact_phone")
	):
		raise ValueError("شماره تماس سفارش خدمات آسومی معتبر نیست.")
	fingerprint = get("service_fingerprint")
	if not isinstance(fingerprint, str) or not re.fullmatch(r"[0-9a-f]{64}", fingerprint):
		raise ValueError("اثر انگشت سفارش خدمات آسومی معتبر نیست.")


def _as_nonnegative_integer(value: Any, label: str) -> int:
	try:
		amount = Decimal(str(value))
	except (InvalidOperation, TypeError, ValueError):
		raise ValueError(f"{label} معتبر نیست.") from None
	if not amount.is_finite() or amount < 0 or amount != amount.to_integral_value():
		raise ValueError(f"{label} باید عدد صحیح نامنفی باشد.")
	return int(amount)
