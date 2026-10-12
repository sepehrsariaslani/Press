from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
import stat
import subprocess
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING

from .config import ALLOWED_APPS, ALLOWED_SERVICES, CUSTOMER_SITES, IMPACT_SITES, AgentConfig
from .inventory import compose_command, get_inventory, run_command

if TYPE_CHECKING:
	from pathlib import Path

OPERATION_ID_RE = re.compile(r"^[a-f0-9-]{36,48}$")
COMMIT_RE = re.compile(r"^[a-f0-9]{40}$")
APP_NAME_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
STACK_RESTART_ORDER = (
	"db",
	"redis-cache",
	"redis-queue",
	"backend",
	"queue-short",
	"queue-long",
	"scheduler",
	"websocket",
)
REDACTIONS = (
	(
		re.compile(
			r"(?i)([\"']?(?:password|passwd|token|secret|authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret)[\"']?\s*[:=]\s*)(?:\"[^\"]*\"|'[^']*'|[^\s,;}\]]+)"
		),
		r"\1[redacted]",
	),
	(re.compile(r"(?i)bearer\s+[A-Za-z0-9._~-]+"), "Bearer [redacted]"),
	(re.compile(r"(?i)mysql://[^\s]+"), "[database url redacted]"),
)


class OperationError(Exception):
	pass


def write_site_subscription_key(
	sites_root: Path,
	site: str,
	app: str,
	secret_key: str | None,
	*,
	installed_apps: list[str],
) -> dict:
	"""Set or remove one marketplace key in an allowlisted site's config atomically."""
	if site not in CUSTOMER_SITES or not isinstance(app, str) or not APP_NAME_RE.fullmatch(app):
		raise OperationError("Site or app is not allowed")
	if app not in installed_apps:
		raise OperationError("Site or installed app is not allowed")
	if secret_key is not None and not re.fullmatch(r"[a-f0-9]{40}", secret_key):
		raise OperationError("Subscription key is invalid")

	try:
		root = sites_root.resolve(strict=True)
		site_path = (root / site).resolve(strict=True)
		if not site_path.is_relative_to(root) or not site_path.is_dir():
			raise OperationError("Site config path is invalid")
		config_path = site_path / "site_config.json"
		config_stat = config_path.lstat()
		if not stat.S_ISREG(config_stat.st_mode):
			raise OperationError("Site config file is invalid")
		config = json.loads(config_path.read_text(encoding="utf-8"))
		if not isinstance(config, dict):
			raise OperationError("Site config file is invalid")
	except OperationError:
		raise
	except (OSError, ValueError, json.JSONDecodeError) as error:
		raise OperationError("Site config file is unavailable") from error

	key_name = f"sk_{app}"
	if secret_key is None:
		config.pop(key_name, None)
	else:
		config[key_name] = secret_key

	file_descriptor = -1
	temporary_path = None
	try:
		file_descriptor, temporary_name = tempfile.mkstemp(prefix=".site-config-", dir=site_path)
		temporary_path = Path(temporary_name)
		with os.fdopen(file_descriptor, "w", encoding="utf-8") as temporary_file:
			file_descriptor = -1
			os.fchmod(temporary_file.fileno(), 0o600)
			if os.geteuid() == 0:
				os.fchown(temporary_file.fileno(), config_stat.st_uid, config_stat.st_gid)
			temporary_file.write(json.dumps(config, indent=1, ensure_ascii=False) + "\n")
			temporary_file.flush()
			os.fsync(temporary_file.fileno())
		os.replace(temporary_path, config_path)
		directory_fd = os.open(site_path, os.O_RDONLY)
		try:
			os.fsync(directory_fd)
		finally:
			os.close(directory_fd)
	except (OSError, ValueError, TypeError) as error:
		if file_descriptor >= 0:
			os.close(file_descriptor)
		if temporary_path:
			temporary_path.unlink(missing_ok=True)
		raise OperationError("Site config update failed") from error
	return {"site": site, "app": app, "enabled": secret_key is not None}


