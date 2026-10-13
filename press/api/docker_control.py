# ruff: noqa: RUF001
from __future__ import annotations

import hashlib
import hmac
import json
import re
import secrets
import time
import uuid
from datetime import timedelta

import frappe
from frappe.utils import cint, get_datetime, now_datetime

from press.docker_control.client import DockerControlClient, DockerControlError
from press.docker_control.operation_policy import decode_backup_sites, preparation_backup_request
from press.docker_control.permissions import (
	ALLOWED_APPS,
	ALLOWED_SERVICES,
	CUSTOMER_SITES,
	IMPACT_SITES,
	SITE_SCOPED_ACTIONS,
	STACK_RESTART_ORDER,
	assert_docker_control_admin,
	assert_docker_control_operation_admin,
	can_manage_docker_control_site,
	is_docker_control_admin,
)
from press.docker_control.site_admin_sync import normalize_site_admins, reconcile_site_admins

AGENT_ENDPOINT = "http://172.18.0.1:8769"
CONFIRMATION_SECONDS = 600
POLL_INTERVAL_SECONDS = 2
OPERATION_TIMEOUT_SECONDS = 10800
MARKETPLACE_INSTALL_TIMEOUT_SECONDS = 12600
SHA_RE = re.compile(r"^[a-f0-9]{40}$")


class DockerAgentOperationFailure(DockerControlError):
	def __init__(self, message: str, result: dict):
		super().__init__(message)
		self.result = result


def _host_doc():
	hosts = frappe.get_all("Docker Control Host", pluck="name")
	if len(hosts) != 1:
		frappe.throw("عامل Docker هنوز ثبت نشده است.")
	return frappe.get_doc("Docker Control Host", hosts[0])


def _client(host=None, hmac_key=None) -> DockerControlClient:
	return DockerControlClient(host or _host_doc(), hmac_key=hmac_key)


def _validate_inventory(inventory: dict) -> list[dict]:
	if not isinstance(inventory, dict) or inventory.get("protocol_version") != 1:
		frappe.throw("نسخهٔ پروتکل عامل با Press سازگار نیست.")
	if inventory.get("domains") != list(IMPACT_SITES):
		frappe.throw("فهرست دامنه‌های بنچ با فهرست مورد انتظار یکسان نیست.")
	bench_apps = inventory.get("bench_apps")
	if bench_apps is not None and (
		not isinstance(bench_apps, list)
		or any(not isinstance(app, str) or not re.fullmatch(r"[a-z][a-z0-9_]{0,63}", app) for app in bench_apps)
		or len(bench_apps) != len(set(bench_apps))
	):
		frappe.throw("فهرست برنامه‌های بنچ در موجودی عامل معتبر نیست.")
	sites = inventory.get("sites")
	if not isinstance(sites, list):
		frappe.throw("ساختار موجودی سایت‌ها معتبر نیست.")
	by_domain = {}
	for site in sites:
		_validate_inventory_site(site, by_domain)
	if set(by_domain) != set(IMPACT_SITES):
		frappe.throw("موجودی باید دقیقاً هر پنج دامنهٔ بنچ را شامل شود.")
	return [by_domain[domain] for domain in IMPACT_SITES]


def _validate_inventory_site(site, by_domain: dict) -> None:
	if not isinstance(site, dict) or site.get("domain") in by_domain:
		frappe.throw("دامنهٔ تکراری یا نامعتبر در موجودی عامل پیدا شد.")
	if not isinstance(site.get("apps"), list):
		frappe.throw("ساختار برنامه‌های نصب‌شده معتبر نیست.")
	for app in site["apps"]:
		if not isinstance(app, dict) or not isinstance(app.get("app"), str):
			frappe.throw("اطلاعات برنامهٔ نصب‌شده معتبر نیست.")
	by_domain[site["domain"]] = site


