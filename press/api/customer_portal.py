import json
from math import isfinite

import frappe
from frappe.utils import cint, flt

from press.api.asumi_billing import can_manage_billing, require_billing_access
from press.api.asumi_permissions import can_manage_apps
from press.api.site import protected
from press.marketplace.doctype.marketplace_app_plan.marketplace_app_plan import MarketplaceAppPlan
from press.press.doctype.marketplace_app.marketplace_app import get_plans_for_app
from press.press.doctype.team.team_members import get_invitations, get_roles
from press.utils import get_current_team


DEFAULT_INCLUDED_MODULES = {
	"finance",
	"sales",
	"crm",
	"procurement",
	"inventory",
	"projects",
	"quality",
	"people",
	"assets",
}
SUPPORT_STATUSES = {"Open", "In Progress", "Waiting on Customer", "Resolved", "Closed"}
SUPPORT_CATEGORIES = {"Technical", "Billing", "Purchase", "Other"}


def _is_catalog_admin():
	return bool({"System Manager", "Press Marketplace Manager"}.intersection(frappe.get_roles()))


def _is_support_agent():
	return bool({"System Manager", "Press Support Agent"}.intersection(frappe.get_roles()))


def _require_catalog_admin():
	if not _is_catalog_admin():
		frappe.throw("Not permitted to manage the Asumi catalog.", frappe.PermissionError)


def _require_support_agent():
	if not _is_support_agent():
		frappe.throw("Not permitted to manage support requests.", frappe.PermissionError)


def _catalog_mappings(include_unpublished=False):
	from press.press.doctype.asumi_module_mapping.asumi_module_mapping import (
		ASUMI_MODULE_IDS,
		DEFAULT_MODULE_PREREQUISITES,
	)

	stored = {
		mapping.module_id: mapping
		for mapping in frappe.get_all(
			"Asumi Module Mapping",
			fields=[
				"module_id",
				"mode",
				"marketplace_app",
				"published",
				"description",
				"customer_description",
				"prerequisites",
			],
		)
	}
	mappings = []
	for module_id in sorted(ASUMI_MODULE_IDS):
		mapping = stored.get(module_id)
		if mapping:
			mapping.published = cint(mapping.published)
			if not mapping.published and not include_unpublished:
				continue
			mapping.prerequisites = _parse_module_prerequisites(mapping.prerequisites)
			if mapping.prerequisites is None:
				mapping.prerequisites = DEFAULT_MODULE_PREREQUISITES.get(module_id, [])
		else:
			mapping = frappe._dict(
				module_id=module_id,
				mode="Included" if module_id in DEFAULT_INCLUDED_MODULES else "Purchase request",
				marketplace_app=None,
				published=1,
				description=None,
				customer_description=None,
				prerequisites=DEFAULT_MODULE_PREREQUISITES.get(module_id, []),
			)
		mappings.append(mapping)
	return mappings


def _parse_module_prerequisites(value):
	if value is None or value == "":
		return None
	try:
		module_ids = json.loads(value) if isinstance(value, str) else value
	except (TypeError, ValueError):
		frappe.throw("Module prerequisites must be a JSON list of Asumi module IDs.")

	from press.press.doctype.asumi_module_mapping.asumi_module_mapping import ASUMI_MODULE_IDS

	if not isinstance(module_ids, list) or any(
		not isinstance(module_id, str) for module_id in module_ids
	):
		frappe.throw("Module prerequisites must be a JSON list of Asumi module IDs.")
	if len(module_ids) != len(set(module_ids)):
		frappe.throw("Choose each prerequisite module only once.")
	if not set(module_ids).issubset(ASUMI_MODULE_IDS):
		frappe.throw("Choose valid Asumi prerequisite modules.")
	return module_ids


