import json
from math import isfinite

import frappe
from frappe.utils import cint, flt

from .common import (
	_catalog_mappings,
	_parse_module_prerequisites,
	_require_catalog_admin,
	_validate_catalog_prerequisites,
)


@frappe.whitelist(methods=["GET"])
def catalog():
	"""Return the published Marketplace apps and Asumi-to-Press mappings."""
	from press.api.marketplace import get_marketplace_pricing_catalog

	apps = get_marketplace_pricing_catalog()
	all_mappings = _catalog_mappings(include_unpublished=True)
	mappings = [mapping for mapping in all_mappings if mapping.published]
	hidden_module_ids = [mapping.module_id for mapping in all_mappings if not mapping.published]
	visible_marketplace_names = {
		mapping.marketplace_app
		for mapping in mappings
		if mapping.mode == "Marketplace app" and mapping.marketplace_app
	}
	apps = [app for app in apps if app.name in visible_marketplace_names]
	app_by_name = {app.name: app for app in apps}
	public_mappings = []
	for mapping in mappings:
		app = app_by_name.get(mapping.marketplace_app) if mapping.mode == "Marketplace app" else None
		public_mappings.append(
			{
				"module_id": mapping.module_id,
				"mode": mapping.mode,
				"customer_description": mapping.customer_description,
				"marketplace_app_slug": app.app if app else None,
				"marketplace_app_title": app.title if app else None,
				"published": cint(mapping.published),
				"prerequisites": mapping.prerequisites,
			}
		)
	return {"apps": apps, "mappings": public_mappings, "hidden_module_ids": hidden_module_ids}


@frappe.whitelist(methods=["GET"])
def catalog_admin():
	_require_catalog_admin()
	from press.api.marketplace import get_marketplace_pricing_catalog

	mappings = _catalog_mappings(include_unpublished=True)
	return {"apps": get_marketplace_pricing_catalog(), "mappings": mappings}


@frappe.whitelist(methods=["POST"])
def save_catalog_mapping(
	module_id: str,
	mode: str,
	marketplace_app: str | None = None,
	published: int = 1,
	description: str | None = None,
	customer_description: str | None = None,
	prerequisites: str | None = None,
):
	_require_catalog_admin()
	from press.press.doctype.asumi_module_mapping.asumi_module_mapping import ASUMI_MODULE_IDS

	if module_id not in ASUMI_MODULE_IDS:
		frappe.throw("Choose a valid Asumi module.")
	if mode not in {"Included", "Marketplace app", "Purchase request"}:
		frappe.throw("Choose a valid catalog type.")
	if mode == "Marketplace app" and not marketplace_app:
		frappe.throw("Choose a Marketplace app for this module.")
	if mode == "Marketplace app" and marketplace_app and not frappe.db.exists("Marketplace App", marketplace_app):
		frappe.throw("The selected Marketplace app does not exist.")
	# Keep accepting `description` for cached portal bundles; it remains internal.
	description = (description or "").strip()
	customer_description = (customer_description or "").strip()
	if len(description) > 2000:
		frappe.throw("Internal notes cannot exceed 2000 characters.")
	if len(customer_description) > 2000:
		frappe.throw("Compatibility notes cannot exceed 2000 characters.")
	prerequisites = _parse_module_prerequisites(prerequisites)
	if prerequisites is None:
		prerequisites = []
	_validate_catalog_prerequisites(module_id, prerequisites, published)

	name = frappe.db.get_value("Asumi Module Mapping", {"module_id": module_id}, "name")
	doc = frappe.get_doc("Asumi Module Mapping", name) if name else frappe.new_doc("Asumi Module Mapping")
	doc.module_id = module_id
	doc.mode = mode
	if mode == "Marketplace app":
		doc.marketplace_app = marketplace_app
	doc.published = cint(published)
	doc.customer_description = customer_description
	doc.prerequisites = json.dumps(prerequisites)
	doc.save(ignore_permissions=True)
	return {
		"module_id": doc.module_id,
		"mode": doc.mode,
		"marketplace_app": doc.marketplace_app,
		"published": doc.published,
		"customer_description": doc.customer_description,
		"prerequisites": prerequisites,
	}


@frappe.whitelist(methods=["POST"])
def update_marketplace_plan_prices(plan: str, price_inr: str, price_usd: str):
	_require_catalog_admin()
	plan_doc = frappe.get_doc("Marketplace App Plan", plan)
	if not any(
		mapping.mode == "Marketplace app" and mapping.marketplace_app == plan_doc.app
		for mapping in _catalog_mappings(include_unpublished=True)
	):
		frappe.throw("This Marketplace plan is not connected to an Asumi module.", frappe.PermissionError)
	try:
		price_inr = float(price_inr)
		price_usd = float(price_usd)
	except (TypeError, ValueError):
		frappe.throw("Enter a valid number for each price.")
	if not isfinite(price_inr) or not isfinite(price_usd) or price_inr < 0 or price_usd < 0:
		frappe.throw("Prices cannot be negative.")
	from press.api.marketplace import update_app_plan
	from press.marketplace.doctype.marketplace_app_plan.marketplace_app_plan import get_app_plan_features

	update_app_plan(
		plan,
		{
			"title": plan_doc.title,
			"price_inr": flt(price_inr),
			"price_usd": flt(price_usd),
			"features": get_app_plan_features(plan),
			"enabled": bool(plan_doc.enabled),
		},
	)
	plan_doc.reload()
	return {"name": plan_doc.name, "price_inr": plan_doc.price_inr, "price_usd": plan_doc.price_usd}


@frappe.whitelist(methods=["POST"])
def create_marketplace_plan(
	marketplace_app: str,
	title: str,
	price_inr: str,
	price_usd: str,
	features: str | None = None,
):
	_require_catalog_admin()
	if not any(
		mapping.mode == "Marketplace app" and mapping.marketplace_app == marketplace_app
		for mapping in _catalog_mappings(include_unpublished=True)
	):
		frappe.throw("Choose a Marketplace app connected to an Asumi module.", frappe.PermissionError)

	title = (title or "").strip()
	if not title or len(title) > 140:
		frappe.throw("Enter a plan name between 1 and 140 characters.")
	try:
		price_inr = float(price_inr)
		price_usd = float(price_usd)
		features = json.loads(features or "[]")
	except (TypeError, ValueError):
		frappe.throw("Enter valid prices and plan features.")
	if not isfinite(price_inr) or not isfinite(price_usd) or price_inr < 0 or price_usd < 0:
		frappe.throw("Prices cannot be negative.")
	if not isinstance(features, list) or any(not isinstance(feature, str) for feature in features):
		frappe.throw("Plan features must be a list of descriptions.")
	features = [feature.strip() for feature in features if feature.strip()]
	if not features or len(features) > 30 or any(len(feature) > 500 for feature in features):
		frappe.throw("Add 1 to 30 plan features, each no longer than 500 characters.")

	from press.api.marketplace import create_app_plan

	plan_doc = create_app_plan(
		marketplace_app,
		{
			"title": title,
			"price_inr": flt(price_inr),
			"price_usd": flt(price_usd),
			"features": features,
		},
	)
	return {"name": plan_doc.name, "title": plan_doc.title}
