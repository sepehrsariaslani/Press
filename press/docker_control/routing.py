from __future__ import annotations

from frappe.website.path_resolver import resolve_path as default_resolve_path

from press.docker_control.routing_policy import ASUMI_HOSTS, should_route_dashboard
from press.routing import get_request_host
from press.routing import resolve_path as asumi_resolve_path


def resolve_path(path: str):
	"""Serve Press pages on Asumi and leave page authorization to Press itself."""
	host = get_request_host()
	route = (path or "").split("?", 1)[0].strip("/ ").lower()
	if should_route_dashboard(path, host=host):
		return default_resolve_path(path)

	if route == "marketplace" or route.startswith("marketplace/"):
		return default_resolve_path(path)

	if host in ASUMI_HOSTS and (
		route == "saas" or route.startswith("saas/")
	):
		return default_resolve_path(path)

	if host in ASUMI_HOSTS and route == "pricing":
		return default_resolve_path("saas")

	return asumi_resolve_path(path)