def _validate_catalog_prerequisites(module_id, prerequisites, published):
	mappings = {mapping.module_id: mapping for mapping in _catalog_mappings(include_unpublished=True)}
	mappings[module_id].prerequisites = prerequisites
	mappings[module_id].published = cint(published)
	if module_id in prerequisites:
		frappe.throw("A module cannot depend on itself.")

	for mapping in mappings.values():
		if mapping.published and any(
			not cint(mappings[dependency].published) for dependency in mapping.prerequisites
		):
			frappe.throw("A published module cannot require a module hidden from the customer catalog.")

	visiting = set()
	visited = set()

	def visit(current):
		if current in visiting:
			frappe.throw("Module prerequisites cannot contain a dependency cycle.")
		if current in visited:
			return
		visiting.add(current)
		for dependency in mappings[current].prerequisites:
			visit(dependency)
		visiting.remove(current)
		visited.add(current)

	for current in mappings:
		visit(current)


@frappe.whitelist(methods=["GET"])
def dashboard():
	"""Return the current team's sites and native Marketplace subscriptions."""
	team = get_current_team(get_doc=True)
	asumi_app_ids = _asumi_marketplace_app_ids()
	sites = frappe.get_all(
		"Site",
		filters={"team": team.name},
		fields=["name", "host_name", "status", "plan"],
		order_by="creation desc",
	)
	sites_by_name = {site.name: site for site in sites}
	site_plan_names = list({site.plan for site in sites if site.plan})
	site_plans = (
		{
			plan.name: plan
			for plan in frappe.get_all(
				"Site Plan",
				filters={"name": ("in", site_plan_names)},
				fields=["name", "plan_title", "price_inr", "price_usd", "interval"],
			)
		}
		if site_plan_names
		else {}
	)

	subscriptions = frappe.get_all(
		"Subscription",
		filters={"team": team.name, "document_type": "Marketplace App"},
		fields=["name", "document_name", "site", "enabled", "interval", "plan", "creation"],
		order_by="modified desc",
	)
	subscriptions = [subscription for subscription in subscriptions if subscription.document_name in asumi_app_ids]
	pending_marketplace_invoices = _pending_marketplace_invoice_lines(team.name, sites_by_name)
	app_names = list({subscription.document_name for subscription in subscriptions})
	apps = {}
	plans_by_app = {}
	if app_names:
		marketplace_apps = frappe.get_all(
			"Marketplace App",
			or_filters=[{"name": ("in", app_names)}, {"app": ("in", app_names)}],
			fields=["name", "app", "title", "image"],
		)
		apps = {key: app for app in marketplace_apps for key in (app.name, app.app)}
		plans_by_app = {
			app.name: get_plans_for_app(app.name, include_disabled=True) for app in marketplace_apps
		}

	serialized_subscriptions = []
	latest_app_activity = {}
	if sites_by_name:
		activities = frappe.get_all(
			"Site Activity",
			filters={"site": ("in", list(sites_by_name)), "action": ("in", ["Install App", "Uninstall App"])},
			fields=["site", "reason", "job", "action", "creation"],
			order_by="creation desc",
			limit=1000,
		)
		job_names = list({activity.job for activity in activities if activity.job})
		jobs = (
			{
				job.name: job.status
				for job in frappe.get_all(
					"Agent Job",
					filters={"name": ("in", job_names)},
					fields=["name", "status"],
				)
			}
			if job_names
			else {}
		)
		for activity in activities:
			key = (activity.site, activity.reason)
			if key not in latest_app_activity:
				latest_app_activity[key] = {
					"action": activity.action,
					"status": jobs.get(activity.job, "Unknown"),
				}

	for subscription in subscriptions:
		app = apps.get(subscription.document_name)
		site = sites_by_name.get(subscription.site)
		install_app = app.app if app else subscription.document_name
		app_activity = latest_app_activity.get((subscription.site, install_app)) or latest_app_activity.get(
			(subscription.site, subscription.document_name)
		)
		status = "Active" if subscription.enabled else "Inactive"
		if app_activity and app_activity["action"] == "Uninstall App" and app_activity["status"] in {"Pending", "Running"}:
			status = "Cancellation Pending"
		elif subscription.enabled and app_activity and app_activity["status"] in {"Pending", "Running"}:
			status = "Provisioning"
		elif app_activity and app_activity["status"] in {"Failure", "Delivery Failure"}:
			status = "Needs Attention"
		app_plan_key = app.name if app else subscription.document_name
		invoice_name = next(
			(
				pending_marketplace_invoices[(subscription.site, document_name)]
				for document_name in {subscription.document_name, app.name if app else None, app.app if app else None}
				if document_name and (subscription.site, document_name) in pending_marketplace_invoices
			),
			None,
		)
		selected_plan = next(
			(
				serialize_plan(plan)
				for plan in plans_by_app.get(app_plan_key, [])
				if plan["name"] == subscription.plan
			),
			None,
		)
		plan_interval = (
			MarketplaceAppPlan.get_subscription_interval(selected_plan.get("interval"))
			if selected_plan
			else subscription.interval
		)
		billing_interval = subscription.interval or plan_interval
		cycle_start = subscription.creation
		cycle_end = None
		if billing_interval == "Annually":
			last_annual_usage = frappe.db.get_value(
				"Usage Record",
				{"subscription": subscription.name, "interval": "Annually", "docstatus": 1},
				"date",
				order_by="date desc",
			)
			if last_annual_usage:
				cycle_start = last_annual_usage
			cycle_end = frappe.utils.add_to_date(cycle_start, years=1, as_string=True)
		elif billing_interval == "Monthly":
			cycle_end = frappe.utils.get_last_day(frappe.utils.today())
		serialized_subscriptions.append(
			{
				"name": subscription.name,
				"app": app.app if app else subscription.document_name,
				"app_title": app.title if app else subscription.document_name,
				"app_image": app.image if app else None,
				"site": subscription.site,
				"site_label": (site.host_name or site.name) if site else subscription.site,
				"site_status": site.status if site else None,
				"status": status,
				"payment_status": "Unpaid" if invoice_name else None,
				"pending_invoice": invoice_name,
				"interval": billing_interval,
				"plan_interval": plan_interval,
				"billing_period_mismatch": bool(billing_interval and plan_interval and billing_interval != plan_interval),
				"start_date": str(cycle_start)[:10] if cycle_start else None,
				"end_date": str(cycle_end)[:10] if cycle_end else None,
				"selected_plan": selected_plan,
			}
		)

	return {
		"team": {
			"name": team.name,
			"title": team.team_title or team.name,
			"currency": team.currency,
		},
		"teams": _customer_team_options(team),
		"sites": [serialize_site(site, site_plans.get(site.plan), team.currency) for site in sites],
		"included_module_ids": [mapping.module_id for mapping in _catalog_mappings() if mapping.mode == "Included"],
		"subscriptions": serialized_subscriptions,
		"can_manage_billing": can_manage_billing(team),
		"can_manage_apps": can_manage_apps(team),
		"can_manage_catalog": _is_catalog_admin(),
		"can_manage_support": _is_support_agent(),
	}


