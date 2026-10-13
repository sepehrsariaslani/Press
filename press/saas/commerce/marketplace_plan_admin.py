"""Validation helpers for admin-created Marketplace App Plan drafts."""

from __future__ import annotations

from press.saas.commerce.marketplace_install import is_marketplace_app_sellable
from press.saas.commerce.pricing import normalize_interval

MARKETPLACE_PLAN_INTERVALS = {"Daily", "Monthly", "Yearly"}


def build_marketplace_plan_draft(*, app, title, interval, available_apps) -> dict:
	"""Build a disabled, zero-price plan draft for a currently published app."""
	if (
		not isinstance(app, str)
		or not app.strip()
		or not is_marketplace_app_sellable(app.strip())
		or app.strip() not in set(available_apps or [])
	):
		raise ValueError("برنامهٔ انتخاب‌شده منتشر نشده یا در دسترس نیست.")
	if not isinstance(title, str) or not title.strip():
		raise ValueError("نام تعرفه را وارد کنید.")
	title = title.strip()
	if len(title) > 140:
		raise ValueError("نام تعرفه بیش از اندازه طولانی است.")
	if interval not in MARKETPLACE_PLAN_INTERVALS:
		raise ValueError("دورهٔ تعرفه معتبر نیست.")

	return {
		"app": app.strip(),
		"title": title,
		"interval": normalize_interval(interval),
		"enabled": 0,
		"price_inr": 0,
		"price_usd": 0,
		"price_irr": 0,
	}
