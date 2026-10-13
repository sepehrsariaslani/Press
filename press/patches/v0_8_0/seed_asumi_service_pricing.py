from __future__ import annotations

import json

from press.saas.commerce.service_pricing import default_service_prices


def execute(get_single=None) -> None:
	if get_single is None:
		import frappe

		get_single = frappe.get_single
	doc = get_single("Asumi Service Pricing")
	defaults = default_service_prices()
	changed = False
	for fieldname, key in (
		("module_prices", "modules"),
		("addon_prices", "addons"),
		("package_prices", "packages"),
	):
		if not doc.get(fieldname):
			doc.set(fieldname, json.dumps(defaults[key], ensure_ascii=False, sort_keys=True))
			changed = True

	if changed:
		doc.save(ignore_permissions=True)
