"""Public Press placement checks for Asumi hosted sites."""

from __future__ import annotations


def _as_dict(value):
	if value is None:
		return None
	if isinstance(value, dict):
		return value
	if hasattr(value, "as_dict"):
		return value.as_dict()
	try:
		return vars(value)
	except TypeError:
		return None


def _enabled(value) -> bool:
	return value is True or value == 1 or value == "1"


def _names(values, field: str) -> list[str]:
	if values is None:
		return []
	result = []
	for value in values:
		if isinstance(value, dict):
			value = value.get(field)
		else:
			value = getattr(value, field, value)
		if isinstance(value, str) and value and value not in result:
			result.append(value)
	return result


def build_public_site_target(
	*,
	plan,
	root_domain,
	group,
	bench,
	server,
	proxy,
	proxy_domains,
	bench_apps,
	tls_certificate_ready,
	wildcard_dns_ready,
	wildcard_tls_ready,
	subdomain_dns_ready,
) -> dict | None:
	"""Build a placement only when every Press and public network prerequisite is ready."""
	plan = _as_dict(plan)
	root_domain = _as_dict(root_domain)
	group = _as_dict(group)
	bench = _as_dict(bench)
	server = _as_dict(server)
	proxy = _as_dict(proxy)
	if not all((plan, root_domain, group, bench, server, proxy)):
		return None

	plan_groups = _names(plan.get("release_groups"), "release_group")
	plan_apps = _names(plan.get("allowed_apps"), "app")
	bench_apps = set(bench_apps or [])
	if "frappe" not in plan_apps or "frappe" not in bench_apps:
		return None
	if not set(plan_apps).issubset(bench_apps):
		return None

	if not (
		plan.get("document_type") == "Site"
		and plan.get("commerce_delivery_mode") == "Create New Site"
		and _enabled(plan.get("enabled"))
		and not _enabled(plan.get("private_bench_support"))
		and root_domain.get("name") == "asumi.ir"
		and _enabled(root_domain.get("enabled"))
		and root_domain.get("default_cluster")
		and group.get("name") in plan_groups
		and _enabled(group.get("enabled"))
		and _enabled(group.get("public"))
		and group.get("version")
		and bench.get("status") == "Active"
		and bench.get("group") == group.get("name")
		and bench.get("cluster") == root_domain.get("default_cluster")
		and server.get("name") == bench.get("server")
		and server.get("status") == "Active"
		and _enabled(server.get("public"))
		and server.get("proxy_server") == proxy.get("name")
		and proxy.get("status") == "Active"
		and "asumi.ir" in (proxy_domains or [])
		and tls_certificate_ready is True
		and wildcard_dns_ready is True
		and wildcard_tls_ready is True
		and subdomain_dns_ready is True
	):
		return None

	return {
		"domain": root_domain["name"],
		"cluster": root_domain["default_cluster"],
		"group": group["name"],
		"version": group["version"],
		"apps": ["frappe", *sorted(set(plan_apps) - {"frappe"})],
		"bench": bench["name"],
		"server": server["name"],
	}


def public_site_target_is_ready(target: dict | None) -> bool:
	return bool(
		isinstance(target, dict)
		and target.get("domain") == "asumi.ir"
		and target.get("cluster")
		and target.get("group")
		and target.get("version")
		and isinstance(target.get("apps"), list)
		and "frappe" in target["apps"]
		and target.get("bench")
		and target.get("server")
	)


def _subdomain_dns_ready(subdomain: str | None, proxy) -> bool:
	"""Accept DNS only when it points at this Press proxy, including wildcard records."""
	from dns.resolver import Resolver

	from press.saas.commerce.api import ASUMI_ROOT_DOMAIN

	try:
		resolver = Resolver(configure=False)
		resolver.nameservers = ["1.1.1.1", "1.0.0.1", "8.8.8.8", "8.8.4.4"]
		resolver.timeout = 1
		resolver.lifetime = 2
		host = f"{subdomain}.{ASUMI_ROOT_DOMAIN}" if subdomain else f"hosting-check.{ASUMI_ROOT_DOMAIN}"
		proxy_host = proxy.get("hostname") or proxy.get("host_name")
		proxy_ip = proxy.get("ip")
		if not proxy_host and not proxy_ip:
			return False
		try:
			answers = {answer.to_text().rstrip(".").lower() for answer in resolver.resolve(host, "CNAME")}
			normalized_proxy_host = str(proxy_host or "").rstrip(".").lower()
			if normalized_proxy_host and normalized_proxy_host in answers:
				return True
		except Exception:
			pass
		try:
			addresses = {answer.address for answer in resolver.resolve(host, "A")}
			if proxy_ip and str(proxy_ip) in addresses:
				return True
			if proxy_host:
				proxy_addresses = {answer.address for answer in resolver.resolve(proxy_host, "A")}
				return bool(addresses & proxy_addresses)
		except Exception:
			return False
		return False
	except Exception:
		return False


