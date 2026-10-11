from __future__ import annotations

import frappe
from frappe.model.document import Document

from press.docker_control.permissions import CUSTOMER_SITES, assert_docker_control_admin


class DockerControlSite(Document):
	def validate(self):
		assert_docker_control_admin()
		if self.domain not in CUSTOMER_SITES:
			frappe.throw("این دامنه در فهرست سایت‌های مدیریت‌شده نیست.")
		if self.domain == "boller.ir" and self.team:
			frappe.throw("برای boller.ir تیمی به‌صورت خودکار ثبت نمی‌شود.")
		existing_sites = frappe.get_all(self.doctype, filters={"domain": self.domain}, pluck="name")
		if any(name != self.name for name in existing_sites):
			frappe.throw("این دامنه قبلاً ثبت شده است.")
		hosts = frappe.get_all("Docker Control Host", pluck="name")
		if len(hosts) != 1 or self.host != hosts[0]:
			frappe.throw("میزبان Docker ثبت نشده است.")
