# Copyright (c) 2026, Frappe and contributors
# For license information, please see license.txt
from __future__ import annotations

import frappe
from frappe.model.document import Document
from frappe.utils import cint, flt, getdate, nowdate


class ManualPaymentRecord(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		amount: DF.Currency
		amended_from: DF.Link | None
		app: DF.Link
		billing_cycle: DF.Literal["Monthly", "Annual"]
		currency: DF.Data
		cycles: DF.Int
		notes: DF.SmallText | None
		paid_at: DF.Datetime
		processed_until: DF.Date | None
		reference_no: DF.Data
		saas_app_plan: DF.Link
		saas_app_subscription: DF.Link
		site: DF.Link
		team: DF.Link
	# end: auto-generated types

	def validate(self):
		self.cycles = cint(self.cycles or 1)
		self.amount = flt(self.amount)

		if self.amount <= 0:
			frappe.throw("Amount must be greater than zero")

		if self.cycles < 1:
			frappe.throw("Cycles should be at least 1")

		if self.cycles > 36:
			frappe.throw("Cycles cannot be greater than 36")

		self.sync_subscription_details()
		self.validate_unique_reference()

	def sync_subscription_details(self):
		subscription = frappe.get_doc("Saas App Subscription", self.saas_app_subscription)
		self.team = subscription.team
		self.site = subscription.site
		self.app = subscription.app
		self.saas_app_plan = subscription.saas_app_plan
		self.currency = frappe.db.get_value("Team", subscription.team, "currency") or self.currency or "IRR"

		site_team = frappe.db.get_value("Site", self.site, "team")
		if site_team != self.team:
			frappe.throw("Site and subscription team mismatch")

	def validate_unique_reference(self):
		duplicate = frappe.db.exists(
			"Manual Payment Record",
			{
				"name": ("!=", self.name),
				"team": self.team,
				"reference_no": self.reference_no,
				"docstatus": 1,
			},
		)
		if duplicate:
			frappe.throw(f"Submitted payment already exists for reference {self.reference_no}")

	def on_submit(self):
		subscription = frappe.get_doc("Saas App Subscription", self.saas_app_subscription)

		if not subscription.end_date or getdate(subscription.end_date) < getdate(nowdate()):
			subscription.end_date = getdate(nowdate())

		for _i in range(self.cycles):
			subscription.update_end_date(self.billing_cycle)

		subscription.interval = "Monthly" if self.billing_cycle == "Monthly" else "Annual"
		if not subscription.start_date:
			subscription.start_date = getdate(nowdate())

		subscription.status = "Active"
		subscription.save(ignore_permissions=True)
		frappe.get_doc("Site", subscription.site).activate()

		self.db_set("processed_until", subscription.end_date, update_modified=False)

	def on_cancel(self):
		frappe.throw(
			"Manual payment reversal is not automatic. Please create an offsetting record instead of canceling."
		)
