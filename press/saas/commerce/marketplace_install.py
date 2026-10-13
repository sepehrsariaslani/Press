from __future__ import annotations

import re

APP_NAME_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
NON_SELLABLE_MARKETPLACE_APP_IDS = frozenset({"frappe", "raven", "sales"})


def is_marketplace_app_sellable(app: str) -> bool:
	"""Exclude framework and apps the Asumi owner has removed from the storefront."""
	return isinstance(app, str) and app not in NON_SELLABLE_MARKETPLACE_APP_IDS


def _validate_marketplace_app(app: str) -> None:
	if not isinstance(app, str) or not APP_NAME_RE.fullmatch(app):
		raise ValueError("شناسهٔ برنامهٔ انتخاب‌شده معتبر نیست")
	if not is_marketplace_app_sellable(app):
		raise ValueError("این برنامه در فروشگاه آسومی قابل خرید نیست")


def marketplace_install_state(app: str, installed_apps: list[str], available_apps: list[str]) -> dict:
	"""Return whether a published app is already installed or can be installed on this bench."""
	_validate_marketplace_app(app)
	installed = set(installed_apps or [])
	available = set(available_apps or [])
	if app in installed:
		return {"installed": True, "installation_required": False}
	if app in available:
		return {"installed": False, "installation_required": True}
	raise ValueError("این برنامه روی بنچ سایت انتخاب‌شده موجود نیست")


def should_install_marketplace_app(
	app: str, installation_required: bool, installed_apps: list[str], available_apps: list[str]
) -> bool:
	"""Authorize installation only when the order snapshot requested it and the Bench still has the app."""
	_validate_marketplace_app(app)
	if app in set(installed_apps or []):
		return False
	if not installation_required:
		raise ValueError("این سفارش اجازهٔ نصب برنامهٔ جدید را ندارد")
	if app not in set(available_apps or []):
		raise ValueError("این برنامه دیگر روی بنچ سایت انتخاب‌شده موجود نیست")
	return True
