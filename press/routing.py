import frappe
from frappe.website.path_resolver import resolve_path as default_resolve_path

ASUMI_HOSTS = {"asumi.ir", "www.asumi.ir"}


def get_request_host() -> str:
	request = getattr(frappe.local, "request", None)
	return (getattr(request, "host", "") or "").split(":", 1)[0].lower()


def resolve_path(path: str):
	"""Route only the Asumi public root and delegate all other paths to Frappe.

	Press routes such as Desk, Dashboard, API, and assets remain under Frappe's
	default resolver even when they are requested from the Asumi domain.
	"""
	route = (path or "").strip("/ ")
	if get_request_host() in ASUMI_HOSTS and not route:
		return "asumi"

	return default_resolve_path(path)
