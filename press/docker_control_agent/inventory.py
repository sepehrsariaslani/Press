from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

from .config import ALLOWED_APPS, IMPACT_SITES, AgentConfig


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
	if app not in ALLOWED_APPS:
		return {"app": app, "version": "unknown", "branch": "unknown"}
	path = (config.apps_root / app).resolve(strict=True)
	if not path.is_relative_to(config.apps_root):
		raise ValueError("App path escapes the configured apps root")
	commit = subprocess.run(
		["git", "-C", str(path), "rev-parse", "--short=12", "HEAD"],
		capture_output=True,
		text=True,
		timeout=10,
		check=False,
	)
	branch = subprocess.run(
		["git", "-C", str(path), "branch", "--show-current"],
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