def init_database(connection: sqlite3.Connection) -> None:
	connection.execute("PRAGMA journal_mode=WAL")
	connection.execute("PRAGMA foreign_keys=ON")
	connection.executescript(
		"""
		CREATE TABLE IF NOT EXISTS consumed_nonces (
			nonce TEXT PRIMARY KEY,
			created_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS operations (
			operation_id TEXT PRIMARY KEY,
			payload_hash TEXT NOT NULL,
			action TEXT NOT NULL,
			target TEXT,
			arguments TEXT NOT NULL,
			status TEXT NOT NULL,
			progress TEXT NOT NULL,
			result TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS backups (
			site TEXT NOT NULL,
			backup_id TEXT NOT NULL,
			database_file TEXT NOT NULL,
			public_file TEXT NOT NULL,
			private_file TEXT NOT NULL,
			created_at TEXT NOT NULL,
			PRIMARY KEY(site, backup_id)
		);
		CREATE INDEX IF NOT EXISTS consumed_nonces_created_at ON consumed_nonces(created_at);
		"""
	)
	connection.commit()


def connect(config: AgentConfig) -> sqlite3.Connection:
	config.state_path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
	connection = sqlite3.connect(config.state_path, timeout=20)
	connection.row_factory = sqlite3.Row
	init_database(connection)
	return connection


@contextmanager
def database(config: AgentConfig):
	connection = connect(config)
	try:
		yield connection
	finally:
		connection.close()


def sanitize_text(value: str, limit: int = 4000) -> str:
	clean = value.replace("\x00", "")
	for pattern, replacement in REDACTIONS:
		clean = pattern.sub(replacement, clean)
	return clean[-limit:]


def validate_request(action: str, target: str | None, arguments: dict) -> None:  # noqa: C901
	if action not in {
		"backup_site",
		"backup_sites",
		"restore_site",
		"set_maintenance",
		"clear_cache",
		"set_scheduler",
		"migrate_site",
		"read_site_logs",
		"restart_service",
		"restart_stack",
		"deploy_app_revision",
	}:
		raise OperationError("Action is not allowed")
	if not isinstance(arguments, dict):
		raise OperationError("Invalid action arguments")
	allowed_arguments = {
		"backup_sites": {"sites"},
		"restore_site": {"backup_id"},
		"set_maintenance": {"enabled"},
		"set_scheduler": {"enabled"},
		"restart_stack": {"services"},
		"deploy_app_revision": {"app", "revision", "expected_migration_sites", "restart_services"},
	}
	if set(arguments) - allowed_arguments.get(action, set()):
		raise OperationError("Unexpected action arguments")
	if action == "backup_sites":
		if target is not None or arguments.get("sites") != list(IMPACT_SITES):
			raise OperationError("Shared backup set is invalid")
		return
	if action in {"restart_stack", "deploy_app_revision"}:
		if target is not None:
			raise OperationError("Shared action target is invalid")
		if action == "restart_stack" and arguments.get("services") != list(STACK_RESTART_ORDER):
			raise OperationError("Stack restart service list is invalid")
		if action == "deploy_app_revision":
			migration_sites = arguments.get("expected_migration_sites")
			if (
				not isinstance(migration_sites, list)
				or len(migration_sites) != len(set(migration_sites))
				or any(site not in IMPACT_SITES for site in migration_sites)
				or arguments.get("restart_services")
				!= ["backend", "queue-short", "queue-long", "scheduler", "websocket"]
			):
				raise OperationError("App deployment preview is invalid")
		return
	if action == "restart_service":
		if target not in ALLOWED_SERVICES:
			raise OperationError("Service is not allowed")
		return
	if action in {
		"backup_site",
		"restore_site",
		"set_maintenance",
		"clear_cache",
		"set_scheduler",
		"migrate_site",
		"read_site_logs",
	}:
		if target not in CUSTOMER_SITES:
			raise OperationError("Site is not allowed")
		if action == "restore_site" and not re.fullmatch(
			r"[A-Za-z0-9_.-]{1,120}", str(arguments.get("backup_id", ""))
		):
			raise OperationError("Backup ID is invalid")
		if action in {"set_maintenance", "set_scheduler"} and not isinstance(arguments.get("enabled"), bool):
			raise OperationError("State must be a boolean")
		return


def _checked_command(
	config: AgentConfig, command: list[str], timeout: int = 1800
) -> subprocess.CompletedProcess:
	try:
		result = run_command(config, command, timeout=timeout)
	except subprocess.TimeoutExpired as error:
		raise OperationError("Operation timed out") from error
	if result.returncode != 0:
		raise OperationError(f"Command failed with exit code {result.returncode}")
	return result


