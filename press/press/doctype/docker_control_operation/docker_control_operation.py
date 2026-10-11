from __future__ import annotations

import frappe
from frappe.model.document import Document

from press.docker_control.permissions import assert_docker_control_admin


class DockerControlOperation(Document):
	def validate(self):
		assert_docker_control_admin()
		if self.is_new() and self.status not in ("Preparing Backup", "Awaiting Confirmation", "Queued"):
			frappe.throw("وضعیت آغاز عملیات نامعتبر است.")