def _customer_team_options(current_team):
	from press.utils import get_valid_teams_for_user

	team_names = {item.name for item in get_valid_teams_for_user(frappe.session.user)}
	owned_team = frappe.db.get_value(
		"Team", {"user": frappe.session.user, "enabled": 1, "parent_team": ("is", "not set")}, "name"
	)
	if owned_team:
		team_names.add(owned_team)
	team_names.add(current_team.name)

	return [
		{"name": team.name, "title": team.team_title or team.user}
		for team in frappe.get_all(
			"Team",
			filters={"name": ("in", list(team_names)), "enabled": 1},
			fields=["name", "team_title", "user"],
			order_by="team_title asc, name asc",
		)
	]


def _asumi_marketplace_app_ids():
	mapped_names = {
		mapping.marketplace_app
		for mapping in _catalog_mappings(include_unpublished=True)
		if mapping.marketplace_app
	}
	if not mapped_names:
		return set()
	apps = frappe.get_all(
		"Marketplace App",
		filters={"name": ("in", list(mapped_names))},
		fields=["name", "app"],
	)
	return {identifier for app in apps for identifier in (app.name, app.app) if identifier}


def _pending_marketplace_invoice_lines(team: str, sites_by_name: dict) -> dict:
	if not sites_by_name:
		return {}
	invoices = frappe.get_all(
		"Invoice",
		filters={"team": team, "status": "Unpaid", "docstatus": 1, "amount_due": (">", 0)},
		fields=["name", "creation"],
		order_by="creation desc",
	)
	if not invoices:
		return {}
	invoice_rank = {invoice.name: index for index, invoice in enumerate(invoices)}
	items = frappe.get_all(
		"Invoice Item",
		filters={
			"parent": ("in", [invoice.name for invoice in invoices]),
			"parenttype": "Invoice",
			"document_type": "Marketplace App",
			"site": ("in", list(sites_by_name)),
		},
		fields=["parent", "document_name", "site"],
	)
	items.sort(key=lambda item: invoice_rank.get(item.parent, len(invoice_rank)))
	pending = {}
	for item in items:
		if item.site and item.document_name:
			pending.setdefault((item.site, item.document_name), item.parent)
	return pending


