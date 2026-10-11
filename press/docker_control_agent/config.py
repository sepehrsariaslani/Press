from __future__ import annotations

import ipaddress
import json
import os
import stat
from dataclasses import dataclass
from pathlib import Path

CUSTOMER_SITES = ("boller.ir", "dehati.ir", "denroom.ir", "veederakht.ir")
IMPACT_SITES = ("asumi.ir", *CUSTOMER_SITES)
ALLOWED_SERVICES = (
	"backend",
	"websocket",
	"queue-short",
	"queue-long",
	"scheduler",
	"db",
	"redis-cache",
	"redis-queue",
)
ALLOWED_APPS = ("accounts", "restaurant")
MAX_BODY_BYTES = 64 * 1024


@dataclass(frozen=True)
class AgentConfig:
	bind_address: str
	port: int
	project_root: Path
	runtime_root: Path
	compose_files: tuple[Path, ...]
	backend_service: str
	apps_root: Path
	sites_root: Path
	backup_root: Path
	state_path: Path
	auth_key: bytes


def _inside(path: Path, root: Path) -> bool:
	try:
		path.resolve(strict=False).relative_to(root.resolve(strict=False))
		return True
	except ValueError:
		return False


def load_config(path: str) -> AgentConfig:  # noqa: C901
	config_path = Path(path).resolve(strict=True)
	if config_path.stat().st_mode & (stat.S_IRWXG | stat.S_IRWXO):
		raise ValueError("Agent config permissions must be 0600 or stricter")
	data = json.loads(config_path.read_text(encoding="utf-8"))
	project_root = Path(data["project_root"]).resolve(strict=True)
	runtime_root = Path(data["runtime_root"]).resolve(strict=True)
	compose_files = tuple(Path(item).resolve(strict=True) for item in data["compose_files"])
	apps_root = Path(data["apps_root"]).resolve(strict=True)
	sites_root = Path(data["sites_root"]).resolve(strict=True)
	backup_root = Path(data["backup_root"]).resolve(strict=True)
	state_path = Path(data["state_path"]).resolve(strict=False)

	if any(not _inside(item, project_root) for item in compose_files):
		raise ValueError("Compose files must stay under project_root")
	if not _inside(apps_root, project_root):
		raise ValueError("apps_root must stay under project_root")
	if not _inside(sites_root, runtime_root) or not _inside(backup_root, runtime_root):
		raise ValueError("sites_root and backup_root must stay under runtime_root")
	if data.get("customer_sites") != list(CUSTOMER_SITES):
		raise ValueError("customer_sites does not match the fixed allowlist")
	if data.get("impact_sites") != list(IMPACT_SITES):
		raise ValueError("impact_sites does not match the fixed impact list")
	if data.get("allowed_services") != list(ALLOWED_SERVICES):
		raise ValueError("allowed_services does not match the fixed allowlist")
	if data.get("allowed_apps") != list(ALLOWED_APPS):
		raise ValueError("allowed_apps does not match the fixed app list")
	if data.get("backend_service") != "backend":
		raise ValueError("backend_service must be backend")

	bind_address = data["bind_address"]
	parsed_address = ipaddress.ip_address(bind_address)
	if not parsed_address.is_private or parsed_address.is_loopback or parsed_address.is_unspecified:
		raise ValueError("Agent must bind to a private address")
	port = int(data["port"])
	if not 1024 <= port <= 65535:
		raise ValueError("Agent port is outside the allowed range")
	auth_key = os.environ.get("PRESS_DOCKER_CONTROL_HMAC_KEY", "").encode("utf-8")
	if len(auth_key) < 32:
		raise ValueError("PRESS_DOCKER_CONTROL_HMAC_KEY must contain at least 32 bytes")
	state_root = state_path.parent.resolve(strict=False)
	if not _inside(state_root, Path("/var/lib/press-docker-control-agent")):
		raise ValueError("state_path must be under /var/lib/press-docker-control-agent")

	return AgentConfig(
		bind_address=bind_address,
		port=port,
		project_root=project_root,
		runtime_root=runtime_root,
		compose_files=compose_files,
		backend_service="backend",
		apps_root=apps_root,
		sites_root=sites_root,
		backup_root=backup_root,
		state_path=state_path,
		auth_key=auth_key,
	)
