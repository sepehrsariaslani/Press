from __future__ import annotations

from typing import Any


MAX_SERVICE_PRICE_TOMAN = 1_000_000_000_000

MODULE_TITLES = {
	"finance": "مالی و حسابداری",
	"sales": "فروش",
	"crm": "مدیریت ارتباط با مشتری",
	"procurement": "خرید و تدارکات",
	"inventory": "انبار و موجودی",
	"projects": "مدیریت پروژه",
	"manufacturing": "تولید",
	"quality": "کنترل کیفیت",
	"people": "منابع انسانی و حقوق",
	"assets": "دارایی و نگهداری",
	"fleet": "مدیریت ناوگان",
	"pricing": "قیمت‌گذاری و بهای تمام‌شده",
	"growth": "بازاریابی و رشد",
	"business": "برنامه‌ریزی کسب‌وکار",
	"restaurant": "فروش حضوری و رستوران",
}
ADDON_TITLES = {"restaurantMenu": "مدیریت منو و کاتالوگ"}
ADDON_OFFER_TITLES = {
	"assistant_ai": "دستیار هوش مصنوعی حسابیار",
	"internal_chat": "چت سازمانی",
}
ADDON_OFFER_STATUSES = {"Unconfigured", "Free", "Paid", "Disabled"}
MIN_PAID_ADDON_PRICE_TOMAN = 10_000
PACKAGE_TITLES = {
	"restaurant": "فقط رستوران",
	"restaurantPurchasing": "رستوران + خرید",
	"professional": "حرفه‌ای",
	"completeWithoutMenu": "همهٔ ماژول‌ها بدون مدیریت منو",
	"complete": "همهٔ امکانات",
}

DEFAULT_MODULE_PRICES = {
	"finance": 5_500_000,
	"sales": 5_500_000,
	"crm": 2_500_000,
	"procurement": 6_000_000,
	"inventory": 6_000_000,
	"projects": 3_200_000,
	"manufacturing": 5_500_000,
	"quality": 2_500_000,
	"people": 3_600_000,
	"assets": 3_200_000,
	"fleet": 3_200_000,
	"pricing": 3_000_000,
	"growth": 3_500_000,
	"business": 3_800_000,
	"restaurant": 6_500_000,
}
DEFAULT_ADDON_PRICES = {"restaurantMenu": 2_500_000}
DEFAULT_PACKAGE_PRICES = {
	"restaurant": 6_500_000,
	"restaurantPurchasing": 12_500_000,
	"professional": 9_900_000,
	"completeWithoutMenu": 47_500_000,
	"complete": 50_000_000,
}

MODULE_PREREQUISITES = {
	"finance": (),
	"sales": (),
	"crm": (),
	"procurement": (),
	"inventory": (),
	"projects": (),
	"manufacturing": ("inventory",),
	"quality": (),
	"people": (),
	"assets": ("finance",),
	"fleet": (),
	"pricing": (),
	"growth": (),
	"business": ("growth",),
	"restaurant": (),
}

PACKAGE_SELECTIONS = {
	"restaurant": ({"restaurant"}, set()),
	"restaurantPurchasing": ({"restaurant", "procurement"}, set()),
	"professional": (
		{
			"finance", "sales", "procurement", "inventory", "crm", "projects",
			"manufacturing", "quality", "people", "assets", "pricing",
		},
		set(),
	),
	"completeWithoutMenu": (set(MODULE_TITLES), set()),
	"complete": (set(MODULE_TITLES), {"restaurantMenu"}),
}


def default_service_prices() -> dict[str, dict[str, int]]:
	return {
		"modules": dict(DEFAULT_MODULE_PRICES),
		"addons": dict(DEFAULT_ADDON_PRICES),
		"packages": dict(DEFAULT_PACKAGE_PRICES),
	}


def default_addon_offers() -> dict[str, dict[str, object]]:
	return {
		addon_id: {"status": "Unconfigured", "monthly_price_toman": 0}
		for addon_id in ADDON_OFFER_TITLES
	}