def serialize_site(site, plan=None, currency=None):
	plan_price = None
	if plan:
		plan_price = plan.price_inr if currency == "INR" else plan.price_usd if currency == "USD" else None
	return {
		"name": site.name,
		"label": site.host_name or site.name,
		"status": site.status,
		"plan_title": plan.plan_title if plan else None,
		"plan_price": plan_price,
		"plan_interval": plan.interval if plan else None,
	}


def serialize_plan(plan):
	return {
		"name": plan["name"],
		"title": plan["title"],
		"price_inr": plan["price_inr"],
		"price_usd": plan["price_usd"],
		"interval": plan.get("interval"),
		"enabled": plan["enabled"],
		"features": plan["features"],
	}


def _validate_marketplace_plan_currency(team, app_slug: str, plan_name: str):
	app = frappe.db.get_value(
		"Marketplace App", {"app": app_slug}, ["name", "team"], as_dict=True
	)
	if not app or app.team == team.name:
		return

	plan = frappe.db.get_value(
		"Marketplace App Plan",
		{"name": plan_name, "app": app.name, "enabled": 1},
		["price_inr", "price_usd"],
		as_dict=True,
	)
	if not plan:
		return

	if team.currency == "INR":
		price = plan.price_inr
	elif team.currency == "USD":
		price = plan.price_usd
	elif plan.price_inr == 0 and plan.price_usd == 0:
		price = 0
	else:
		price = None

	if price is None:
		frappe.throw(
			"This paid plan is not available in the team's billing currency. Contact Asumi support for a quote."
		)


@frappe.whitelist(methods=["GET"])
def catalog():
	"""Return the published Marketplace apps and Asumi-to-Press mappings."""
	from press.api.marketplace import get_marketplace_pricing_catalog

	apps = get_marketplace_pricing_catalog()
	all_mappings = _catalog_mappings(include_unpublished=True)
	mappings = [mapping for mapping in all_mappings if mapping.published]
	hidden_module_ids = [mapping.module_id for mapping in all_mappings if not mapping.published]
	visible_marketplace_names = {
		mapping.marketplace_app
		for mapping in mappings
		if mapping.mode == "Marketplace app" and mapping.marketplace_app
	}
	apps = [app for app in apps if app.name in visible_marketplace_names]
	app_by_name = {app.name: app for app in apps}
	public_mappings = []
	for mapping in mappings:
		app = app_by_name.get(mapping.marketplace_app) if mapping.mode == "Marketplace app" else None
		public_mappings.append(
			{
				"module_id": mapping.module_id,
				"mode": mapping.mode,
				"customer_description": mapping.customer_description,
				"marketplace_app_slug": app.app if app else None,
				"marketplace_app_title": app.title if app else None,
				"published": cint(mapping.published),
				"prerequisites": mapping.prerequisites,
			}
		)
	return {"apps": apps, "mappings": public_mappings, "hidden_module_ids": hidden_module_ids}


@frappe.whitelist(methods=["GET"])
def catalog_admin():
	_require_catalog_admin()
	from press.api.marketplace import get_marketplace_pricing_catalog

	mappings = _catalog_mappings(include_unpublished=True)
	return {"apps": get_marketplace_pricing_catalog(), "mappings": mappings}


@frappe.whitelist(methods=["GET"])
def site_app_state(name: str):
	team = get_current_team()
	if not frappe.db.exists("Site", {"name": name, "team": team}):
		frappe.throw("The selected site does not belong to this team.", frappe.PermissionError)

	app_ids = _asumi_marketplace_app_ids()
	if not app_ids:
		return {"installed": [], "available": []}
	installed = frappe.call("press.api.site.installed_apps", name=name)
	available = frappe.call("press.api.site.available_apps", name=name)
	return {
		"installed": [app for app in installed if app.app in app_ids],
		"available": [app for app in available if app.app in app_ids],
	}


