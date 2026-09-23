# Copyright (c) 2026, Frappe and contributors
# For license information, please see license.txt
from __future__ import annotations

import subprocess

import frappe
from frappe.utils import cint, cstr, flt


def _assert_system_manager():
	frappe.only_for("System Manager")


@frappe.whitelist()
def provision_customer_site(
	product_trial: str,
	team: str,
	subdomain: str,
	domain: str | None = None,
	cluster: str | None = None,
	saas_app_plan: str | None = None,
	interval: str = "Monthly",
):
	"""Provision a shared SaaS site for an existing team.

	This API is intended for admin-managed onboarding workflows.
	"""
	_assert_system_manager()

	team_doc = frappe.get_doc("Team", team)
	if team_doc.ssh_access_enabled:
		team_doc.db_set("ssh_access_enabled", 0, update_modified=False)

	trial = frappe.get_doc("Product Trial", product_trial)
	selected_domain = cstr(domain or trial.domain)
	selected_cluster = cstr(cluster or frappe.db.get_value("Root Domain", selected_domain, "default_cluster"))

	if not selected_cluster:
		frappe.throw("No default cluster found for selected domain")

	site, agent_job_name, is_standby = trial.setup_trial_site(
		subdomain=subdomain,
		domain=selected_domain,
		team=team_doc.name,
		cluster=selected_cluster,
	)

	if team_doc.user and not frappe.db.exists("Site User", {"site": site.name, "user": team_doc.user}):
		frappe.get_doc(
			{
				"doctype": "Site User",
				"site": site.name,
				"user": team_doc.user,
				"enabled": 1,
			}
		).insert(ignore_permissions=True)

	subscription_name = None
	if saas_app_plan:
		subscription = create_saas_subscription(
			site=site.name,
			saas_app_plan=saas_app_plan,
			interval=interval,
		)
		subscription_name = subscription.get("name")

	return {
		"site": site.name,
		"host_name": site.host_name,
		"domain": f"{site.subdomain}.{site.domain}",
		"agent_job": agent_job_name,
		"is_standby_site": is_standby,
		"saas_app_subscription": subscription_name,
	}


@frappe.whitelist()
def create_saas_subscription(site: str, saas_app_plan: str, interval: str = "Monthly"):
	"""Create or reuse a SaaS app subscription for a site."""
	_assert_system_manager()
	interval = cstr(interval or "Monthly")
	if interval not in ("Daily", "Monthly", "Annual"):
		frappe.throw("Interval should be one of Daily, Monthly, Annual")

	site_doc = frappe.get_doc("Site", site)
	app = frappe.db.get_value("Saas App Plan", saas_app_plan, "app")
	if not app:
		frappe.throw(f"Invalid Saas App Plan: {saas_app_plan}")

	existing = frappe.db.exists("Saas App Subscription", {"site": site_doc.name, "app": app})
	if existing:
		subscription = frappe.get_doc("Saas App Subscription", existing)
		subscription.interval = interval
		subscription.saas_app_plan = saas_app_plan
		subscription.save(ignore_permissions=True)
		return subscription.as_dict()

	subscription = frappe.get_doc(
		{
			"doctype": "Saas App Subscription",
			"site": site_doc.name,
			"team": site_doc.team,
			"app": app,
			"saas_app_plan": saas_app_plan,
			"interval": interval,
			"status": "Active",
		}
	).insert(ignore_permissions=True)
	return subscription.as_dict()


@frappe.whitelist()
def record_manual_payment(
	saas_app_subscription: str,
	amount: float,
	reference_no: str,
	billing_cycle: str = "Monthly",
	cycles: int = 1,
	paid_at: str | None = None,
	notes: str | None = None,
):
	"""Create and submit a Manual Payment Record for SaaS prepaid billing."""
	_assert_system_manager()

	billing_cycle = cstr(billing_cycle or "Monthly")
	if billing_cycle not in ("Monthly", "Annual"):
		frappe.throw("Billing cycle must be Monthly or Annual")

	doc = frappe.get_doc(
		{
			"doctype": "Manual Payment Record",
			"saas_app_subscription": saas_app_subscription,
			"amount": flt(amount),
			"billing_cycle": billing_cycle,
			"cycles": cint(cycles or 1),
			"paid_at": paid_at or frappe.utils.now(),
			"reference_no": reference_no,
			"notes": notes,
		}
	).insert(ignore_permissions=True)
	doc.submit()
	return {
		"manual_payment_record": doc.name,
		"processed_until": doc.processed_until,
	}


