"""Build safe marketplace subscription state after a failed provision attempt."""


def subscription_recovery_state(previous: dict | None) -> dict:
	"""Restore a previous subscription on renewal failure or disable a new one."""
	if previous is None:
		return {"fields": {"enabled": 0}, "secret_key": None}

	return {
		"fields": {field: previous[field] for field in ("plan", "enabled", "team")},
		"secret_key": previous.get("secret_key") if previous.get("enabled") else None,
	}