def _store_inventory(host, inventory: dict) -> None:
	sites = _validate_inventory(inventory)
	now = now_datetime()
	host.connection_status = "Connected"
	host.protocol_version = inventory["protocol_version"]
	host.agent_version = "1.0.0"
	host.compose_project = "den-v16-docker"
	host.last_inventory_at = now
	host.inventory = json.dumps(inventory, ensure_ascii=False)
	host.save(ignore_permissions=True)
	for site_data in sites:
		domain = site_data["domain"]
		if domain not in CUSTOMER_SITES:
			continue
		if frappe.db.exists("Docker Control Site", domain):
			site_doc = frappe.get_doc("Docker Control Site", domain)
		else:
			site_doc = frappe.new_doc("Docker Control Site")
			site_doc.domain = domain
			site_doc.host = host.name
			site_doc.enabled = 1
		site_doc.last_inventory_at = now
		site_doc.apps = []
		for app in site_data["apps"]:
			site_doc.append(
				"apps",
				{
					"app": app["app"],
					"version": str(app.get("version", "unknown"))[:100],
					"branch": str(app.get("branch", "unknown"))[:100],
				},
			)
		site_doc.save(ignore_permissions=True)


def _dashboard_payload(
	host=None, *, visible_domains: list[str] | None = None, can_manage_host: bool = True
) -> dict:
	host = host or _host_doc()
	parsed_inventory = json.loads(host.inventory) if host.inventory else {}
	sites = []
	allowed_domains = visible_domains if visible_domains is not None else CUSTOMER_SITES
	for domain in allowed_domains:
		if frappe.db.exists("Docker Control Site", domain):
			doc = frappe.get_doc("Docker Control Site", domain)
			team_title = frappe.db.get_value("Team", doc.team, "team_title") if doc.team else None
			sites.append(
				{
					"domain": doc.domain,
					"enabled": bool(doc.enabled),
					"team": doc.team or None,
					"team_title": team_title or (domain.split(".", 1)[0].capitalize() if doc.team else None),
					"last_inventory_at": str(doc.last_inventory_at or ""),
					"apps": [
						{"app": row.app, "version": row.version, "branch": row.branch} for row in doc.apps
					],
					"site_admin_count": len(doc.site_admins or []) if can_manage_host else None,
					"last_admin_sync_at": str(doc.last_admin_sync_at or "") if can_manage_host else "",
				}
			)
	operation_filters = {}
	if not can_manage_host:
		operation_filters = {
			"action": ["in", sorted(SITE_SCOPED_ACTIONS)],
			"target": ["in", allowed_domains],
		}
	operations = frappe.get_all(
		"Docker Control Operation",
		filters=operation_filters,
		fields=[
			"name",
			"action",
			"target",
			"status",
			"actor",
			"commerce_order",
			"impact_sites",
			"backup_sites",
			"migration_sites",
			"arguments",
			"progress",
			"result",
			"creation",
			"started_at",
			"ended_at",
		],
		order_by="creation desc",
		limit=25,
	)
	for operation in operations:
		for field in ("impact_sites", "backup_sites", "migration_sites", "arguments", "result"):
			operation[field] = (
				json.loads(operation[field]) if operation[field] else ([] if field.endswith("sites") else {})
			)
	teams = []
	if can_manage_host:
		teams = frappe.get_all(
			"Team", filters={"enabled": 1}, fields=["name", "team_title"], order_by="team_title asc, name asc"
		)
		assigned_team_titles = {site["team"]: site["team_title"] for site in sites if site["team"]}
		for team in teams:
			team["team_title"] = team.team_title or assigned_team_titles.get(team.name)
	return {
		"can_manage_host": can_manage_host,
		"can_manage_site_teams": can_manage_host,
		"password_reset_email_ready": bool(frappe.db.count("Email Account", {"enable_outgoing": 1}))
		if can_manage_host
		else None,
		"teams": teams,
		"host": {
			"name": host.host_name,
			"status": host.connection_status,
			"protocol_version": host.protocol_version,
			"agent_version": host.agent_version,
			"compose_project": host.compose_project,
			"last_inventory_at": str(host.last_inventory_at or ""),
			"resources": parsed_inventory.get("resources", {}),
			"services": parsed_inventory.get("services", []),
			"impact_sites": list(IMPACT_SITES),
		} if can_manage_host else None,
		"sites": sites,
		"operations": operations,
	}


