import frappe

from .common import _is_catalog_admin, _is_support_agent


@frappe.whitelist(methods=["GET"])
def admin_access():
	"""Return Asumi staff permissions without requiring a customer team."""
	return {
		"csrf_token": frappe.sessions.get_csrf_token(),
		"can_manage_catalog": _is_catalog_admin(),
		"can_manage_support": _is_support_agent(),
	}
