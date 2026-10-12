# Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
# For license information, please see license.txt

import frappe

from press.www.saas.catalog import add_app_categories, get_public_marketplace_catalog


def get_context(context):
	context.no_cache = 1
	context.body_class = " ".join(filter(None, (context.get("body_class", ""), "asumi-commerce-page")))
	context.marketplace_apps = get_public_marketplace_catalog(frappe.get_all)
	app_names = [app["id"] for app in context.marketplace_apps]
	category_rows = (
		frappe.get_all(
			"Marketplace App Categories",
			filters={"parent": ["in", app_names]},
			fields=["parent", "category"],
			order_by="parent asc, idx asc",
		)
		if app_names
		else []
	)
	context.categories = add_app_categories(context.marketplace_apps, category_rows)
	context.metatags = {
		"title": "مارکت‌پلیس اپلیکیشن‌های آسومی",
		"description": "اپلیکیشن‌های منتشرشده و پلن‌های ثبت‌شده در مارکت‌پلیس آسومی.",
		"og:type": "website",
	}


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
