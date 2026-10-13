from decimal import Decimal, InvalidOperation

from press.saas.commerce.marketplace_install import is_marketplace_app_sellable
from press.saas.commerce.pricing import marketplace_plan_supported_by_asumi_checkout


INTERVAL_LABELS = {
	"Daily": "روزانه",
	"Monthly": "ماهانه",
	"Yearly": "سالانه",
}

def _normalize_price(value):
	if value is None or isinstance(value, bool):
		return None

	try:
		amount = Decimal(str(value))
	except (InvalidOperation, TypeError, ValueError):
		return None

	if not amount.is_finite() or amount < 0:
		return None

	if amount == amount.to_integral_value():
		return int(amount)

	return amount


def format_plan_prices(plan):
	"""Return stored plan amounts with explicit currency and interval labels."""
	interval = plan.get("interval")
	price_inr = _normalize_price(plan.get("price_inr"))
	price_usd = _normalize_price(plan.get("price_usd"))
	price_irr = _normalize_price(plan.get("price_irr", 0))
	if (
		interval not in INTERVAL_LABELS
		or price_inr is None
		or price_usd is None
		or price_irr is None
	):
		return None

	return {
		"interval": interval,
		"interval_label": INTERVAL_LABELS[interval],
		"price_inr": price_inr,
		"price_usd": price_usd,
		"price_irr": price_irr,
		"prices": [
			{"currency": "INR", "symbol": "₹", "amount": price_inr},
			{"currency": "USD", "symbol": "$", "amount": price_usd},
			{"currency": "IRR", "symbol": "ریال", "amount": price_irr},
		],
		"is_free": price_inr == 0 and price_usd == 0 and price_irr == 0,
	}


def _is_enabled(value):
	return value is True or value == 1 or value == "1"


def _is_safe_marketplace_route(route):
	if not isinstance(route, str):
		return False
	if not route.startswith("marketplace/apps/"):
		return False
	return not any(part in route for part in ("..", "\\", "?", "#", "//"))


def build_marketplace_catalog(app_rows, plan_rows):
	"""Shape published Marketplace Apps and enabled plans for public display."""
	apps_by_name = {}
	for app in app_rows:
		name = app.get("name")
		route = app.get("route")
		app_id = app.get("app") or name
		if (
			app.get("status") != "Published"
			or not name
			or not is_marketplace_app_sellable(app_id)
			or not _is_safe_marketplace_route(route)
		):
			continue

		apps_by_name[name] = {
			"id": name,
			"title": app.get("title") or name,
			"description": app.get("description") or "",
			"route": "/" + route,
			"plans": [],
		}

	for plan in plan_rows:
		app = apps_by_name.get(plan.get("app"))
		if not app or not _is_enabled(plan.get("enabled")):
			continue

		prices = format_plan_prices(plan)
		if prices is None:
			continue
		try:
			asumi_checkout_supported = marketplace_plan_supported_by_asumi_checkout(prices)
		except ValueError:
			asumi_checkout_supported = False

		app["plans"].append(
			{
				"id": plan.get("name"),
				"title": plan.get("title") or prices["interval_label"],
				"asumi_checkout_supported": asumi_checkout_supported,
				**prices,
			}
		)

	catalog = [app for app in apps_by_name.values() if app["plans"]]
	for app in catalog:
		app["plans"].sort(key=lambda plan: (list(INTERVAL_LABELS).index(plan["interval"]), plan["title"].casefold()))

	return sorted(catalog, key=lambda app: app["title"].casefold())


def get_public_marketplace_catalog(get_all):
	"""Read published apps and their enabled Marketplace App Plans."""
	apps = get_all(
		"Marketplace App",
		filters={"status": "Published"},
		fields=["name", "app", "title", "description", "route", "status"],
		order_by="title asc",
	)
	app_names = [app.get("name") for app in apps if app.get("name")]
	if not app_names:
		return []

	plans = get_all(
		"Marketplace App Plan",
		filters={"enabled": 1, "app": ["in", app_names]},
		fields=[
			"name",
			"app",
			"title",
			"interval",
			"enabled",
			"price_inr",
			"price_usd",
			"price_irr",
		],
		order_by="app asc, interval asc, title asc",
	)
	return build_marketplace_catalog(apps, plans)


def get_catalog_page_context(get_all, can_manage_prices=False):
	return {
		"no_cache": 1,
		"body_class": "asumi-commerce-page",
		"marketplace_apps": get_public_marketplace_catalog(get_all),
		"hosting_available": False,
		"can_manage_prices": bool(can_manage_prices),
		"metatags": {
			"title": "کاتالوگ اپلیکیشن‌ها | آسومی",
			"description": "اپلیکیشن‌های منتشرشده و تعرفه‌های ثبت‌شده در مارکت‌پلیس آسومی.",
			"og:type": "website",
		},
	}


def add_app_categories(apps, category_rows):
	"""Attach unique category labels to catalog apps and return the public options."""
	app_ids = {app["id"] for app in apps}
	categories_by_app = {app_id: set() for app_id in app_ids}
	for row in category_rows:
		app_id = row.get("parent")
		category = row.get("category")
		if app_id in categories_by_app and category:
			categories_by_app[app_id].add(category)

	all_categories = set()
	for app in apps:
		app_categories = sorted(categories_by_app[app["id"]])
		app["categories"] = app_categories
		all_categories.update(app_categories)

	return sorted(all_categories)