def normalize_addon_offers(values: Any) -> dict[str, dict[str, object]]:
	if not isinstance(values, dict) or set(values) != set(ADDON_OFFER_TITLES):
		raise ValueError("addon offers must contain exactly the known catalog IDs")

	normalized = {}
	for addon_id in ADDON_OFFER_TITLES:
		offer = values[addon_id]
		if not isinstance(offer, dict) or set(offer) != {"status", "monthly_price_toman"}:
			raise ValueError(f"addon offer for {addon_id} must contain status and monthly_price_toman")

		status = offer["status"]
		price = offer["monthly_price_toman"]
		if not isinstance(status, str) or status not in ADDON_OFFER_STATUSES:
			raise ValueError(f"addon offer status for {addon_id} is invalid")
		if type(price) is not int or not 0 <= price <= MAX_SERVICE_PRICE_TOMAN:
			raise ValueError(
				f"addon offer price for {addon_id} must be an integer between 0 and {MAX_SERVICE_PRICE_TOMAN}"
			)
		if status == "Paid" and price < MIN_PAID_ADDON_PRICE_TOMAN:
			raise ValueError(
				f"paid addon offer for {addon_id} must be at least {MIN_PAID_ADDON_PRICE_TOMAN} toman"
			)
		if status == "Free" and price != 0:
			raise ValueError(f"free addon offer for {addon_id} must have a zero price")

		normalized[addon_id] = {"status": status, "monthly_price_toman": price}
	return normalized


def normalize_service_prices(
	modules: Any,
	addons: Any,
	packages: Any,
) -> dict[str, dict[str, int]]:
	return {
		"modules": _normalize_price_map(modules, DEFAULT_MODULE_PRICES, "modules"),
		"addons": _normalize_price_map(addons, DEFAULT_ADDON_PRICES, "addons"),
		"packages": _normalize_price_map(packages, DEFAULT_PACKAGE_PRICES, "packages"),
	}


def _normalize_price_map(values: Any, expected_keys: dict[str, int], category: str) -> dict[str, int]:
	if not isinstance(values, dict) or set(values) != set(expected_keys):
		raise ValueError(f"{category} prices must contain exactly the known catalog IDs")

	normalized = {}
	for key in expected_keys:
		value = values[key]
		if type(value) is not int or not 0 <= value <= MAX_SERVICE_PRICE_TOMAN:
			raise ValueError(f"{category} price for {key} must be an integer between 0 and {MAX_SERVICE_PRICE_TOMAN}")
		normalized[key] = value
	return normalized


def calculate_service_quote(
	module_ids: list[str],
	addon_ids: list[str],
	prices: dict[str, dict[str, int]],
) -> dict[str, Any]:
	prices = normalize_service_prices(prices.get("modules"), prices.get("addons"), prices.get("packages"))
	module_ids = _validate_selection_ids(module_ids, MODULE_TITLES, "module", required=True)
	addon_ids = _validate_selection_ids(addon_ids, ADDON_TITLES, "addon", required=False)

	selected_modules = set(module_ids)
	for module_id in module_ids:
		missing = set(MODULE_PREREQUISITES[module_id]) - selected_modules
		if missing:
			raise ValueError(f"module {module_id} requires {', '.join(sorted(missing))}")

	for addon_id in addon_ids:
		if addon_id == "restaurantMenu" and "restaurant" not in selected_modules:
			raise ValueError("restaurantMenu requires restaurant")

	lines = [
		{"kind": "module", "id": module_id, "title": MODULE_TITLES[module_id], "amount": prices["modules"][module_id]}
		for module_id in module_ids
	]
	lines.extend(
		{"kind": "addon", "id": addon_id, "title": ADDON_TITLES[addon_id], "amount": prices["addons"][addon_id]}
		for addon_id in addon_ids
	)
	module_total = sum(prices["modules"][module_id] for module_id in module_ids)
	addon_total = sum(prices["addons"][addon_id] for addon_id in addon_ids)
	listed_total = module_total + addon_total
	package_id = next(
		(
			candidate
			for candidate, (required_modules, required_addons) in PACKAGE_SELECTIONS.items()
			if selected_modules == required_modules and set(addon_ids) == required_addons
		),
		None,
	)
	if package_id:
		package_price = prices["packages"][package_id]
		discount = max(listed_total - package_price, 0)
		total = package_price
	else:
		discount = 0
		total = listed_total

	return {
		"lines": lines,
		"module_total": module_total,
		"addon_total": addon_total,
		"listed_total": listed_total,
		"package_id": package_id,
		"package_title": PACKAGE_TITLES.get(package_id),
		"discount": discount,
		"discount_label": f"تخفیف بستهٔ {PACKAGE_TITLES[package_id]}" if package_id and discount else "",
		"total": total,
	}


def _validate_selection_ids(values: Any, known: dict[str, str], category: str, *, required: bool) -> list[str]:
	if not isinstance(values, list) or (required and not values):
		raise ValueError(f"{category} selection must be a {'non-empty ' if required else ''}list")
	if any(not isinstance(value, str) or value not in known for value in values):
		raise ValueError(f"{category} selection contains an unknown ID")
	if len(values) != len(set(values)):
		raise ValueError(f"{category} selection contains duplicate IDs")
	return values
