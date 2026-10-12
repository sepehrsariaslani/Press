from __future__ import annotations

import json


def decode_backup_sites(value: str | None) -> list[str]:
	if not value:
		return []
	try:
		sites = json.loads(value)
	except (TypeError, json.JSONDecodeError) as error:
		raise ValueError("Backup site list is invalid") from error
	if not isinstance(sites, list) or not all(isinstance(site, str) for site in sites):
		raise ValueError("Backup site list is invalid")
	return sites


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