def _operation_preview(doc) -> dict:
	return {
		"operation": doc.name,
		"action": doc.action,
		"target": doc.target or None,
		"status": doc.status,
		"arguments": json.loads(doc.arguments or "{}"),
		"impact_sites": json.loads(doc.impact_sites or "[]"),
		"backup_sites": json.loads(doc.backup_sites or "[]"),
		"migration_sites": json.loads(doc.migration_sites or "[]"),
		"progress": doc.progress or "",
		"result": json.loads(doc.result or "{}"),
		"confirmation_expires_at": str(doc.confirmation_expires_at or ""),
	}


def _set_operation(doc, **values) -> None:
	for key, value in values.items():
		setattr(doc, key, value)
	doc.save(ignore_permissions=True)
	frappe.db.commit()


def _issue_confirmation(doc) -> str:
	token = secrets.token_urlsafe(32)
	doc.confirmation_token_hash = hashlib.sha256(token.encode()).hexdigest()
	doc.confirmation_expires_at = now_datetime() + timedelta(seconds=CONFIRMATION_SECONDS)
	doc.save(ignore_permissions=True)
	return token


def _parse_arguments(arguments) -> dict:
	if isinstance(arguments, str):
		try:
			arguments = json.loads(arguments)
		except json.JSONDecodeError:
			frappe.throw("پارامترهای عملیات معتبر نیستند.")
	if not isinstance(arguments, dict):
		frappe.throw("پارامترهای عملیات معتبر نیستند.")
	return arguments


@frappe.whitelist()
def get_dashboard_data() -> dict:
	can_manage_host = is_docker_control_admin()
	if not frappe.get_all("Docker Control Host", pluck="name"):
		assert_docker_control_admin()
		return {"initialized": False, "host": None, "sites": [], "operations": []}
	visible_domains = (
		CUSTOMER_SITES
		if can_manage_host
		else [domain for domain in CUSTOMER_SITES if can_manage_docker_control_site(domain)]
	)
	if not visible_domains:
		frappe.throw("هنوز سایتی به تیم شما متصل نشده است.", frappe.PermissionError)
	return {
		"initialized": True,
		**_dashboard_payload(
			visible_domains=visible_domains,
			can_manage_host=can_manage_host,
		),
	}


@frappe.whitelist(methods=["POST"])
def save_site_team(domain: str, team: str | None = None) -> dict:
	assert_docker_control_admin()
	if domain not in CUSTOMER_SITES or not frappe.db.exists("Docker Control Site", domain):
		frappe.throw("سایت انتخاب‌شده در فهرست مدیریت‌شده نیست.")
	team = str(team or "").strip()
	if team and not frappe.db.exists("Team", {"name": team, "enabled": 1}):
		frappe.throw("تیم انتخاب‌شده فعال یا معتبر نیست.")
	site = frappe.get_doc("Docker Control Site", domain)
	site.team = team or None
	site.save(ignore_permissions=True)
	return {"initialized": True, **_dashboard_payload()}


def _get_or_create_site_admin_user(admin: dict[str, str]):
	email = admin["email"]
	user_name = frappe.db.get_value("User", {"email": email}, "name")
	if not user_name and frappe.db.exists("User", email):
		user_name = email
	if user_name:
		user = frappe.get_doc("User", user_name)
		if not user.enabled:
			return None, False
		if "Press Member" not in {role.role for role in user.roles}:
			user.append_roles("Press Member")
			user.save(ignore_permissions=True)
		return user, False

	full_name = admin["full_name"].strip()[:140] or email.split("@", 1)[0]
	user = frappe.new_doc("User")
	user.email = email
	user.first_name = full_name
	user.user_type = "System User"
	user.enabled = 1
	user.send_welcome_email = 0
	user.flags.no_welcome_mail = True
	user.append_roles("Press Member")
	user.insert(ignore_permissions=True)
	return user, True


