from __future__ import annotations

import re

EMAIL_PATTERN = re.compile(r"^[^@\s]{1,128}@[^@\s]{1,190}\.[^@\s]{2,63}$")


def normalize_site_admins(payload: object, expected_domain: str) -> list[dict[str, str]]:
	if not isinstance(payload, dict) or payload.get("domain") != expected_domain:
		raise ValueError("Site administrator response does not match the requested site")
	admins = payload.get("admins")
	if not isinstance(admins, list) or len(admins) > 1000:
		raise ValueError("Site administrator response has an invalid structure")

	admins_by_email: dict[str, dict[str, str]] = {}
	for admin in admins:
		if not isinstance(admin, dict) or not isinstance(admin.get("email"), str):
			raise ValueError("Site administrator identity is invalid")
		email = admin["email"].strip().casefold()
		if not EMAIL_PATTERN.fullmatch(email):
			raise ValueError("Site administrator email is invalid")
		full_name = admin.get("full_name", "")
		if full_name is None:
			full_name = ""
		if not isinstance(full_name, str):
			raise ValueError("Site administrator name is invalid")
		admins_by_email.setdefault(email, {"email": email, "full_name": full_name.strip()[:140]})
	return list(admins_by_email.values())


def reconcile_site_admins(current_source_emails: list[str], admins: list[dict[str, str]]) -> dict[str, list[str]]:
	current = {email.strip().casefold() for email in current_source_emails if isinstance(email, str)}
	desired = {admin["email"] for admin in admins}
	return {
		"added": sorted(desired - current),
		"removed": sorted(current - desired),
		"unchanged": sorted(current & desired),
	}