def _bench(
	config: AgentConfig, site: str, *arguments: str, timeout: int = 1800
) -> subprocess.CompletedProcess:
	return _checked_command(
		config,
		compose_command(config, "exec", "-T", config.backend_service, "bench", "--site", site, *arguments),
		timeout=timeout,
	)


def _backup_directory(config: AgentConfig, site: str) -> Path:
	directory = (config.backup_root / site).resolve(strict=False)
	if not directory.is_relative_to(config.backup_root):
		raise OperationError("Backup path is outside the configured backup root")
	return directory


def _backup_files(config: AgentConfig, site: str, started_at: float) -> dict:
	directory = _backup_directory(config, site)
	files = [
		item
		for item in directory.iterdir()
		if item.is_file()
		and item.resolve(strict=True).is_relative_to(directory)
		and item.stat().st_mtime >= started_at - 2
		and not re.search(r"(?i)config", item.name)
	]
	slug = site.replace(".", "_")
	database_pattern = re.compile(
		rf"^\d{{8}}_\d{{6}}-{re.escape(slug)}(?:-partial)?-database(?:-enc)?\.sql\.gz$"
	)
	database_files = [item for item in files if database_pattern.fullmatch(item.name)]
	if not database_files:
		raise OperationError("Database backup artifact was not created")
	database_file = max(database_files, key=lambda item: item.stat().st_mtime)
	backup_id = database_file.name
	prefix = re.sub(r"-database(?:-enc)?\.sql\.gz$", "", database_file.name)
	public_file = next(
		(
			item
			for item in files
			if item.name.startswith(prefix + "-files") and re.search(r"(?:-enc)?\.(?:tgz|tar)$", item.name)
		),
		None,
	)
	private_file = next(
		(
			item
			for item in files
			if item.name.startswith(prefix + "-private-files")
			and re.search(r"(?:-enc)?\.(?:tgz|tar)$", item.name)
		),
		None,
	)
	if not public_file or not private_file:
		raise OperationError("Full backup is incomplete; public/private files are missing")
	return {
		"backup_id": backup_id,
		"database": {"file": database_file.name, "bytes": database_file.stat().st_size},
		"public": {"file": public_file.name, "bytes": public_file.stat().st_size},
		"private": {"file": private_file.name, "bytes": private_file.stat().st_size},
	}


def _create_backup(config: AgentConfig, connection: sqlite3.Connection, site: str) -> dict:
	started_at = time.time()
	backup_path = f"/home/frappe/frappe-bench/backup/{site}"
	_checked_command(
		config,
		compose_command(
			config,
			"exec",
			"-T",
			"-u",
			"0",
			config.backend_service,
			"install",
			"-d",
			"-m",
			"700",
			"-o",
			"frappe",
			"-g",
			"frappe",
			backup_path,
		),
		timeout=30,
	)
	_bench(
		config,
		site,
		"backup",
		"--with-files",
		"--compress",
		"--backup-path",
		backup_path,
		timeout=3600,
	)
	artifacts = _backup_files(config, site, started_at)
	connection.execute(
		"""INSERT OR REPLACE INTO backups(site, backup_id, database_file, public_file, private_file, created_at)
		VALUES (?, ?, ?, ?, ?, ?)""",
		(
			site,
			artifacts["backup_id"],
			artifacts["database"]["file"],
			artifacts["public"]["file"],
			artifacts["private"]["file"],
			datetime.now(UTC).isoformat(),
		),
	)
	connection.commit()
	return {"site": site, **artifacts}


def _restore(config: AgentConfig, connection: sqlite3.Connection, site: str, backup_id: str) -> dict:
	row = connection.execute(
		"SELECT * FROM backups WHERE site = ? AND backup_id = ?", (site, backup_id)
	).fetchone()
	if not row:
		raise OperationError("Backup does not belong to the selected site or was not verified")
	_safety_backup = _require_recent_backups(connection, [site])[site]
	if _safety_backup["backup_id"] == backup_id:
		raise OperationError("Restore needs a newer safety backup for the same site")
	directory = _backup_directory(config, site)
	for key in ("database_file", "public_file", "private_file"):
		path = (directory / row[key]).resolve(strict=True)
		if not path.is_relative_to(directory):
			raise OperationError("Backup path validation failed")
	container_root = f"/home/frappe/frappe-bench/backup/{site}"
	_bench(
		config,
		site,
		"restore",
		f"{container_root}/{row['database_file']}",
		"--with-public-files",
		f"{container_root}/{row['public_file']}",
		"--with-private-files",
		f"{container_root}/{row['private_file']}",
		timeout=7200,
	)
	return {"site": site, "backup_id": backup_id, "restored": True}