def _sync_site_admins(domain: str, synced_by: str) -> dict:
	if domain not in CUSTOMER_SITES:
		frappe.throw("سایت برای همگام‌سازی مدیران مجاز نیست.")
	if not frappe.db.exists("Docker Control Site", {"domain": domain, "enabled": 1}):
		frappe.throw("سایت انتخاب‌شده فعال یا ثبت‌شده نیست.")
	frappe.db.sql("SELECT name FROM `tabDocker Control Site` WHERE name=%s FOR UPDATE", domain)
	site = frappe.get_doc("Docker Control Site", domain)

	admins = normalize_site_admins(_client().site_admins(domain), domain)
	current_emails = [row.source_email for row in site.site_admins or []]
	savepoint = f"docker_control_site_admin_sync_{domain.replace('.', '_')}"
	frappe.db.savepoint(savepoint)
	try:
		active_admins = []
		created_accounts = 0
		skipped_disabled_accounts = 0
		for admin in admins:
			user, created = _get_or_create_site_admin_user(admin)
			if user is None:
				skipped_disabled_accounts += 1
				continue
			if created:
				created_accounts += 1
			active_admins.append(
				{"user": user.name, "source_email": admin["email"], "full_name": admin["full_name"]}
			)

		changes = reconcile_site_admins(
			current_emails, [{"email": admin["source_email"]} for admin in active_admins]
		)
		site.set("site_admins", [])
		for admin in active_admins:
			site.append("site_admins", admin)
		site.last_admin_sync_at = now_datetime()
		site.last_admin_sync_by = synced_by
		site.save(ignore_permissions=True)
		frappe.logger("docker_control").info(
			"Synchronized site administrator access for %s: added=%s removed=%s",
			domain,
			len(changes["added"]),
			len(changes["removed"]),
		)
		return {
			"domain": domain,
			"total": len(active_admins),
			"added": len(changes["added"]),
			"removed": len(changes["removed"]),
			"unchanged": len(changes["unchanged"]),
			"created_accounts": created_accounts,
			"skipped_disabled_accounts": skipped_disabled_accounts,
			"last_admin_sync_at": str(site.last_admin_sync_at or ""),
		}
	except Exception:
		frappe.db.rollback(save_point=savepoint)
		raise


@frappe.whitelist(methods=["POST"])
def sync_site_admins(domain: str) -> dict:
	assert_docker_control_admin()
	return _sync_site_admins(domain, frappe.session.user)


def sync_all_site_admins() -> None:
	if not frappe.get_all("Docker Control Host", pluck="name"):
		return
	previous_user = frappe.session.user
	frappe.set_user("Administrator")
	try:
		for domain in CUSTOMER_SITES:
			try:
				_sync_site_admins(domain, "Administrator")
			except Exception:
				frappe.logger("docker_control").error(
					"Daily site administrator sync failed for %s; existing access was retained.", domain
				)
	finally:
		frappe.set_user(previous_user)


@frappe.whitelist(methods=["POST"])
def bootstrap_agent(endpoint: str, hmac_key: str) -> dict:
	assert_docker_control_admin()
	if frappe.get_all("Docker Control Host", pluck="name"):
		frappe.throw("میزبان Docker از قبل ثبت شده است.")
	if endpoint != AGENT_ENDPOINT or not isinstance(hmac_key, str) or len(hmac_key.encode()) < 32:
		frappe.throw("نشانی یا کلید خصوصی عامل نامعتبر است.")
	try:
		client = DockerControlClient(type("BootstrapHost", (), {"endpoint": endpoint})(), hmac_key=hmac_key)
		if client.health().get("protocol_version") != 1:
			frappe.throw("نسخهٔ پروتکل عامل پشتیبانی نمی‌شود.")
		inventory = client.inventory()
		_validate_inventory(inventory)
	except DockerControlError as error:
		frappe.throw(str(error))
	host = frappe.new_doc("Docker Control Host")
	host.host_name = "den-v16-docker"
	host.endpoint = endpoint
	host.hmac_key = hmac_key
	_store_inventory(host, inventory)
	return _dashboard_payload(host)


@frappe.whitelist(methods=["POST"])
def register_current_bench() -> dict:
	assert_docker_control_admin()
	host = _host_doc()
	try:
		inventory = _client(host).inventory()
	except DockerControlError as error:
		host.connection_status = "Disconnected"
		host.save(ignore_permissions=True)
		frappe.throw(str(error))
	_validate_inventory(inventory)
	_store_inventory(host, inventory)
	return _dashboard_payload(host)


@frappe.whitelist(methods=["POST"])
def refresh_inventory() -> dict:
	return register_current_bench()


