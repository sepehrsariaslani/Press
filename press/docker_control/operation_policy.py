from __future__ import annotations


def preparation_backup_request(
	action: str,
	target: str | None,
	*,
	customer_sites: tuple[str, ...],
	impact_sites: tuple[str, ...],
) -> tuple[str, str | None, dict]:
	if action in {"restore_site", "migrate_site"} and target in customer_sites:
		return "backup_site", target, {}

	if action in {"restart_service", "restart_stack", "deploy_app_revision"}:
		return "backup_sites", None, {"sites": list(impact_sites)}

	raise ValueError("No preparation backup is defined for this operation")
