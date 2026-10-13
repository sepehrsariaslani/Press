"""Safe administrator-facing readiness checklist for Asumi hosting sales."""

from dns.exception import DNSException
from dns.resolver import Resolver


READINESS_CHECKS = (
	("live_payment", "درگاه پرداخت زنده"),
	("site_plan", "پلن ساخت سایت"),
	("root_domain", "دامنهٔ اصلی آسومی"),
	("wildcard_dns", "DNS زیردامنه‌ها"),
	("wildcard_tls", "گواهی HTTPS زیردامنه‌ها"),
	("press_infrastructure", "بنچ عمومی Press و پراکسی"),
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
