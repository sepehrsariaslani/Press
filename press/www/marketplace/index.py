# Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
# For license information, please see license.txt

import frappe


def get_context(_context):
	frappe.flags.redirect_location = frappe.utils.get_url("/#apps")
	raise frappe.Redirect


@frappe.whitelist(allow_guest=True)
def search(query: str, offset: int = 0, limit: int = 20):
	return frappe.qb.get_query(
		"Marketplace App",
		filters={
			"status": "Published",
			"title": ("like", f"%{query}%"),
		},
		fields=["name", "image", "title", "description", "image", "route"],
		offset=offset,
		limit=limit,
	).run(as_dict=1)


@frappe.whitelist(allow_guest=True)
def filter_by_category(category):
	return frappe.db.sql(
		"""
		SELECT
			marketplace.name,
			marketplace.title,
			marketplace.image,
			marketplace.route,
			marketplace.description
		FROM
			`tabMarketplace App` marketplace
		LEFT JOIN
			`tabMarketplace App Categories` category
		ON
			category.parent = marketplace.name
		WHERE
			marketplace.status = "Published"
		AND
			category.category = %s
		ORDER BY marketplace.frappe_approved DESC
	""",
		category,
		as_dict=True,
	)
