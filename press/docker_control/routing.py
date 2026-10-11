from __future__ import annotations

import frappe
from frappe.website.path_resolver import resolve_path as default_resolve_path

from press.docker_control.permissions import has_document_permission
from press.docker_control.routing_policy import should_route_dashboard
from press.routing import get_request_host
from press.routing import resolve_path as asumi_resolve_path


def resolve_path(path: str):
	"""Expose the Docker control route on Asumi while preserving its ERP routes."""
	user = frappe.session.user
	is_guest = user == "Guest"
	route = (path or "").split("?", 1)[0].strip("/ ").lower()
	can_manage_docker = False
	if route == "dashboard/docker-control" and not is_guest:
		can_manage_docker = has_document_permission(user=user)

	if should_route_dashboard(
		path,
		host=get_request_host(),
		is_guest=is_guest,
		can_manage_docker=can_manage_docker,
	):
		return default_resolve_path(path)

	return asumi_resolve_path(path)