def _installed_apps(config: AgentConfig, site: str) -> list[str]:
	result = _checked_command(
		config,
		compose_command(
			config,
			"exec",
			"-T",
			config.backend_service,
			"bench",
			"--site",
			site,
			"list-apps",
			"--format",
			"json",
		),
		timeout=45,
	)
	try:
		value = json.loads(result.stdout)
		apps = value.get(site) if isinstance(value, dict) else value
		if isinstance(apps, list) and all(isinstance(app, str) for app in apps):
			return apps
	except (ValueError, TypeError):
		pass
	raise OperationError(f"Installed-app inventory is unreadable for {site}")


def _require_recent_backups(connection: sqlite3.Connection, sites: list[str]) -> dict[str, sqlite3.Row]:
	cutoff = datetime.now(UTC) - timedelta(hours=2)
	backups = {}
	for site in sites:
		row = connection.execute(
			"SELECT * FROM backups WHERE site=? ORDER BY created_at DESC LIMIT 1", (site,)
		).fetchone()
		if not row or datetime.fromisoformat(row["created_at"]) < cutoff:
			raise OperationError(f"A recent full backup is required for {site}")
		backups[site] = row
	return backups


def preflight_app_revision(config: AgentConfig, app: str, revision: str) -> dict:
	if app not in ALLOWED_APPS or not COMMIT_RE.fullmatch(revision):
		raise OperationError("App or immutable revision is not allowed")
	app_path = (config.apps_root / app).resolve(strict=True)
	if not app_path.is_relative_to(config.apps_root):
		raise OperationError("App path escapes the configured apps root")
	status = subprocess.run(
		["git", "-C", str(app_path), "status", "--porcelain", "--untracked-files=all"],
		capture_output=True,
		text=True,
		timeout=15,
		check=False,
	)
	if status.returncode != 0 or status.stdout.strip():
		raise OperationError("App source has local changes; deployment preflight stopped")
	commit = subprocess.run(
		["git", "-C", str(app_path), "cat-file", "-e", f"{revision}^{{commit}}"],
		capture_output=True,
		text=True,
		timeout=15,
		check=False,
	)
	if commit.returncode != 0:
		raise OperationError("Pinned app revision is not available in the local repository")
	current = subprocess.run(
		["git", "-C", str(app_path), "rev-parse", "HEAD"],
		capture_output=True,
		text=True,
		timeout=15,
		check=False,
	)
	if current.returncode != 0:
		raise OperationError("Could not read app source revision")
	inventory = get_inventory(config)
	migration_sites = [
		item["domain"] for item in inventory["sites"] if app in {row["app"] for row in item["apps"]}
	]
	return {
		"app": app,
		"revision": revision,
		"current_revision": current.stdout.strip(),
		"backup_sites": list(IMPACT_SITES),
		"migration_sites": migration_sites,
		"restart_services": ["backend", "queue-short", "queue-long", "scheduler", "websocket"],
	}


