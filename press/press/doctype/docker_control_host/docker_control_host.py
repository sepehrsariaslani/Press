from __future__ import annotations

from urllib.parse import urlsplit

import frappe
from frappe.model.document import Document

from press.docker_control.client import AGENT_HOST
from press.docker_control.permissions import assert_docker_control_admin


class DockerControlHost(Document):
	def validate(self):
		assert_docker_control_admin()
		parsed = urlsplit(self.endpoint or "")
		if (
			parsed.scheme != "http"
			or parsed.hostname != AGENT_HOST
			or parsed.port != 8769
			or parsed.username
			or parsed.password
			or parsed.path
			or parsed.query
			or parsed.fragment
		):
			frappe.throw("نشانی عامل باید همان آدرس خصوصی بنچ Docker باشد.")
		hosts = frappe.get_all("Docker Control Host", pluck="name")
		if any(name != self.name for name in hosts):
			frappe.throw("فقط یک میزبان Docker برای این پنل قابل ثبت است.")

	def before_save(self):
		assert_docker_control_admin()
