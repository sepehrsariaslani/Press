import frappe
from frappe import _
from frappe.model.document import Document


class AsumiSupportRequest(Document):
	def before_insert(self):
		if not self.status:
			self.status = "Open"
		if not self.requested_by:
			self.requested_by = frappe.session.user

	def validate(self):
		if self.site and not frappe.db.exists("Site", {"name": self.site, "team": self.team}):
			frappe.throw(_("The selected site does not belong to this team."), frappe.PermissionError)

		if self.has_value_changed("status"):
			self.resolved_on = (
				frappe.utils.now_datetime() if self.status in {"Resolved", "Closed"} else None
			)