def resolve_public_site_target(plan_doc, subdomain: str | None = None) -> dict | None:
	"""Resolve the first eligible active public Press Bench for an Asumi Site Plan."""
	import frappe

	from press.saas.commerce.api import (
		ASUMI_ROOT_DOMAIN,
		_resolve_ipv4,
		_wildcard_dns_targets_apex,
		_wildcard_tls_ready,
	)

	plan = _as_dict(plan_doc)
	if not plan:
		return None
	plan["name"] = plan.get("name") or getattr(plan_doc, "name", None)
	plan["release_groups"] = getattr(plan_doc, "release_groups", plan.get("release_groups", []))
	plan["allowed_apps"] = getattr(plan_doc, "allowed_apps", plan.get("allowed_apps", []))
	if not plan.get("name") or not _names(plan.get("release_groups"), "release_group"):
		return None

	root_domain = frappe.db.get_value(
		"Root Domain", ASUMI_ROOT_DOMAIN,
		["name", "enabled", "default_cluster"], as_dict=True,
	)
	if not root_domain:
		return None
	root_addresses = _resolve_ipv4(ASUMI_ROOT_DOMAIN)
	wildcard_dns_ready = bool(root_addresses and _wildcard_dns_targets_apex(root_addresses))
	wildcard_tls_ready = bool(root_addresses and _wildcard_tls_ready(root_addresses))
	tls_certificate_ready = bool(
		frappe.db.exists(
			"TLS Certificate",
			{"domain": ASUMI_ROOT_DOMAIN, "wildcard": 1, "status": "Active"},
		)
	)

	allowed_groups = _names(plan["release_groups"], "release_group")
	group_rows = frappe.get_all(
		"Release Group",
		filters={"name": ["in", allowed_groups], "enabled": 1, "public": 1},
		fields=["name", "enabled", "public", "version"],
		limit_page_length=len(allowed_groups),
		ignore_permissions=True,
	)
	for group in group_rows:
		benches = frappe.get_all(
			"Bench",
			filters={
				"group": group.name,
				"cluster": root_domain.default_cluster,
				"status": "Active",
			},
			fields=["name", "group", "cluster", "server", "status"],
			limit_page_length=100,
			ignore_permissions=True,
		)
		for bench in benches:
			if not bench.server:
				continue
			server = frappe.db.get_value(
				"Server", bench.server,
				["name", "status", "public", "proxy_server"], as_dict=True,
			)
			if not server or not server.proxy_server:
				continue
			proxy = frappe.db.get_value(
				"Proxy Server", server.proxy_server,
				["name", "status", "hostname", "ip"], as_dict=True,
			)
			if not proxy:
				continue
			proxy_domains = frappe.get_all(
				"Proxy Server Domain",
				filters={"parent": proxy.name, "domain": ASUMI_ROOT_DOMAIN},
				pluck="domain",
				limit_page_length=1,
				ignore_permissions=True,
			)
			bench_apps = frappe.get_all(
				"Bench App", filters={"parent": bench.name}, pluck="app",
				limit_page_length=1000, ignore_permissions=True,
			)
			candidate = build_public_site_target(
				plan=plan,
				root_domain=root_domain,
				group=group,
				bench=bench,
				server=server,
				proxy=proxy,
				proxy_domains=proxy_domains,
				bench_apps=bench_apps,
				tls_certificate_ready=tls_certificate_ready,
				wildcard_dns_ready=wildcard_dns_ready,
				wildcard_tls_ready=wildcard_tls_ready,
				subdomain_dns_ready=_subdomain_dns_ready(subdomain, proxy),
			)
			if public_site_target_is_ready(candidate):
				return candidate
	return None