@frappe.whitelist(methods=["POST"])
def install_marketplace_app(name: str, app: str, plan: str | None = None):
	"""Install one native Marketplace app after enforcing the team's billing role."""
	team = get_current_team(get_doc=True)
	require_billing_access(team)
	site = frappe.get_doc("Site", name)
	if site.team != team.name:
		frappe.throw("The selected site does not belong to this team.", frappe.PermissionError)
	if plan:
		_validate_marketplace_plan_currency(team, app, plan)
	return site.install_app(app, plan)


@frappe.whitelist(methods=["POST"])
def change_marketplace_plan(subscription: str, new_plan: str):
	team = get_current_team(get_doc=True)
	require_billing_access(team)
	doc = frappe.get_doc("Subscription", subscription)
	if doc.team != team.name or doc.document_type != "Marketplace App":
		frappe.throw("This subscription does not belong to the current team.", frappe.PermissionError)
	app_slug = frappe.db.get_value("Marketplace App", doc.document_name, "app") or doc.document_name
	_validate_marketplace_plan_currency(team, app_slug, new_plan)
	return frappe.call(
		"press.api.marketplace.change_app_plan", subscription=subscription, new_plan=new_plan
	)


@frappe.whitelist(methods=["POST"])
def uninstall_marketplace_app(name: str, app: str):
	"""Cancel a Marketplace subscription by using Press's native uninstall lifecycle."""
	team = get_current_team(get_doc=True)
	require_billing_access(team)
	site = frappe.get_doc("Site", name)
	if site.team != team.name:
		frappe.throw("The selected site does not belong to this team.", frappe.PermissionError)
	if app not in {row.app for row in site.apps}:
		frappe.throw("This module is not installed on the selected site.")

	marketplace_app = frappe.db.get_value("Marketplace App", {"app": app}, "name")
	if not marketplace_app:
		frappe.throw("Only Marketplace subscriptions can be cancelled here.")
	subscriptions = frappe.get_all(
		"Subscription",
		filters={"team": team.name, "site": site.name, "document_type": "Marketplace App"},
		fields=["document_name", "enabled"],
	)
	if not any(row.document_name in {app, marketplace_app} and row.enabled for row in subscriptions):
		latest_uninstall = frappe.get_all(
			"Site Activity",
			filters={"site": site.name, "action": "Uninstall App", "reason": app},
			fields=["job"],
			order_by="creation desc",
			limit=1,
		)
		if not latest_uninstall or not latest_uninstall[0].job:
			frappe.throw("No active Marketplace subscription was found for this module.")
		job_status = frappe.db.get_value("Agent Job", latest_uninstall[0].job, "status")
		if job_status not in {"Failure", "Delivery Failure"}:
			frappe.throw("This module has no active subscription to cancel.")
	return site.uninstall_app(app)


@frappe.whitelist(methods=["GET"])
def credit_topup_constraints():
	"""Return the minimum credit payment permitted by native Press billing."""
	team = get_current_team(get_doc=True)
	require_billing_access(team)
	from press.api.billing import total_unpaid_amount

	return {
		"currency": team.currency,
		"minimum_amount": 0 if team.erpnext_partner else total_unpaid_amount(),
		"allow_below_minimum": bool(team.erpnext_partner),
	}


