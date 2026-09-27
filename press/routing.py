import frappe
from frappe.website.path_resolver import resolve_path as default_resolve_path

ASUMI_HOSTS = {"asumi", "asumi.ir", "www.asumi.ir"}
ASUMI_PASSTHROUGH_ROUTES = {
	"hesab",
	"login",
	"logout",
	"update-password",
	"complete_signup",
	"favicon.ico",
	"robots.txt",
	"manifest.json",
}
ASUMI_PASSTHROUGH_PREFIXES = (
	"api/",
	"assets/",
	"files/",
	"private/files/",
	"socket.io/",
	"hesab/",
)


def get_request_host() -> str:
	request = getattr(frappe.local, "request", None)
	return (getattr(request, "host", "") or "").split(":", 1)[0].lower()


def resolve_path(path: str):
	"""Serve the Asumi app on customer-facing page routes for Asumi hosts.

	Keep API, asset, file, and authentication endpoints available to the app while
	preventing customer page URLs from opening Press's dashboard or Desk.
	"""
	route = (path or "").strip("/ ")
	if get_request_host() in ASUMI_HOSTS:
		if not route:
			return "asumi"
		normalized_route = route.lower()
		# Accounts owns /hesab; /hesabyar and other customer pages stay on Asumi.
		if (
			normalized_route in ASUMI_PASSTHROUGH_ROUTES
			or normalized_route.startswith(ASUMI_PASSTHROUGH_PREFIXES)
		):
			return default_resolve_path(path)
		return "asumi"

	return default_resolve_path(path)
