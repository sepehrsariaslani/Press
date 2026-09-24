import json

import frappe
from frappe.utils import cint

DEFAULT_INCLUDED_MODULES = {
	"finance",
	"sales",
	"crm",
	"procurement",
	"inventory",
	"projects",
	"quality",
	"people",
	"assets",
}

SUPPORT_STATUSES = {"Open", "In Progress", "Waiting on Customer", "Resolved", "Closed"}

SUPPORT_CATEGORIES = {"Technical", "Billing", "Purchase", "Other"}


def _is_catalog_admin():
	return bool({"System Manager", "Press Marketplace Manager"}.intersection(frappe.get_roles()))


def _is_support_agent():
	return bool({"System Manager", "Press Support Agent"}.intersection(frappe.get_roles()))


def _require_catalog_admin():
	if not _is_catalog_admin():
		frappe.throw("Not permitted to manage the Asumi catalog.", frappe.PermissionError)


def _require_support_agent():
	if not _is_support_agent():
		frappe.throw("Not permitted to manage support requests.", frappe.PermissionError)


def _catalog_mappings(include_unpublished=False):
	from press.press.doctype.asumi_module_mapping.asumi_module_mapping import (
		ASUMI_MODULE_IDS,
		DEFAULT_MODULE_PREREQUISITES,
	)

	stored = {
		mapping.module_id: mapping
		for mapping in frappe.get_all(
			"Asumi Module Mapping",
			fields=[
				"module_id",
				"mode",
				"marketplace_app",
				"published",
				"description",
				"customer_description",
				"prerequisites",
			],
		)
	}
	mappings = []
	for module_id in sorted(ASUMI_MODULE_IDS):
		mapping = stored.get(module_id)
		if mapping:
			mapping.published = cint(mapping.published)
			if not mapping.published and not include_unpublished:
				continue
			mapping.prerequisites = _parse_module_prerequisites(mapping.prerequisites)
			if mapping.prerequisites is None:
				mapping.prerequisites = DEFAULT_MODULE_PREREQUISITES.get(module_id, [])
		else:
			mapping = frappe._dict(
				module_id=module_id,
				mode="Included" if module_id in DEFAULT_INCLUDED_MODULES else "Purchase request",
				marketplace_app=None,
				published=1,
				description=None,
				customer_description=None,
				prerequisites=DEFAULT_MODULE_PREREQUISITES.get(module_id, []),
			)
		mappings.append(mapping)
	return mappings


def _parse_module_prerequisites(value):
	if value is None or value == "":
		return None
	try:
		module_ids = json.loads(value) if isinstance(value, str) else value
	except (TypeError, ValueError):
		frappe.throw("Module prerequisites must be a JSON list of Asumi module IDs.")

	from press.press.doctype.asumi_module_mapping.asumi_module_mapping import ASUMI_MODULE_IDS

	if not isinstance(module_ids, list) or any(
		not isinstance(module_id, str) for module_id in module_ids
	):
		frappe.throw("Module prerequisites must be a JSON list of Asumi module IDs.")
	if len(module_ids) != len(set(module_ids)):
		frappe.throw("Choose each prerequisite module only once.")
	if not set(module_ids).issubset(ASUMI_MODULE_IDS):
		frappe.throw("Choose valid Asumi prerequisite modules.")
	return module_ids


def _validate_catalog_prerequisites(module_id, prerequisites, published):
	mappings = {mapping.module_id: mapping for mapping in _catalog_mappings(include_unpublished=True)}
	mappings[module_id].prerequisites = prerequisites
	mappings[module_id].published = cint(published)
	if module_id in prerequisites:
		frappe.throw("A module cannot depend on itself.")

	for mapping in mappings.values():
		if mapping.published and any(
			not cint(mappings[dependency].published) for dependency in mapping.prerequisites
		):
			frappe.throw("A published module cannot require a module hidden from the customer catalog.")

	visiting = set()
	visited = set()

	def visit(current):
		if current in visiting:
			frappe.throw("Module prerequisites cannot contain a dependency cycle.")
		if current in visited:
			return
		visiting.add(current)
		for dependency in mappings[current].prerequisites:
			visit(dependency)
		visiting.remove(current)
		visited.add(current)

	for current in mappings:
		visit(current)


