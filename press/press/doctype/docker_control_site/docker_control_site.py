from __future__ import annotations

import re

import frappe
from frappe.model.document import Document

from press.docker_control.permissions import CUSTOMER_SITES, assert_docker_control_admin


class DockerControlSite(Document):
	def validate(self):
		assert_docker_control_admin()
		if self.domain not in CUSTOMER_SITES and not _is_asumi_hosted_site(self.domain):
			frappe.throw("این دامنه در فهرست سایت‌های مدیریت‌شده نیست.")
		existing_sites = frappe.get_all(self.doctype, filters={"domain": self.domain}, pluck="name")
		if any(name != self.name for name in existing_sites):
			frappe.throw("این دامنه قبلاً ثبت شده است.")
		if self.team and not frappe.db.exists("Team", {"name": self.team, "enabled": 1}):
			frappe.throw("تیم انتخاب‌شده فعال یا معتبر نیست.")
		if _is_asumi_hosted_site(self.domain):
			order = frappe.db.get_value(
				"Commerce Order",
				self.hosting_order,
				["order_type", "service_delivery_mode", "status", "team", "subdomain"],
				as_dict=True,
			)
			if not (
				self.hosted_status
				and order
				and order.order_type == "Hosting"
				and order.service_delivery_mode == "Create New Site"
				and order.team == self.team
				and self.domain == f"{order.subdomain}.asumi.ir"
				and order.status in {"Provisioning", "Provisioning Failed", "Active", "Expired"}
			):
				frappe.throw("سایت آسومی باید به سفارش معتبر میزبانی متصل باشد.")
		hosts = frappe.get_all("Docker Control Host", pluck="name")
		if len(hosts) != 1 or self.host != hosts[0]:
			frappe.throw("میزبان Docker ثبت نشده است.")


def _is_asumi_hosted_site(domain: str | None) -> bool:
	return bool(
		isinstance(domain, str)
		and re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.asumi\.ir", domain)
	)
