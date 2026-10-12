# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and Contributors
# For license information, please see license.txt

import frappe

from press.www.saas.catalog import get_catalog_page_context


def get_context(context):
	context.update(
		get_catalog_page_context(
			frappe.get_all,
			can_manage_prices=frappe.has_permission("Marketplace App Plan", ptype="write"),
		)
	)