@frappe.whitelist(methods=["POST"])
def save_catalog_mapping(
	module_id: str,
	mode: str,
	marketplace_app: str | None = None,
	published: int = 1,
	description: str | None = None,
	customer_description: str | None = None,
	prerequisites: str | None = None,
):
	_require_catalog_admin()
	from press.press.doctype.asumi_module_mapping.asumi_module_mapping import ASUMI_MODULE_IDS

	if module_id not in ASUMI_MODULE_IDS:
		frappe.throw("Choose a valid Asumi module.")
	if mode not in {"Included", "Marketplace app", "Purchase request"}:
		frappe.throw("Choose a valid catalog type.")
	if mode == "Marketplace app" and not marketplace_app:
		frappe.throw("Choose a Marketplace app for this module.")
	if mode == "Marketplace app" and marketplace_app and not frappe.db.exists("Marketplace App", marketplace_app):
		frappe.throw("The selected Marketplace app does not exist.")
	customer_description = (customer_description if customer_description is not None else description) or ""
	customer_description = customer_description.strip()
	if len(customer_description) > 2000:
		frappe.throw("Compatibility notes cannot exceed 2000 characters.")
	prerequisites = _parse_module_prerequisites(prerequisites)
	if prerequisites is None:
		prerequisites = []
	_validate_catalog_prerequisites(module_id, prerequisites, published)

	name = frappe.db.get_value("Asumi Module Mapping", {"module_id": module_id}, "name")
	doc = frappe.get_doc("Asumi Module Mapping", name) if name else frappe.new_doc("Asumi Module Mapping")
	doc.module_id = module_id
	doc.mode = mode
	if mode == "Marketplace app":
		doc.marketplace_app = marketplace_app
	doc.published = cint(published)
	doc.customer_description = customer_description
	doc.prerequisites = json.dumps(prerequisites)
	doc.save(ignore_permissions=True)
	return {
		"module_id": doc.module_id,
		"mode": doc.mode,
		"marketplace_app": doc.marketplace_app,
		"published": doc.published,
		"customer_description": doc.customer_description,
		"prerequisites": prerequisites,
	}


@frappe.whitelist(methods=["POST"])
def update_marketplace_plan_prices(plan: str, price_inr: str, price_usd: str):
	_require_catalog_admin()
	plan_doc = frappe.get_doc("Marketplace App Plan", plan)
	try:
		price_inr = float(price_inr)
		price_usd = float(price_usd)
	except (TypeError, ValueError):
		frappe.throw("Enter a valid number for each price.")
	if not isfinite(price_inr) or not isfinite(price_usd) or price_inr < 0 or price_usd < 0:
		frappe.throw("Prices cannot be negative.")
	plan_doc.price_inr = flt(price_inr)
	plan_doc.price_usd = flt(price_usd)
	plan_doc.save(ignore_permissions=True)
	return {"name": plan_doc.name, "price_inr": plan_doc.price_inr, "price_usd": plan_doc.price_usd}


@frappe.whitelist(methods=["GET"])
def team_access():
	team = get_current_team(get_doc=True)
	roles = get_roles(team.name)
	role_permissions = {
		role["name"]: {
			"allow_apps": bool(role.get("allow_apps")),
			"allow_billing": bool(role.get("allow_billing")),
		}
		for role in roles
	}
	members = team.members()
	for member in members:
		for member_role in member.get("roles", []):
			member_role.update(role_permissions.get(member_role["name"], {}))

	return {
		"team": {"name": team.name, "title": team.team_title or team.name},
		"members": members,
		"invitations": get_invitations(team.name),
		"roles": [
			{
				"name": role["name"],
				"title": role["label"],
				"admin_access": role["admin_access"],
				"allow_apps": bool(role.get("allow_apps")),
				"allow_billing": bool(role.get("allow_billing")),
			}
			for role in roles
		],
		"can_manage_members": team.user == frappe.session.user or team.is_admin_user(),
	}


@frappe.whitelist(methods=["POST"])
def invite_team_member(email: str, role: str | None = None):
	team = get_current_team(get_doc=True)
	team.invite_team_member(email, role)
	return {"email": email, "status": "Pending"}


@frappe.whitelist(methods=["POST"])
def cancel_team_invitation(email: str):
	team = get_current_team(get_doc=True)
	team.cancel_invitation(email)
	return {"email": email, "status": "Cancelled"}


@frappe.whitelist(methods=["POST"])
def remove_team_member(email: str):
	team = get_current_team(get_doc=True)
	team.remove_team_member(email)
	return {"email": email, "status": "Removed"}


@frappe.whitelist(methods=["POST"])
def update_team_member_roles(email: str, roles: list[str] | None = None):
	team = get_current_team(get_doc=True)
	_require_team_member_manager(team)
	user = _get_team_member_user(team, email)
	roles = _validate_team_roles(team, roles)
	_sync_team_member_roles(team, user, roles)

	return {"email": email, "roles": roles, "status": "Updated"}


