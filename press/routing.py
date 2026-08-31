import frappe
from frappe.website.path_resolver import resolve_path as default_resolve_path


def resolve_path(path: str):
	"""Delegate normal Press routes to Frappe's resolver.

	The previous implementation also contained Erpyar-specific host routing. That
	public-site behavior has been removed, while this hook remains necessary for
	the native Press dashboard route.
	"""
	return default_resolve_path(path)
