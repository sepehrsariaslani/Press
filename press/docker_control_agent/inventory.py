from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from pathlib import Path

from .config import CUSTOMER_SITES, IMPACT_SITES, AgentConfig

APP_NAME_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")


def compose_command(config: AgentConfig, *arguments: str) -> list[str]:
	command = ["docker", "compose"]
	for compose_file in config.compose_files:
		command.extend(("-f", str(compose_file)))
	command.extend(arguments)
	return command


def run_command(config: AgentConfig, command: list[str], timeout: int = 30) -> subprocess.CompletedProcess:
	return subprocess.run(
		command,
		cwd=config.project_root,
		capture_output=True,
		text=True,
		shell=False,
		timeout=timeout,
		check=False,
	)


def _parse_all_apps(output: str) -> dict[str, list[str]]:
	try:
		payload = json.loads(output)
	except json.JSONDecodeError as error:
		raise ValueError("Could not parse installed-app inventory") from error
	if not isinstance(payload, dict) or any(
		not isinstance(domain, str)
		or not isinstance(apps, list)
		or not all(isinstance(app, str) for app in apps)
		for domain, apps in payload.items()
	):
		raise ValueError("Installed-app inventory has an invalid structure")
	return {domain: sorted(set(apps)) for domain, apps in payload.items()}


def _app_revision(config: AgentConfig, app: str) -> dict:
	if not isinstance(app, str) or not APP_NAME_RE.fullmatch(app):
		return {"app": app, "version": "unknown", "branch": "unknown"}
	try:
		apps_root = config.apps_root.resolve(strict=True)
		path = (apps_root / app).resolve(strict=True)
	except (OSError, RuntimeError):
		return {"app": app, "version": "unknown", "branch": "unknown"}
	if not path.is_relative_to(apps_root) or not path.is_dir():
		return {"app": app, "version": "unknown", "branch": "unknown"}
	git_prefix = ["git", "-c", f"safe.directory={path}", "-C", str(path)]
	commit = subprocess.run(
		[*git_prefix, "rev-parse", "--short=12", "HEAD"],
		capture_output=True,
		text=True,
		timeout=10,
		check=False,
	)
	branch = subprocess.run(
		[*git_prefix, "branch", "--show-current"],
		capture_output=True,
		text=True,
		timeout=10,
		check=False,
	)
	return {
		"app": app,
		"version": commit.stdout.strip() if commit.returncode == 0 else "unknown",
		"branch": branch.stdout.strip()[:80] if branch.returncode == 0 else "unknown",
	}


def _compose_state(config: AgentConfig) -> list[dict]:
	result = run_command(config, compose_command(config, "ps", "--format", "json"), timeout=15)
	if result.returncode != 0:
		return []
	try:
		payload = json.loads(result.stdout)
		if isinstance(payload, dict):
			payload = [payload]
	except json.JSONDecodeError:
		payload = [json.loads(line) for line in result.stdout.splitlines() if line.strip()]
	return [
		{
			"service": item.get("Service", item.get("Name", "")),
			"state": item.get("State", "unknown"),
			"status": item.get("Status", "unknown")[:120],
		}
		for item in payload
		if item.get("Service", item.get("Name"))
	]


def _resource_summary(config: AgentConfig) -> dict:
	memory = {}
	try:
		for line in Path("/proc/meminfo").read_text().splitlines():
			key, value = line.split(":", 1)
			if key in {"MemTotal", "MemAvailable"}:
				memory[key] = int(value.strip().split()[0]) * 1024
	except (OSError, ValueError):
		memory = {}
	disk = shutil.disk_usage(config.project_root)
	return {
		"cpu_count": os.cpu_count() or 1,
		"memory_total_bytes": memory.get("MemTotal"),
		"memory_available_bytes": memory.get("MemAvailable"),
		"disk_total_bytes": disk.total,
		"disk_free_bytes": disk.free,
	}