def _require_team_member_manager(team):
	if team.user != frappe.session.user and not team.is_admin_user():
		frappe.throw("Only a team owner or admin can update member access.", frappe.PermissionError)


def _get_team_member_user(team, email):
	user = frappe.db.get_value("User", {"email": email}, "name")
	if user and frappe.db.exists("Team Member", {"parent": team.name, "user": user}):
		return user
	frappe.throw("This user is not a member of the selected team.", frappe.PermissionError)


def _validate_team_roles(team, roles):
	if roles is None:
		return []
	if not isinstance(roles, list) or not all(isinstance(role, str) for role in roles):
		frappe.throw("Choose valid roles for this team.")
	roles = list(dict.fromkeys(roles))
	valid_roles = {role["name"] for role in get_roles(team.name)}
	if not set(roles).issubset(valid_roles):
		frappe.throw("Choose roles that belong to this team.", frappe.PermissionError)
	return roles


def _sync_team_member_roles(team, user, roles):
	role_data = {role["name"]: role for role in get_roles(team.name)}
	PressRole = frappe.qb.DocType("Press Role")
	PressRoleUser = frappe.qb.DocType("Press Role User")
	assigned = frappe.qb.from_(PressRoleUser).join(PressRole).on(PressRoleUser.parent == PressRole.name).where(
		(PressRole.team == team.name) & (PressRoleUser.user == user)
	).select(PressRole.name).run(as_dict=True, pluck="name")
	if user == team.user or any(role_data[name].get("admin_access") for name in assigned):
		frappe.throw("A team owner or admin role cannot be changed here.", frappe.PermissionError)
	for role_name in assigned:
		if role_name not in roles:
			frappe.get_doc("Press Role", role_name).remove_user(user)
	for role_name in roles:
		if role_name not in assigned:
			frappe.get_doc("Press Role", role_name).add_user(user)


@frappe.whitelist(methods=["GET"])
def support_requests():
	team = get_current_team()
	return frappe.get_all(
		"Asumi Support Request",
		filters={"team": team},
		fields=["name", "subject", "category", "status", "site", "creation", "modified"],
		order_by="modified desc",
		limit=100,
	)


@frappe.whitelist(methods=["GET"])
def support_request_detail(name: str):
	team = get_current_team()
	doc = frappe.get_doc("Asumi Support Request", name)
	if doc.team != team:
		frappe.throw("Not permitted to view this request.", frappe.PermissionError)
	return serialize_support_request(doc, include_messages=True)


@frappe.whitelist(methods=["POST"])
def create_support_request(subject: str, message: str, category: str = "Technical", site: str | None = None):
	team = get_current_team(get_doc=True)
	subject = (subject or "").strip()
	message = (message or "").strip()
	if not subject or len(subject) > 140:
		frappe.throw("Enter a subject of 1 to 140 characters.")
	if not message or len(message) > 10000:
		frappe.throw("Enter a message of 1 to 10000 characters.")
	if category not in SUPPORT_CATEGORIES:
		frappe.throw("Choose a valid request category.")
	if site and not frappe.db.exists("Site", {"name": site, "team": team.name}):
		frappe.throw("The selected site does not belong to this team.", frappe.PermissionError)

	doc = frappe.get_doc(
		{
			"doctype": "Asumi Support Request",
			"team": team.name,
			"site": site,
			"category": category,
			"subject": subject,
			"message": message,
			"requested_by": frappe.session.user,
			"status": "Open",
		}
	).insert(ignore_permissions=True)
	return serialize_support_request(doc)


@frappe.whitelist(methods=["POST"])
def reply_support_request(name: str, message: str):
	team = get_current_team()
	doc = frappe.get_doc("Asumi Support Request", name)
	if doc.team != team:
		frappe.throw("Not permitted to update this request.", frappe.PermissionError)
	message = (message or "").strip()
	if not message or len(message) > 10000:
		frappe.throw("Enter a message of 1 to 10000 characters.")
	if doc.status in {"Resolved", "Closed"}:
		frappe.throw("This request is closed. Create a new request if you need more help.")
	doc.add_comment("Comment", message)
	if doc.status == "Waiting on Customer":
		doc.status = "Open"
		doc.save(ignore_permissions=True)
	return serialize_support_request(doc, include_messages=True)