def _deploy_app(  # noqa: C901
	config: AgentConfig,
	connection: sqlite3.Connection,
	app: str,
	revision: str,
	expected_migration_sites: list[str],
	restart_services: list[str],
) -> dict:
	if app not in ALLOWED_APPS or not COMMIT_RE.fullmatch(revision):
		raise OperationError("App or immutable revision is not allowed")
	_require_recent_backups(connection, list(IMPACT_SITES))
	app_path = (config.apps_root / app).resolve(strict=True)
	if not app_path.is_relative_to(config.apps_root):
		raise OperationError("App path escapes the configured apps root")
	status = subprocess.run(
		["git", "-C", str(app_path), "status", "--porcelain", "--untracked-files=all"],
		capture_output=True,
		text=True,
		timeout=15,
		check=False,
	)
	if status.returncode != 0 or status.stdout.strip():
		raise OperationError("App source has local changes; deployment stopped without changing it")
	inventory = get_inventory(config)
	migration_sites = [
		item["domain"] for item in inventory["sites"] if app in {row["app"] for row in item["apps"]}
	]
	if migration_sites != expected_migration_sites:
		raise OperationError("Installed-app inventory changed since the deployment preview")
	commit = subprocess.run(
		["git", "-C", str(app_path), "cat-file", "-e", f"{revision}^{{commit}}"],
		capture_output=True,
		text=True,
		timeout=15,
		check=False,
	)
	if commit.returncode != 0:
		raise OperationError("Pinned app revision is not available in the local repository")
	current = subprocess.run(
		["git", "-C", str(app_path), "rev-parse", "HEAD"],
		capture_output=True,
		text=True,
		timeout=15,
		check=False,
	)
	if current.returncode != 0:
		raise OperationError("Could not read app source revision")
	checkout = subprocess.run(
		["git", "-C", str(app_path), "checkout", "--detach", revision],
		capture_output=True,
		text=True,
		timeout=30,
		check=False,
	)
	if checkout.returncode != 0:
		raise OperationError("Could not select the pinned app revision")
	try:
		_checked_command(
			config,
			compose_command(
				config,
				"exec",
				"-T",
				"-e",
				"NODE_OPTIONS=--max-old-space-size=6144",
				config.backend_service,
				"yarn",
				"--cwd",
				f"apps/{app}",
				"build",
			),
			timeout=3600,
		)
		inventory = get_inventory(config)
		current_migration_sites = [
			item["domain"] for item in inventory["sites"] if app in {row["app"] for row in item["apps"]}
		]
		if current_migration_sites != expected_migration_sites:
			raise OperationError("Installed-app inventory changed after the build")
		migration_sites = current_migration_sites
		for site in migration_sites:
			_bench(config, site, "migrate", timeout=7200)
		for service in restart_services:
			_checked_command(config, compose_command(config, "restart", service), timeout=600)
		return {
			"app": app,
			"revision": revision,
			"previous_revision": current.stdout.strip(),
			"migration_sites": migration_sites,
			"restarted_services": restart_services,
		}
	except Exception:
		# Keep the selected revision in place for inspection; automatic code/database rollback is unsafe.
		raise


def _run_action(  # noqa: C901
	config: AgentConfig, connection: sqlite3.Connection, action: str, target: str | None, arguments: dict
) -> dict:
	if action == "backup_site":
		return {"backups": [_create_backup(config, connection, target)]}
	if action == "backup_sites":
		return {"backups": [_create_backup(config, connection, site) for site in IMPACT_SITES]}
	if action == "restore_site":
		return _restore(config, connection, target, str(arguments.get("backup_id", "")))
	if action == "clear_cache":
		_bench(config, target, "clear-cache")
		return {"site": target, "cleared": True}
	if action == "set_maintenance":
		state = arguments.get("enabled")
		if not isinstance(state, bool):
			raise OperationError("Maintenance state must be a boolean")
		_bench(config, target, "set-maintenance-mode", "on" if state else "off")
		return {"site": target, "maintenance": state}
	if action == "set_scheduler":
		state = arguments.get("enabled")
		if not isinstance(state, bool):
			raise OperationError("Scheduler state must be a boolean")
		_bench(config, target, "enable-scheduler" if state else "disable-scheduler")
		return {"site": target, "scheduler": state}
	if action == "migrate_site":
		_require_recent_backups(connection, [target])
		_bench(config, target, "migrate", timeout=7200)
		return {"site": target, "migrated": True}
	if action == "read_site_logs":
		logs = ""
		for filename in ("frappe.web.log", "frappe.log"):
			log_path = f"/home/frappe/frappe-bench/sites/{target}/logs/{filename}"
			try:
				result = _checked_command(
					config,
					compose_command(
						config, "exec", "-T", config.backend_service, "tail", "-n", "200", log_path
					),
					timeout=30,
				)
			except OperationError:
				continue
			if result.stdout.strip():
				logs = result.stdout
				break
		return {"site": target, "logs": sanitize_text(logs, 12000)}
	if action == "restart_service":
		_require_recent_backups(connection, list(IMPACT_SITES))
		_checked_command(config, compose_command(config, "restart", target), timeout=600)
		return {"service": target, "restarted": True, "impact_sites": list(IMPACT_SITES)}
	if action == "restart_stack":
		_require_recent_backups(connection, list(IMPACT_SITES))
		services = arguments["services"]
		for service in services:
			_checked_command(config, compose_command(config, "restart", service), timeout=600)
		return {"services": services, "restarted": True, "impact_sites": list(IMPACT_SITES)}
	if action == "deploy_app_revision":
		return _deploy_app(
			config,
			connection,
			str(arguments.get("app", "")),
			str(arguments.get("revision", "")),
			arguments["expected_migration_sites"],
			arguments["restart_services"],
		)
	raise OperationError("Action is not implemented")