def _action_data(  # noqa: C901
	action: str, target: str | None, arguments: dict, host
) -> tuple[list[str], list[str], list[str]]:
	if action not in SITE_SCOPED_ACTIONS | {"restart_service", "restart_stack", "deploy_app_revision"}:
		frappe.throw("این عملیات در فهرست مجاز نیست.")
	allowed_argument_keys = {
		"restore_site": {"backup_id"},
		"set_maintenance": {"enabled"},
		"set_scheduler": {"enabled"},
		"deploy_app_revision": {"app", "revision"},
		"restart_stack": {"services"},
	}
	if set(arguments) - allowed_argument_keys.get(action, set()):
		frappe.throw("پارامتر اضافه برای این عملیات مجاز نیست.")
	if action in SITE_SCOPED_ACTIONS and target not in CUSTOMER_SITES:
		frappe.throw("سایت انتخاب‌شده در فهرست مدیریت‌شده نیست.")
	if action in SITE_SCOPED_ACTIONS and not frappe.db.exists(
		"Docker Control Site", {"domain": target, "enabled": 1}
	):
		frappe.throw("سایت انتخاب‌شده فعال یا ثبت‌شده نیست.")
	if action == "restart_service" and target not in ALLOWED_SERVICES:
		frappe.throw("سرویس انتخاب‌شده مجاز نیست.")
	if action == "restart_stack" and target:
		frappe.throw("عملیات بازراه‌اندازی کل بنچ نباید هدف سایت داشته باشد.")
	if action == "deploy_app_revision":
		app = arguments.get("app")
		revision = arguments.get("revision")
		if app not in ALLOWED_APPS or not isinstance(revision, str) or not SHA_RE.fullmatch(revision):
			frappe.throw("برنامه یا نسخهٔ انتخاب‌شده مجاز نیست.")
		try:
			preflight = _client(host).preflight_app_revision(app, revision)
		except DockerControlError as error:
			frappe.throw(str(error))
		if preflight.get("app") != app or preflight.get("revision") != revision:
			frappe.throw("پیش‌بررسی انتشار پاسخ معتبر نداد.")
		migration_sites = preflight.get("migration_sites")
		if not isinstance(migration_sites, list) or any(site not in IMPACT_SITES for site in migration_sites):
			frappe.throw("فهرست مهاجرت سایت‌ها معتبر نیست.")
		if preflight.get("backup_sites") != list(IMPACT_SITES) or preflight.get("restart_services") != [
			"backend",
			"queue-short",
			"queue-long",
			"scheduler",
			"websocket",
		]:
			frappe.throw("فهرست اثر انتشار معتبر نیست.")
		arguments["expected_migration_sites"] = migration_sites
		arguments["restart_services"] = preflight["restart_services"]
		return list(IMPACT_SITES), list(IMPACT_SITES), migration_sites
	if action in {"restart_service", "restart_stack"}:
		if action == "restart_stack":
			arguments["services"] = list(STACK_RESTART_ORDER)
		return list(IMPACT_SITES), list(IMPACT_SITES), []
	impact = [target] if target else []
	backup_sites = [target] if action in {"restore_site", "migrate_site"} else []
	if action == "restore_site" and (
		not isinstance(arguments.get("backup_id"), str)
		or not re.fullmatch(r"[A-Za-z0-9_.-]{1,120}", arguments["backup_id"])
	):
		frappe.throw("شناسهٔ پشتیبان معتبر نیست.")
	if action in {"set_maintenance", "set_scheduler"} and not isinstance(arguments.get("enabled"), bool):
		frappe.throw("وضعیت انتخاب‌شده معتبر نیست.")
	return impact, backup_sites, [target] if action == "migrate_site" else []


def _enqueue_prepare(doc) -> None:
	frappe.enqueue(
		"press.api.docker_control.process_preparation",
		queue="long",
		timeout=OPERATION_TIMEOUT_SECONDS + 60,
		enqueue_after_commit=True,
		operation_name=doc.name,
	)