@frappe.whitelist(methods=["GET"])
def admin_support_requests():
	_require_support_agent()
	requests = frappe.get_all(
		"Asumi Support Request",
		fields=["name", "team", "site", "subject", "category", "message", "status", "resolution", "creation", "modified"],
		order_by="modified desc",
		limit=200,
	)
	if not requests:
		return []
	comments = frappe.get_all(
		"Comment",
		filters={
			"reference_doctype": "Asumi Support Request",
			"reference_name": ("in", [request.name for request in requests]),
			"comment_type": "Comment",
		},
		fields=["name", "reference_name", "comment_by", "content", "creation"],
		order_by="creation asc",
	)
	messages_by_request = {}
	for comment in comments:
		messages_by_request.setdefault(comment.reference_name, []).append(
			{
				"name": comment.name,
				"comment_by": comment.comment_by,
				"content": comment.content,
				"creation": comment.creation,
			}
		)
	for request in requests:
		request.messages = messages_by_request.get(request.name, [])
	return requests


@frappe.whitelist(methods=["POST"])
def admin_update_support_request(name: str, status: str, response: str | None = None):
	_require_support_agent()
	if status not in SUPPORT_STATUSES:
		frappe.throw("Choose a valid request status.")
	doc = frappe.get_doc("Asumi Support Request", name)
	doc.status = status
	response = (response or "").strip()
	if response:
		if len(response) > 10000:
			frappe.throw("Response cannot exceed 10000 characters.")
		doc.add_comment("Comment", response)
	doc.save(ignore_permissions=True)
	return serialize_support_request(doc, include_messages=True)


@frappe.whitelist(methods=["GET"])
@protected("Site")
def installation_history(name: str):
	app_ids = _asumi_marketplace_app_ids()
	if not app_ids:
		return []
	activities = frappe.get_all(
		"Site Activity",
		filters={
			"site": name,
			"reason": ("in", list(app_ids)),
			"action": ("in", ["Install App", "Uninstall App"]),
		},
		fields=["name", "reason", "job", "action", "creation"],
		order_by="creation desc",
		limit=30,
	)
	app_slugs = list({activity.reason for activity in activities if activity.reason})
	marketplace_titles = {}
	if app_slugs:
		marketplace_titles = {
			app.app: app.title
			for app in frappe.get_all(
				"Marketplace App",
				filters={"app": ("in", app_slugs)},
				fields=["app", "title"],
			)
		}
	job_names = list({activity.job for activity in activities if activity.job})
	jobs = {
		job.name: job
		for job in frappe.get_all(
			"Agent Job",
			filters={"name": ("in", job_names), "site": name},
			fields=["name", "status", "start", "end"],
		)
	}
	return [
		{
			"name": activity.name,
			"app": activity.reason,
			"app_title": marketplace_titles.get(activity.reason),
			"action": activity.action,
			"job": activity.job,
			"status": jobs.get(activity.job, {}).get("status", "Unknown"),
			"creation": activity.creation,
		}
		for activity in activities
	]


@frappe.whitelist(methods=["GET"])
@protected("Site")
def installation_status(name: str, job: str):
	job_doc = frappe.get_doc("Agent Job", job)
	if job_doc.site != name:
		frappe.throw("Not permitted to view this installation.", frappe.PermissionError)
	return {"name": job_doc.name, "status": job_doc.status, "start": job_doc.start, "end": job_doc.end}


def serialize_support_request(doc, include_messages=False):
	request = {
		"name": doc.name,
		"team": doc.team,
		"site": doc.site,
		"subject": doc.subject,
		"category": doc.category,
		"message": doc.message,
		"status": doc.status,
		"resolution": doc.resolution,
		"creation": doc.creation,
		"modified": doc.modified,
	}
	if include_messages:
		request["messages"] = frappe.get_all(
			"Comment",
			filters={
				"reference_doctype": "Asumi Support Request",
				"reference_name": doc.name,
				"comment_type": "Comment",
			},
			fields=["name", "comment_by", "content", "creation"],
			order_by="creation asc",
		)
	return request
