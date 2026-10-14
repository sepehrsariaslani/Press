from __future__ import annotations

import json

from press.saas.commerce.service_pricing import default_addon_offers


def execute(get_single=None) -> None:
	if get_single is None:
		import frappe

		get_single = frappe.get_single

	doc = get_single("Asumi Service Pricing")
	if not doc.get("addon_offer_config"):
		doc.set(
			"addon_offer_config",
			json.dumps(default_addon_offers(), ensure_ascii=False, sort_keys=True),
		)
		doc.save(ignore_permissions=True)
