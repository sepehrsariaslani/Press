# Copyright (c) 2021, Frappe and contributors
# For license information, please see license.txt

from typing import ClassVar

import frappe

from press.press.doctype.site_plan.plan import Plan
from press.saas.commerce.pricing import normalize_marketplace_app_plan_prices


class MarketplaceAppPlan(Plan):
	dashboard_fields: ClassVar = [
		"app",
		"name",
		"title",
		"interval",
		"price_inr",
		"price_usd",
		"price_irr",
		"enabled",
	]

	@staticmethod
	def get_list_query(query):
		plans = query.run(as_dict=True)
		for plan in plans:
			plan["features"] = get_app_plan_features(plan.name)

		return plans

	def validate(self):
		try:
			self.update(
				normalize_marketplace_app_plan_prices(
					{
						"price_inr": self.price_inr,
						"price_usd": self.price_usd,
						"price_irr": self.price_irr,
					}
				)
			)
		except ValueError as error:
			frappe.throw(str(error))

		old_doc = self.get_doc_before_save()
		if not old_doc:
			return
		price_fields = ("price_inr", "price_usd", "price_irr")
		price_changed = any((self.get(field) or 0) != (old_doc.get(field) or 0) for field in price_fields)
		interval_changed = self.interval != old_doc.interval
		if not price_changed and not interval_changed:
			return
		active_subscriptions = frappe.db.count(
			"Subscription",
			{
				"document_type": "Marketplace App",
				"plan_type": "Marketplace App Plan",
				"plan": self.name,
				"enabled": 1,
			},
		)
		pending_orders = 0
		if frappe.db.exists("DocType", "Commerce Order"):
			pending_orders = frappe.db.count(
				"Commerce Order",
				{
					"plan": self.name,
					"status": ["in", ["Pending Payment", "Paid", "Provisioning", "Provisioning Failed"]],
				},
			)
		if active_subscriptions or pending_orders:
			frappe.throw("This plan has active subscribers or orders. Create a new plan to change its pricing.")

	def after_insert(self):
		self.update_marketplace_app_subscription_type()

	def on_update(self):
		self.update_marketplace_app_subscription_type()

	def update_marketplace_app_subscription_type(self):
		plans = frappe.get_all(
			"Marketplace App Plan",
			filters={"app": self.app, "enabled": 1},
			fields=["price_inr", "price_usd", "price_irr"],
			ignore_permissions=True,
		)
		has_paid_plan = any(
			float(plan.get("price_inr") or 0) > 0
			or float(plan.get("price_usd") or 0) > 0
			or float(plan.get("price_irr") or 0) > 0
			for plan in plans
		)
		frappe.db.set_value(
			"Marketplace App",
			self.app,
			"subscription_type",
			"Paid" if has_paid_plan else "Free",
		)

	@staticmethod
	def create_marketplace_app_subscription(
		site_name, app_name, plan_name, team_name, while_site_creation=False
	):
		marketplace_app = frappe.db.get_value("Marketplace App", {"app": app_name})
		subscription = frappe.db.exists(
			"Subscription",
			{
				"site": site_name,
				"document_type": "Marketplace App",
				"document_name": marketplace_app,
			},
		)

		# If already exists, update the plan and activate
		if subscription:
			subscription = frappe.get_doc(
				"Subscription",
				subscription,
				for_update=True,
			)

			subscription.plan = plan_name
			subscription.enabled = 1
			subscription.save(ignore_permissions=True)
			subscription.reload()

			return subscription

		return frappe.get_doc(
			{
				"doctype": "Subscription",
				"document_type": "Marketplace App",
				"document_name": app_name,
				"plan_type": "Marketplace App Plan",
				"plan": plan_name,
				"site": site_name,
				"team": team_name,
			}
		).insert(ignore_permissions=True)


def get_app_plan_features(app_plan: str) -> list[str]:
	return frappe.get_all("Plan Feature", filters={"parent": app_plan}, pluck="description", order_by="idx")