def get_resources(config: AgentConfig) -> dict:
	"""Return fast capacity data without querying the Bench or git repositories."""
	return {
		"protocol_version": 1,
		"resources": _resource_summary(config),
	}


def _execute_bench_json(config: AgentConfig, domain: str, method: str, kwargs: dict) -> object:
	command = compose_command(
		config,
		"exec",
		"-T",
		config.backend_service,
		"bench",
		"--site",
		domain,
		"execute",
		method,
		"--kwargs",
		repr(kwargs),
	)
	result = run_command(config, command, timeout=30)
	if result.returncode != 0:
		raise RuntimeError("Site administrator query failed")
	if not result.stdout.strip():
		# bench execute suppresses falsy return values, including an empty list.
		return []
	try:
		return json.loads(result.stdout)
	except json.JSONDecodeError as error:
		raise RuntimeError("Site administrator query returned invalid data") from error


def get_site_admins(config: AgentConfig, domain: str) -> dict:
	"""Return active System Manager identities from one fixed customer site."""
	if domain not in CUSTOMER_SITES:
		raise ValueError("Site is not allowed")

	role_users = _execute_bench_json(
		config,
		domain,
		"frappe.get_all",
		{
			"doctype": "Has Role",
			"filters": {"parenttype": "User", "parentfield": "roles", "role": "System Manager"},
			"pluck": "parent",
			"order_by": "parent asc",
			"limit_page_length": 1000,
		},
	)
	if not isinstance(role_users, list) or any(not isinstance(user, str) for user in role_users):
		raise RuntimeError("Site administrator query returned invalid data")
	user_names = sorted({user for user in role_users if user not in {"Administrator", "Guest"}})
	if not user_names:
		return {"domain": domain, "admins": []}

	users = _execute_bench_json(
		config,
		domain,
		"frappe.get_all",
		{
			"doctype": "User",
			"filters": {"name": ["in", user_names], "enabled": 1},
			"fields": ["name", "email", "full_name"],
			"order_by": "name asc",
			"limit_page_length": min(len(user_names) + 1, 1000),
		},
	)
	if not isinstance(users, list):
		raise RuntimeError("Site administrator query returned invalid data")

	admins_by_email = {}
	for user in users:
		if not isinstance(user, dict) or user.get("name") not in user_names:
			continue
		email = user.get("email")
		if not isinstance(email, str):
			continue
		email = email.strip().casefold()
		if not re.fullmatch(r"[^@\s]{1,128}@[^@\s]{1,190}\.[^@\s]{2,63}", email):
			continue
		full_name = user.get("full_name")
		admins_by_email.setdefault(
			email,
			{"email": email, "full_name": full_name.strip()[:140] if isinstance(full_name, str) else ""},
		)
	return {"domain": domain, "admins": list(admins_by_email.values())}


def get_inventory(config: AgentConfig) -> dict:
	result = run_command(
		config,
		compose_command(
			config,
			"exec",
			"-T",
			config.backend_service,
			"bench",
			"--site",
			"all",
			"list-apps",
			"--format",
			"json",
		),
		timeout=90,
	)
	if result.returncode != 0:
		raise RuntimeError("Inventory query failed")
	apps_by_domain = _parse_all_apps(result.stdout)
	if set(apps_by_domain) != set(IMPACT_SITES):
		raise RuntimeError("Bench domains differ from the fixed inventory")
	for domain in IMPACT_SITES:
		site_path = (config.sites_root / domain).resolve(strict=True)
		if not site_path.is_relative_to(config.sites_root) or not site_path.is_dir():
			raise RuntimeError(f"Site directory validation failed for {domain}")
	sites = [
		{"domain": domain, "apps": [_app_revision(config, app) for app in apps_by_domain[domain]]}
		for domain in IMPACT_SITES
	]
	return {
		"protocol_version": 1,
		"domains": list(IMPACT_SITES),
		"resources": _resource_summary(config),
		"services": _compose_state(config),
		"sites": sites,
	}