@frappe.whitelist(methods=["POST"])
def prepare_operation(action: str, target: str | None = None, arguments=None) -> dict:
	assert_docker_control_operation_admin(action, target)
	host = _host_doc()
	arguments = _parse_arguments(arguments)
	impact_sites, backup_sites, migration_sites = _action_data(action, target, arguments, host)
	operation = frappe.new_doc("Docker Control Operation")
	operation.action = action
	operation.target = target
	operation.actor = frappe.session.user
	operation.impact_sites = json.dumps(impact_sites)
	operation.backup_sites = json.dumps(backup_sites)
	operation.migration_sites = json.dumps(migration_sites)
	operation.arguments = json.dumps(arguments, sort_keys=True, ensure_ascii=False)
	operation.status = "Preparing Backup" if backup_sites else "Queued"
	operation.progress = "در انتظار آغاز"
	operation.insert(ignore_permissions=True)
	frappe.db.commit()
	if backup_sites or action in {"backup_site", "read_site_logs"}:
		_enqueue_prepare(operation)
		return _operation_preview(operation)
	operation.status = "Awaiting Confirmation"
	operation.progress = "برای اجرای این تغییر، تأیید نهایی لازم است."
	confirmation_token = _issue_confirmation(operation)
	frappe.db.commit()
	response = _operation_preview(operation)
	response["confirmation_token"] = confirmation_token
	return response


def _set_failure(operation, message: str, result: dict | None = None) -> None:
	result_payload = {"error": message[:500]}
	if isinstance(result, dict):
		result_payload.update(result)
		result_payload["error"] = message[:500]
	_set_operation(
		operation,
		status="Failure",
		progress=message[:500],
		result=json.dumps(result_payload, ensure_ascii=False),
		ended_at=now_datetime(),
		confirmation_token_hash=None,
	)


def _marketplace_install_failure_metadata(error, agent_result) -> tuple[dict | None, str | None]:
	failure_result = getattr(error, "result", None)
	if not isinstance(failure_result, dict):
		failure_result = agent_result if isinstance(agent_result, dict) else None
	backup = failure_result.get("backup") if failure_result else None
	backup_id = backup.get("backup_id") if isinstance(backup, dict) else None
	return failure_result, backup_id[:140] if isinstance(backup_id, str) and backup_id else None


def _resumable_marketplace_install_operation(order, target: str, app: str, client):
	operation_name = getattr(order, "install_operation", None)
	if not operation_name or not frappe.db.exists("Docker Control Operation", operation_name):
		return None

	operation = frappe.get_doc("Docker Control Operation", operation_name)
	try:
		arguments = json.loads(operation.arguments or "{}")
	except (TypeError, ValueError):
		arguments = None
	if (
		operation.action != "install_marketplace_app"
		or operation.target != target
		or operation.commerce_order != order.name
		or arguments != {"app": app}
	):
		raise DockerControlError("عملیات قبلی به سفارش، سایت یا برنامهٔ دیگری متصل است.")

	if operation.agent_operation_id:
		try:
			remote_operation = client.get_operation(operation.agent_operation_id)
		except DockerControlError:
			# Re-submit the same stable ID below. The agent either resumes its
			# existing task or accepts it once if the original request never arrived.
			return operation
		status = remote_operation.get("status")
		if status == "Failure":
			return None
		if status not in {"Accepted", "Running", "Success"}:
			raise DockerControlError("وضعیت عملیات قبلی عامل قابل تأیید نیست؛ نصب دوباره آغاز نشد.")
	return operation


def _run_agent(
	operation,
	action: str,
	target: str | None,
	arguments: dict,
	*,
	operation_id_field: str = "agent_operation_id",
	timeout: int = OPERATION_TIMEOUT_SECONDS,
) -> dict:
	host = _host_doc()
	client = _client(host)
	agent_id = getattr(operation, operation_id_field, None) or str(uuid.uuid4())
	_set_operation(
		operation,
		**{operation_id_field: agent_id},
		status="Running",
		started_at=now_datetime(),
		progress="در حال اجرا",
	)
	client.submit(agent_id, action, target, arguments)
	started = time.monotonic()
	while time.monotonic() - started < timeout:
		result = client.get_operation(agent_id)
		status = result.get("status")
		_set_operation(operation, progress=str(result.get("progress") or "در حال اجرا")[:500])
		if status == "Success":
			return result.get("result") or {}
		if status == "Failure":
			failure_result = result.get("result") or {}
			if not isinstance(failure_result, dict):
				failure_result = {}
			message = str(failure_result.get("error") or "عامل عملیات را ناموفق گزارش کرد.")
			raise DockerAgentOperationFailure(message, failure_result)
		time.sleep(POLL_INTERVAL_SECONDS)
	raise DockerControlError("زمان عملیات به پایان رسید؛ وضعیت را در تاریخچه بررسی کنید.")


