def checkout_available_for_actor(
	*,
	enabled: bool,
	sale_enabled: bool,
	merchant_id_configured: bool,
	sandbox_mode: bool,
	is_commerce_admin: bool,
) -> bool:
	"""Keep public paid checkout out of sandbox while allowing admins to test it."""
	return bool(
		enabled
		and sale_enabled
		and merchant_id_configured
		and (not sandbox_mode or is_commerce_admin)
	)


def sale_enabled_for_settings(settings, sale_type: str = "marketplace") -> bool:
	"""Read the independent checkout flag for each Asumi product category."""
	fieldname = {
		"marketplace": "allow_marketplace_app_sales",
		"hosting": "allow_site_plan_sales",
		"services": "allow_service_sales",
	}.get(sale_type)
	return bool(fieldname and settings and getattr(settings, fieldname, False))
