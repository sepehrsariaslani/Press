import frappe
from frappe.website.path_resolver import resolve_path as default_resolve_path


ERPYAR_HOSTS = {"erpyar.ir", "www.erpyar.ir"}
ERPYAR_ROUTE_PAGE_MAP = {
	"": "erpyar-app",
	"products": "erpyar-app-products",
	"products/erpnext": "erpyar-app-products-erpnext",
	"products/crm": "erpyar-app-products-crm",
	"products/hr": "erpyar-app-products-hr",
	"products/hosting": "erpyar-app-products-hosting",
	"marketplace": "erpyar-app-marketplace",
	"pricing": "erpyar-app-pricing",
	"docs": "erpyar-app-docs",
	"contact": "erpyar-app-contact",
	"demo": "erpyar-app-demo",
}
ERPYAR_STATIC_ROUTES = {
	"robots.txt": "erpyar-robots.txt",
	"sitemap.xml": "erpyar-sitemap.xml",
}
EXCLUDED_EXACT_ROUTES = {"saas", "saas-app", "dashboard", "login"}
EXCLUDED_PREFIX_ROUTES = ("saas-app/", "api/", "assets/", "files/", "private/", "app/")


def resolve_path(path: str):
	"""
	Route Erpyar public website paths to route-specific Vue shells only on Erpyar hosts.
	All non-matching hosts and paths use Frappe's default resolver unchanged.
	"""
	request = getattr(frappe.local, "request", None)
	host = (getattr(request, "host", "") or "").split(":", 1)[0].lower()
	route = (path or "").strip("/ ")

	if host not in ERPYAR_HOSTS:
		return default_resolve_path(path)

	if route in ERPYAR_STATIC_ROUTES:
		return ERPYAR_STATIC_ROUTES[route]

	if route in EXCLUDED_EXACT_ROUTES or route.startswith(EXCLUDED_PREFIX_ROUTES):
		return default_resolve_path(path)

	if route in ERPYAR_ROUTE_PAGE_MAP:
		return ERPYAR_ROUTE_PAGE_MAP[route]

	return default_resolve_path(path)