@frappe.whitelist()
def suspend_saas_subscription(name: str):
	"""Suspend a SaaS app subscription and its site."""
	_assert_system_manager()
	subscription = frappe.get_doc("Saas App Subscription", name)
	subscription.suspend()
	return {"name": subscription.name, "status": subscription.status}


@frappe.whitelist()
def activate_saas_subscription(name: str):
	"""Activate a SaaS app subscription and its site."""
	_assert_system_manager()
	subscription = frappe.get_doc("Saas App Subscription", name)
	subscription.activate()
	return {"name": subscription.name, "status": subscription.status}


def enforce_no_ssh_for_saas_teams():
	"""Keep shell access disabled for teams using SaaS subscriptions."""
	teams = frappe.get_all(
		"Saas App Subscription",
		filters={"status": ("in", ["Active", "Suspended", "Inactive"])},
		distinct=True,
		pluck="team",
	)
	for team in teams:
		if team:
			frappe.db.set_value("Team", team, "ssh_access_enabled", 0, update_modified=False)


@frappe.whitelist()
def sync_apps_for_local_mvp(
	apps: str = "erpnext,hrms",
	release_group: str = "bench-0001",
	frappe_version: str | None = None,
	branch: str | None = None,
):
	"""Seed App/App Source/App Release and Release Group App for local MVP setup."""
	_assert_system_manager()

	app_names = [a.strip() for a in (apps or "").split(",") if a.strip()]
	if not app_names:
		frappe.throw("At least one app name is required")

	team = frappe.db.get_value("Release Group", release_group, "team")
	if not team:
		frappe.throw(f"Release Group {release_group} is missing a team")

	versions = frappe.get_all("Frappe Version", {"public": 1}, ["name", "number"], order_by="number asc")
	if not versions:
		frappe.throw("No public Frappe Version records found")

	v16 = next((v for v in versions if int(v.number or 0) == 16), None)
	selected_version = frappe_version or (v16.name if v16 else versions[-1].name)
	selected_branch = branch or ("version-16" if v16 else "version-15")

	display_titles = {
		"frappe": "Frappe Framework",
		"erpnext": "ERPNext",
		"hrms": "HRMS",
	}

	summary = []
	for app_name in app_names:
		title = display_titles.get(app_name, app_name.replace("_", " ").title())
		repo = f"https://github.com/frappe/{app_name}"

		if frappe.db.exists("App", app_name):
			app = frappe.get_doc("App", app_name)
			changed = False
			if app.title != title:
				app.title = title
				changed = True
			if not app.team:
				app.team = team
				changed = True
			if app.enabled != 1:
				app.enabled = 1
				changed = True
			if app.public != 1:
				app.public = 1
				changed = True
			if changed:
				app.save(ignore_permissions=True)
			app_status = "updated" if changed else "exists"
		else:
			app = frappe.get_doc(
				{
					"doctype": "App",
					"name": app_name,
					"title": title,
					"team": team,
					"public": 1,
					"enabled": 1,
				}
			).insert(ignore_permissions=True)
			app_status = "created"

		source = app.add_source(
			repository_url=repo,
			branch=selected_branch,
			frappe_version=selected_version,
			team=team,
			public=True,
		)

		local_hash = None
		try:
			local_hash = subprocess.check_output(
				["git", "-C", frappe.get_app_path(app_name), "rev-parse", "HEAD"], text=True
			).strip()
		except Exception:
			local_hash = None

		release_name = None
		if local_hash:
			release_name = frappe.db.exists(
				"App Release", {"app": app_name, "source": source.name, "hash": local_hash}
			)
			if not release_name:
				release = frappe.get_doc(
					{
						"doctype": "App Release",
						"app": app_name,
						"source": source.name,
						"hash": local_hash,
						"team": team,
						"message": "Local seed release",
						"author": "Local Setup",
						"timestamp": frappe.utils.now(),
						"status": "Approved",
						"public": 1,
					}
				).insert(ignore_permissions=True)
				release_name = release.name

		existing_rg_app = frappe.db.exists(
			"Release Group App",
			{"parent": release_group, "parenttype": "Release Group", "app": app_name},
		)
		if not existing_rg_app:
			next_idx = (
				frappe.db.sql(
					"select coalesce(max(idx), 0) + 1 from `tabRelease Group App` where parent=%s",
					(release_group,),
				)[0][0]
				or 1
			)
			frappe.get_doc(
				{
					"doctype": "Release Group App",
					"parent": release_group,
					"parenttype": "Release Group",
					"parentfield": "apps",
					"idx": next_idx,
					"app": app_name,
					"source": source.name,
					"title": title,
				}
			).insert(ignore_permissions=True)
			rg_status = "added"
		else:
			rg_status = "exists"

		summary.append(
			{
				"app": app_name,
				"app_status": app_status,
				"source": source.name,
				"release": release_name,
				"release_group": rg_status,
			}
		)

	frappe.db.commit()
	return {
		"team": team,
		"frappe_version": selected_version,
		"branch": selected_branch,
		"summary": summary,
	}


