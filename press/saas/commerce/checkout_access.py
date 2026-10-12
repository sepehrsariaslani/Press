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