def execute_marketplace_app_install(order, app: str) -> dict:
	"""Install one Bench-resident Marketplace app for a Commerce Order, with a verified full backup."""
	target = order.docker_site
	previous_user = frappe.session.user
	frappe.set_user("Administrator")
	try:
		if target not in CUSTOMER_SITES or not frappe.db.exists(
			"Docker Control Site", {"domain": target, "team": order.team, "enabled": 1}
		):
			frappe.throw("سایت سفارش دیگر فعال یا متعلق به تیم سفارش نیست.")
		host = _host_doc()
		client = _client(host)
		if app not in client.available_apps():
			frappe.throw("برنامهٔ سفارش دیگر روی بنچ Docker موجود نیست.")
		operation = _resumable_marketplace_install_operation(order, target, app, client)
		if not operation:
			operation = frappe.get_doc(
				{
					"doctype": "Docker Control Operation",
					"action": "install_marketplace_app",
					"target": target,
					"actor": order.customer,
					"commerce_order": order.name,
					"impact_sites": json.dumps([target]),
					"backup_sites": json.dumps([target]),
					"migration_sites": "[]",
					"arguments": json.dumps({"app": app}, sort_keys=True),
					"status": "Queued",
					"progress": "در صف پشتیبان‌گیری و نصب برنامه",
				}
			).insert(ignore_permissions=True)
			order.db_set("install_operation", operation.name)
			frappe.db.commit()
		agent_result = None
		try:
			result = _run_agent(
				operation,
				"install_marketplace_app",
				target,
				{"app": app},
				timeout=MARKETPLACE_INSTALL_TIMEOUT_SECONDS,
			)
			agent_result = result
			if result.get("site") != target or result.get("app") != app or not result.get("installed"):
				raise DockerControlError("عامل نصب برنامه را تأیید نکرد.")
			operation.reload()
			_set_operation(
				operation,
				status="Success",
				progress="پشتیبان کامل و نصب برنامه تأیید شد.",
				result=json.dumps(result, ensure_ascii=False),
				ended_at=now_datetime(),
			)
			backup = result.get("backup") or {}
			if backup.get("backup_id"):
				order.db_set("install_backup_id", backup["backup_id"])
			inventory = _client(host).inventory()
			_validate_inventory(inventory)
			_store_inventory(host, inventory)
			updated_site = frappe.get_doc("Docker Control Site", target)
			if app not in {row.app for row in updated_site.apps}:
				raise DockerControlError("موجودی بنچ نصب برنامه را تأیید نکرد.")
			return {**result, "operation": operation.name}
		except Exception as error:
			operation.reload()
			failure_result, backup_id = _marketplace_install_failure_metadata(error, agent_result)
			if backup_id:
				order.db_set("install_backup_id", backup_id)
			_set_failure(
				operation,
				str(error)[:500] or "اجرای نصب برنامه ناموفق شد.",
				result=failure_result if isinstance(failure_result, dict) else None,
			)
			raise
	finally:
		frappe.set_user(previous_user)


def process_preparation(operation_name: str) -> None:
	operation = frappe.get_doc("Docker Control Operation", operation_name)
	if operation.status not in {"Preparing Backup", "Queued"}:
		return
	try:
		arguments = json.loads(operation.arguments or "{}")
		if decode_backup_sites(operation.backup_sites):
			backup_action, backup_target, backup_arguments = preparation_backup_request(
				operation.action,
				operation.target,
				customer_sites=CUSTOMER_SITES,
				impact_sites=IMPACT_SITES,
			)
			backup_result = _run_agent(
				operation,
				backup_action,
				backup_target,
				backup_arguments,
				operation_id_field="backup_agent_operation_id",
			)
			operation.reload()
			_set_operation(
				operation,
				status="Awaiting Confirmation",
				progress="پشتیبان‌گیری کامل شد؛ تأیید نهایی لازم است.",
				result=json.dumps(backup_result, ensure_ascii=False),
				confirmation_expires_at=now_datetime() + timedelta(seconds=CONFIRMATION_SECONDS),
			)
			return
		result = _run_agent(operation, operation.action, operation.target, arguments)
		operation.reload()
		_set_operation(
			operation,
			status="Success",
			progress="عملیات با موفقیت انجام شد.",
			result=json.dumps(result, ensure_ascii=False),
			ended_at=now_datetime(),
		)
	except Exception as error:
		operation.reload()
		message = (
			str(error)
			if isinstance(error, DockerControlError)
			else "اجرای عملیات ناموفق شد؛ جزئیات امن عامل را بررسی کنید."
		)
		_set_failure(operation, message)