@frappe.whitelist()
def bootstrap_single_server_infra(
	server: str,
	root_domain: str,
	cluster: str = "Default",
	release_group: str = "bench-0001",
	proxy_hostname: str = "proxy1",
	database_hostname: str = "db1",
	ssh_user: str = "sepehr",
	ssh_port: int = 22,
):
	"""Create missing proxy/database docs and wire them to an existing app server."""
	_assert_system_manager()

	if not frappe.db.exists("Server", server):
		frappe.throw(f"Server {server} was not found")

	server_doc = frappe.get_doc("Server", server)
	team = server_doc.team or frappe.db.get_value("Release Group", release_group, "team")
	if not team:
		frappe.throw("Could not determine team for infrastructure records")

	if not server_doc.ip:
		frappe.throw("Server IP is required on app server record")

	proxy_name = f"{proxy_hostname}.{root_domain}"
	db_name = f"{database_hostname}.{root_domain}"

	if frappe.db.exists("Proxy Server", proxy_name):
		proxy_doc = frappe.get_doc("Proxy Server", proxy_name)
		proxy_status = "exists"
	else:
		proxy_doc = frappe.get_doc(
			{
				"doctype": "Proxy Server",
				"hostname": proxy_hostname,
				"domain": root_domain,
				"self_hosted_server_domain": root_domain,
				"cluster": cluster,
				"provider": "Generic",
				"team": team,
				"public": 0,
				"is_self_hosted": 1,
				"status": "Pending",
				"ip": server_doc.ip,
				"ssh_user": ssh_user,
				"ssh_port": ssh_port,
				"is_primary": 1,
			}
		).insert(ignore_permissions=True)
		proxy_status = "created"

	if frappe.db.exists("Database Server", db_name):
		db_doc = frappe.get_doc("Database Server", db_name)
		db_status = "exists"
	else:
		db_doc = frappe.get_doc(
			{
				"doctype": "Database Server",
				"title": f"{server_doc.title or server_doc.hostname} - DB",
				"hostname": database_hostname,
				"domain": root_domain,
				"self_hosted_server_domain": root_domain,
				"cluster": cluster,
				"provider": "Generic",
				"team": team,
				"public": 0,
				"is_self_hosted": 1,
				"status": "Pending",
				"ip": server_doc.ip,
				"ssh_user": ssh_user,
				"ssh_port": ssh_port,
				"db_port": 3306,
			}
		).insert(ignore_permissions=True)
		db_status = "created"

	server_doc.cluster = cluster
	server_doc.provider = "Generic"
	server_doc.team = team
	server_doc.is_self_hosted = 1
	server_doc.self_hosted_server_domain = root_domain
	server_doc.ssh_user = ssh_user
	server_doc.ssh_port = ssh_port
	server_doc.proxy_server = proxy_doc.name
	server_doc.database_server = db_doc.name
	server_doc.use_for_new_benches = 1
	server_doc.use_for_new_sites = 1
	server_doc.save(ignore_permissions=True)

	if frappe.db.exists("Root Domain", root_domain):
		frappe.db.set_value("Root Domain", root_domain, "default_proxy_server", proxy_doc.name)

	linked_to_release_group = bool(
		frappe.db.exists(
			"Release Group Server",
			{
				"parent": release_group,
				"parenttype": "Release Group",
				"parentfield": "servers",
				"server": server_doc.name,
			},
		)
	)
	if not linked_to_release_group:
		next_idx = (
			frappe.db.sql(
				"select coalesce(max(idx), 0) + 1 from `tabRelease Group Server` where parent=%s",
				(release_group,),
			)[0][0]
			or 1
		)
		frappe.get_doc(
			{
				"doctype": "Release Group Server",
				"parent": release_group,
				"parenttype": "Release Group",
				"parentfield": "servers",
				"idx": next_idx,
				"server": server_doc.name,
			}
		).insert(ignore_permissions=True)

	frappe.db.commit()
	return {
		"server": server_doc.name,
		"proxy_server": {"name": proxy_doc.name, "status": proxy_status},
		"database_server": {"name": db_doc.name, "status": db_status},
		"release_group": release_group,
		"release_group_linked": True,
		"default_proxy_server": proxy_doc.name,
	}
