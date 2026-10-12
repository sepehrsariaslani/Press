"""Validation for the customer-service delivery choice on a Site Plan."""

EXISTING_SITE_UPGRADE = "Upgrade Existing Site"
NEW_SITE_PROVISIONING = "Create New Site"
SITE_PLAN_DELIVERY_MODES = {EXISTING_SITE_UPGRADE, NEW_SITE_PROVISIONING}


def normalize_site_plan_delivery_mode(value, default: str = EXISTING_SITE_UPGRADE) -> str:
	mode = value or default
	if mode not in SITE_PLAN_DELIVERY_MODES:
		raise ValueError("روش تحویل این تعرفه معتبر نیست")
	return mode