def _customer_team_options(current_team):
	from press.utils import get_valid_teams_for_user

	team_names = {item.name for item in get_valid_teams_for_user(frappe.session.user)}
	owned_team = frappe.db.get_value(
		"Team", {"user": frappe.session.user, "enabled": 1, "parent_team": ("is", "not set")}, "name"
	)
	if owned_team:
		team_names.add(owned_team)
	team_names.add(current_team.name)

	return [
		{"name": team.name, "title": team.team_title or team.user}
		for team in frappe.get_all(
			"Team",
			filters={"name": ("in", list(team_names)), "enabled": 1},
			fields=["name", "team_title", "user"],
			order_by="team_title asc, name asc",
		)
	]


def _asumi_marketplace_app_ids(published_only=False):
	mappings = _catalog_mappings(include_unpublished=True)
	mapped_names = {
		mapping.marketplace_app
		for mapping in mappings
		if mapping.marketplace_app
		and (
			not published_only
			or (mapping.mode == "Marketplace app" and cint(mapping.published))
		)
	}
	if not mapped_names:
		return set()
	apps = frappe.get_all(
		"Marketplace App",
		filters={"name": ("in", list(mapped_names))},
		fields=["name", "app"],
	)
	return {identifier for app in apps for identifier in (app.name, app.app) if identifier}


def _require_asumi_marketplace_app(app_identifier, published_only=False):
	if app_identifier not in _asumi_marketplace_app_ids(published_only=published_only):
		frappe.throw(
			"This Marketplace app is not available through the Asumi catalog.",
			frappe.PermissionError,
		)


def _pending_marketplace_invoice_lines(team: str, sites_by_name: dict) -> dict:
	if not sites_by_name:
		return {}
	invoices = frappe.get_all(
		"Invoice",
		filters={"team": team, "status": "Unpaid", "docstatus": 1, "amount_due": (">", 0)},
		fields=["name", "creation"],
		order_by="creation desc",
	)
	if not invoices:
		return {}
	invoice_rank = {invoice.name: index for index, invoice in enumerate(invoices)}
	items = frappe.get_all(
		"Invoice Item",
		filters={
			"parent": ("in", [invoice.name for invoice in invoices]),
			"parenttype": "Invoice",
			"document_type": "Marketplace App",
			"site": ("in", list(sites_by_name)),
		},
		fields=["parent", "document_name", "site"],
	)
	items.sort(key=lambda item: invoice_rank.get(item.parent, len(invoice_rank)))
	pending = {}
	for item in items:
		if item.site and item.document_name:
			pending.setdefault((item.site, item.document_name), item.parent)
	return pending


def serialize_site(site, plan=None, currency=None):
	plan_price = None
	if plan:
		plan_price = plan.price_inr if currency == "INR" else plan.price_usd if currency == "USD" else None
	return {
		"name": site.name,
		"label": site.host_name or site.name,
		"status": site.status,
		"plan_title": plan.plan_title if plan else None,
		"plan_price": plan_price,
		"plan_interval": plan.interval if plan else None,
	}


def serialize_plan(plan):
	return {
		"name": plan["name"],
		"title": plan["title"],
		"price_inr": plan["price_inr"],
		"price_usd": plan["price_usd"],
		"interval": plan.get("interval"),
		"enabled": plan["enabled"],
		"features": plan["features"],
	}


def _validate_marketplace_plan_currency(team, app_slug: str, plan_name: str):
	app = frappe.db.get_value(
		"Marketplace App", {"app": app_slug}, ["name", "team"], as_dict=True
	)
	if not app or app.team == team.name:
		return

	plan = frappe.db.get_value(
		"Marketplace App Plan",
		{"name": plan_name, "app": app.name, "enabled": 1},
		["price_inr", "price_usd"],
		as_dict=True,
	)
	if not plan:
		return

	if team.currency == "INR":
		price = plan.price_inr
	elif team.currency == "USD":
		price = plan.price_usd
	elif plan.price_inr == 0 and plan.price_usd == 0:
		price = 0
	else:
		price = None

	if price is None:
		frappe.throw(
			"This paid plan is not available in the team's billing currency. Contact Asumi support for a quote."
		)


def serialize_support_request(doc, include_messages=False):
	request = {
		"name": doc.name,
		"team": doc.team,
		"site": doc.site,
		"subject": doc.subject,
		"category": doc.category,
		"message": doc.message,
		"status": doc.status,
		"resolution": doc.resolution,
		"creation": doc.creation,
		"modified": doc.modified,
	}
	if include_messages:
		request["messages"] = frappe.get_all(
			"Comment",
			filters={
				"reference_doctype": "Asumi Support Request",
				"reference_name": doc.name,
				"comment_type": "Comment",
			},
			fields=["name", "comment_by", "content", "creation"],
			order_by="creation asc",
		)
	return request
