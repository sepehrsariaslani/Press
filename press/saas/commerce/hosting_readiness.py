"""Safe administrator-facing readiness checklist for Asumi hosting sales."""

import math


READINESS_CHECKS = (
	("live_payment", "درگاه پرداخت زنده"),
	("site_plan", "پلن ساخت سایت"),
	("root_domain", "دامنهٔ ریشه در Press"),
	("wildcard_dns", "DNS زیردامنه‌ها"),
	("wildcard_tls", "گواهی HTTPS زیردامنه‌ها"),
	("press_infrastructure", "بنچ و سرور عمومی Press"),
	("capacity", "ظرفیت مطابق پلن"),
	("docker_agent", "اتصال میزبان Docker"),
)

RESOURCE_FIELDS = (
	"disk_free_bytes",
	"disk_total_bytes",
	"memory_available_bytes",
	"memory_total_bytes",
)


def hosting_plan_fits_capacity(plan, resources, reserve_disk_gb, reserve_memory_gb):
	"""Require each site's configured resource cap plus explicit host reserves."""
	if not isinstance(plan, dict) or not isinstance(resources, dict):
		return False
	try:
		storage_mib = int(plan.get("max_storage_usage"))
		memory_mib = int(plan.get("memory"))
		free_disk = resources.get("disk_free_bytes")
		free_memory = resources.get("memory_available_bytes")
		reserve_disk = normalize_capacity_reserve(reserve_disk_gb)
		reserve_memory = normalize_capacity_reserve(reserve_memory_gb)
	except (TypeError, ValueError, OverflowError):
		return False
	if (
		storage_mib <= 0
		or memory_mib <= 0
		or not isinstance(free_disk, int)
		or isinstance(free_disk, bool)
		or not isinstance(free_memory, int)
		or isinstance(free_memory, bool)
	):
		return False

	bytes_per_mib = 1024 * 1024
	bytes_per_gib = 1024 * bytes_per_mib
	required_disk = storage_mib * bytes_per_mib + math.ceil(reserve_disk * bytes_per_gib)
	required_memory = memory_mib * bytes_per_mib + math.ceil(reserve_memory * bytes_per_gib)
	return free_disk >= required_disk and free_memory >= required_memory


def normalize_capacity_reserve(value, allow_zero=False):
	"""Validate a configurable free-resource reserve in GiB."""
	if isinstance(value, bool):
		raise ValueError("مقدار ذخیرهٔ ظرفیت معتبر نیست.")
	try:
		reserve = float(value)
	except (TypeError, ValueError, OverflowError) as error:
		raise ValueError("مقدار ذخیرهٔ ظرفیت معتبر نیست.") from error
	if not math.isfinite(reserve) or reserve < 0 or reserve > 1_000_000:
		raise ValueError("مقدار ذخیرهٔ ظرفیت معتبر نیست.")
	if reserve == 0 and not allow_zero:
		raise ValueError("ذخیرهٔ ظرفیت باید بیشتر از صفر باشد.")
	return reserve


def build_hosting_readiness(facts, resources=None):
	"""Return only the fixed safe checklist fields used by the Press dashboard."""
	checks = []
	for key, label in READINESS_CHECKS:
		fact = facts.get(key) or {}
		checks.append(
			{
				"key": key,
				"label": label,
				"ready": fact.get("ready") is True,
				"detail": str(fact.get("detail") or "هنوز بررسی نشده است.")[:240],
			}
		)

	resource_summary = {
		key: value
		for key, value in (resources or {}).items()
		if key in RESOURCE_FIELDS and isinstance(value, int) and value >= 0
	}

	return {
		"ready": all(check["ready"] for check in checks),
		"checks": checks,
		"resources": resource_summary,
	}
