import frappe


def invalidate_assets_json_cache():
	"""Drop the shared manifest so rebuilt hashed assets resolve to current files."""
	frappe.client_cache.delete_value("assets_json", shared=True)
