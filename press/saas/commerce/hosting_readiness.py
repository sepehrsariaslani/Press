"""Safe administrator-facing readiness checklist for Asumi hosting sales."""

import math

from dns.exception import DNSException
from dns.resolver import Resolver


READINESS_CHECKS = (
	("live_payment", "درگاه پرداخت زنده"),
	("site_plan", "پلن ساخت سایت"),
	("root_domain", "دامنهٔ اصلی آسومی"),
	("wildcard_dns", "DNS زیردامنه‌ها"),
	("wildcard_tls", "گواهی HTTPS زیردامنه‌ها"),
	("press_infrastructure", "بنچ مشترک Docker"),
	("capacity", "ظرفیت مطابق پلن"),
	("docker_agent", "اتصال میزبان Docker"),
	("access_email", "ایمیل تحویل دسترسی سایت"),
)

RESOURCE_FIELDS = (
	"disk_free_bytes",
	"disk_total_bytes",
	"memory_available_bytes",
	"memory_total_bytes",
)

DNS_NAMESERVERS = ["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"]


def resolve_ipv4(hostname, resolver_factory=None):
	"""Resolve A records with a strict deadline so readiness checks cannot hang."""
	try:
		resolver = (resolver_factory or Resolver)(configure=False)
		resolver.nameservers = DNS_NAMESERVERS
		resolver.timeout = 1
		resolver.lifetime = 2
		return sorted({str(record.address) for record in resolver.resolve(hostname, "A")})
	except (DNSException, OSError):
		return []


def wildcard_dns_guidance(ready, root_addresses):
	"""Tell administrators the exact wildcard A record needed by the live DNS check."""
	if ready:
		return "زیردامنهٔ آزمایشی به همان سرور دامنهٔ اصلی می‌رسد."
	addresses = sorted({str(address).strip() for address in root_addresses if str(address).strip()})
	if not addresses:
		return "نشانی IP دامنهٔ اصلی در DNS پیدا نشد؛ ابتدا رکورد A برای asumi.ir را ثبت کنید و دوباره بررسی کنید."
	return (
		f"در پنل DNS، رکورد A برای نام * بسازید و مقصد را روی {'، '.join(addresses)} قرار دهید؛ "
		"پس از انتشار، دکمهٔ «بررسی دوباره» را بزنید."
	)


def hosting_capacity_reservations(order_rows, plans_by_name):
	"""Sum per-site resource reservations, counting renewals only once per site."""
	if not isinstance(plans_by_name, dict):
		raise ValueError("اطلاعات پلن‌های رزروشده معتبر نیست.")

	per_site = {}
	for order in order_rows:
		if not isinstance(order, dict):
			raise ValueError("اطلاعات سفارش رزروشده معتبر نیست.")
		reservation_key = (
			order.get("reservation_key") or order.get("docker_site") or order.get("site") or order.get("subdomain")
		)
		plan_name = order.get("plan")
		if not isinstance(reservation_key, str) or not reservation_key.strip():
			raise ValueError("سایت سفارش رزروشده مشخص نیست.")
		if not isinstance(plan_name, str) or not plan_name.strip():
			raise ValueError("پلن سفارش رزروشده مشخص نیست.")
		plan = plans_by_name.get(plan_name)
		if not isinstance(plan, dict):
			raise ValueError("پلن سفارش رزروشده پیدا نشد.")
		try:
			storage_mib = int(plan.get("max_storage_usage"))
			memory_mib = int(plan.get("memory"))
		except (TypeError, ValueError, OverflowError) as error:
			raise ValueError("سقف منابع پلن رزروشده معتبر نیست.") from error
		if storage_mib <= 0 or memory_mib <= 0:
			raise ValueError("سقف منابع پلن رزروشده معتبر نیست.")

		key = reservation_key.strip()
		previous = per_site.get(key, (0, 0))
		per_site[key] = (max(previous[0], storage_mib), max(previous[1], memory_mib))

	return {
		"sites": len(per_site),
		"reserved_disk_mib": sum(limits[0] for limits in per_site.values()),
		"reserved_memory_mib": sum(limits[1] for limits in per_site.values()),
	}


def hosting_plan_fits_capacity(
	plan,
	resources,
	reserve_disk_gb,
	reserve_memory_gb,
	reserved_disk_mib=0,
	reserved_memory_mib=0,
):
	"""Require this site's cap, existing site reservations, and host reserves."""
	if not isinstance(plan, dict) or not isinstance(resources, dict):
		return False
	try:
		storage_mib = int(plan.get("max_storage_usage"))
		memory_mib = int(plan.get("memory"))
		reserved_disk_mib = int(reserved_disk_mib)
		reserved_memory_mib = int(reserved_memory_mib)
		free_disk = resources.get("disk_free_bytes")
		free_memory = resources.get("memory_available_bytes")
		reserve_disk = normalize_capacity_reserve(reserve_disk_gb)
		reserve_memory = normalize_capacity_reserve(reserve_memory_gb)
	except (TypeError, ValueError, OverflowError):
		return False
	if (
		storage_mib <= 0
		or memory_mib <= 0
		or reserved_disk_mib < 0
		or reserved_memory_mib < 0
		or not isinstance(free_disk, int)
		or isinstance(free_disk, bool)
		or not isinstance(free_memory, int)
		or isinstance(free_memory, bool)
	):
		return False

	bytes_per_mib = 1024 * 1024
	bytes_per_gib = 1024 * bytes_per_mib
	required_disk = (storage_mib + reserved_disk_mib) * bytes_per_mib + math.ceil(reserve_disk * bytes_per_gib)
	required_memory = (memory_mib + reserved_memory_mib) * bytes_per_mib + math.ceil(reserve_memory * bytes_per_gib)
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