def process_confirmed_operation(operation_name: str) -> None:
	operation = frappe.get_doc("Docker Control Operation", operation_name)
	if operation.status != "Queued":
		return
	try:
		arguments = json.loads(operation.arguments or "{}")
		result = _run_agent(operation, operation.action, operation.target or None, arguments)
		operation.reload()
		_set_operation(
			operation,
			status="Success",
			progress="عملیات با موفقیت انجام شد.",
			result=json.dumps(result, ensure_ascii=False),
			ended_at=now_datetime(),
		)
	except Exception as error:
		operation.reload()
		message = (
			str(error)
			if isinstance(error, DockerControlError)
			else "اجرای عملیات ناموفق شد؛ جزئیات امن عامل را بررسی کنید."
		)
		_set_failure(operation, message)


@frappe.whitelist()
def get_operation(operation: str, issue_confirmation_token: int = 0) -> dict:
	doc = frappe.get_doc("Docker Control Operation", operation)
	assert_docker_control_operation_admin(doc.action, doc.target)
	response = _operation_preview(doc)
	if cint(issue_confirmation_token) and doc.status == "Awaiting Confirmation":
		# Reopening the exact saved preview issues a fresh short-lived, single-use token.
		# The agent independently rejects stale backups before any shared write.
		response["confirmation_token"] = _issue_confirmation(doc)
		frappe.db.commit()
	return response


@frappe.whitelist(methods=["POST"])
def confirm_operation(operation: str, confirmation_token: str, expected_preview=None) -> dict:
	if not isinstance(confirmation_token, str) or not confirmation_token:
		frappe.throw("توکن تأیید نامعتبر است.")
	frappe.db.sql("SELECT name FROM `tabDocker Control Operation` WHERE name=%s FOR UPDATE", operation)
	doc = frappe.get_doc("Docker Control Operation", operation)
	assert_docker_control_operation_admin(doc.action, doc.target)
	if doc.status != "Awaiting Confirmation" or not doc.confirmation_token_hash:
		frappe.throw("این عملیات در انتظار تأیید نیست.")
	if doc.confirmation_expires_at and get_datetime(doc.confirmation_expires_at) < now_datetime():
		frappe.throw("مهلت تأیید تمام شده است.")
	expected_hash = hashlib.sha256(confirmation_token.encode()).hexdigest()
	if not hmac.compare_digest(expected_hash, doc.confirmation_token_hash):
		frappe.throw("توکن تأیید نامعتبر یا مصرف‌شده است.")
	provided = _parse_arguments(expected_preview)
	actual = {
		"action": doc.action,
		"target": doc.target or None,
		"arguments": json.loads(doc.arguments or "{}"),
		"impact_sites": json.loads(doc.impact_sites or "[]"),
		"backup_sites": json.loads(doc.backup_sites or "[]"),
		"migration_sites": json.loads(doc.migration_sites or "[]"),
	}
	if provided != actual:
		frappe.throw("پیش‌نمایش عملیات تغییر کرده است؛ دوباره آن را بررسی کنید.")
	doc.confirmation_token_hash = None
	doc.confirmation_expires_at = None
	doc.status = "Queued"
	doc.progress = "تأیید شد؛ در صف اجرا"
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	frappe.enqueue(
		"press.api.docker_control.process_confirmed_operation",
		queue="long",
		timeout=OPERATION_TIMEOUT_SECONDS + 60,
		enqueue_after_commit=True,
		operation_name=doc.name,
	)
	return _operation_preview(doc)