class OperationManager:
	def __init__(self, config: AgentConfig):
		self.config = config
		self.pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="press-docker-control")
		self.guard = threading.Lock()
		with database(config) as connection:
			connection.execute(
				"UPDATE operations SET status='Failure', progress='Agent restarted during operation', "
				"result=? , updated_at=? WHERE status IN ('Accepted','Running')",
				(json.dumps({"error": "Agent restarted during operation"}), datetime.now(UTC).isoformat()),
			)
			connection.commit()

	def start(self, operation_id: str, action: str, target: str | None, arguments: dict) -> dict:
		if not OPERATION_ID_RE.fullmatch(operation_id):
			raise OperationError("Operation ID is invalid")
		validate_request(action, target, arguments)
		payload = json.dumps(
			{"action": action, "target": target, "arguments": arguments},
			sort_keys=True,
			separators=(",", ":"),
		)
		payload_hash = hashlib.sha256(payload.encode()).hexdigest()
		with self.guard, database(self.config) as connection:
			existing = connection.execute(
				"SELECT * FROM operations WHERE operation_id=?", (operation_id,)
			).fetchone()
			if existing:
				if existing["payload_hash"] != payload_hash:
					raise OperationError("Operation ID was already used for another request")
				return self._serialize(existing)
			now = datetime.now(UTC).isoformat()
			connection.execute(
				"INSERT INTO operations(operation_id,payload_hash,action,target,arguments,status,progress,created_at,updated_at) "
				"VALUES(?,?,?,?,?,'Accepted','Queued',?,?)",
				(operation_id, payload_hash, action, target, json.dumps(arguments), now, now),
			)
			connection.commit()
		self.pool.submit(self._run, operation_id, action, target, arguments)
		return {"operation_id": operation_id, "status": "Accepted", "progress": "Queued"}

	def _update(self, operation_id: str, status: str, progress: str, result: dict | None = None) -> None:
		with database(self.config) as connection:
			connection.execute(
				"UPDATE operations SET status=?, progress=?, result=?, updated_at=? WHERE operation_id=?",
				(
					status,
					sanitize_text(progress, 500),
					json.dumps(result) if result is not None else None,
					datetime.now(UTC).isoformat(),
					operation_id,
				),
			)
			connection.commit()

	def _run(self, operation_id: str, action: str, target: str | None, arguments: dict) -> None:
		self._update(operation_id, "Running", "Operation started")
		try:
			with database(self.config) as connection:
				result = _run_action(self.config, connection, action, target, arguments)
			self._update(operation_id, "Success", "Operation completed", result)
		except Exception as error:
			message = (
				str(error)
				if isinstance(error, OperationError)
				else "Operation failed; inspect the host service journal"
			)
			self._update(operation_id, "Failure", message, {"error": sanitize_text(message, 500)})

	@staticmethod
	def _serialize(row: sqlite3.Row) -> dict:
		return {
			"operation_id": row["operation_id"],
			"action": row["action"],
			"target": row["target"],
			"status": row["status"],
			"progress": row["progress"],
			"result": json.loads(row["result"]) if row["result"] else None,
			"created_at": row["created_at"],
			"updated_at": row["updated_at"],
		}

	def get(self, operation_id: str) -> dict:
		if not OPERATION_ID_RE.fullmatch(operation_id):
			raise OperationError("Operation ID is invalid")
		with database(self.config) as connection:
			row = connection.execute(
				"SELECT * FROM operations WHERE operation_id=?", (operation_id,)
			).fetchone()
		if not row:
			raise OperationError("Operation was not found")
		return self._serialize(row)
