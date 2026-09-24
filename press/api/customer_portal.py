from math import isfinite

import frappe
from frappe.utils import cint, flt

from press.press.doctype.marketplace_app.marketplace_app import get_plans_for_app
from press.press.doctype.team.team_members import get_invitations, get_roles
from press.guards.role_guard import roles_enabled, skip_roles
from press.utils import get_current_team, is_admin_user, is_team_owner
from press.api.site import protected


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


def _can_manage_billing(team):
	if (
		"System Manager" in frappe.get_roles()
		or not roles_enabled()
		or skip_roles()
		or is_team_owner(team.name)
		or is_admin_user(team.name)
	):
		return True
	billing_roles = [role["name"] for role in get_roles(team.name) if role.get("allow_billing")]
	return bool(
		billing_roles
		and frappe.db.exists(
			"Press Role User",
			{"parent": ("in", billing_roles), "user": frappe.session.user},
		)
	)


def _catalog_mappings(include_unpublished=False):
	from press.press.doctype.asumi_module_mapping.asumi_module_mapping import ASUMI_MODULE_IDS

	stored = {
		mapping.module_id: mapping
		for mapping in frappe.get_all(
			"Asumi Module Mapping",
			fields=["module_id", "mode", "marketplace_app", "published", "description"],
		)
	}
	mappings = []
	for module_id in sorted(ASUMI_MODULE_IDS):
		mapping = stored.get(module_id)
		if mapping and not mapping.published and not include_unpublished:
			continue
		mappings.append(
			mapping
			or frappe._dict(
			module_id=module_id,
			mode="Included" if module_id in DEFAULT_INCLUDED_MODULES else "Purchase request",
			marketplace_app=None,
			published=1,
			description=None,
			)
		)
	return mappings


@frappe.whitelist(methods=["GET"])
def dashboard():
	"""Return the current team's sites and native Marketplace subscriptions."""
	team = get_current_team(get_doc=True)
	sites = frappe.get_all(
		"Site",
		filters={"team": team.name},
		fields=["name", "host_name", "status"],
		order_by="creation desc",
	)
	sites_by_name = {site.name: site for site in sites}

	subscriptions = frappe.get_all(
		"Marketplace App Subscription",
		filters={"team": team.name},
		fields=[
			"name",
			"app",
			"site",
			"status",
			"interval",
			"start_date",
			"end_date",
			"marketplace_app_plan",
		],
		order_by="modified desc",
	)
	app_names = list({subscription.app for subscription in subscriptions})
	apps = {}
	plans_by_app = {}
	if app_names:
		apps = {
			app.name: app
			for app in frappe.get_all(
				"Marketplace App",
				filters={"name": ("in", app_names)},
				fields=["name", "app", "title", "image"],
			)
		}
		plans_by_app = {
			app_name: get_plans_for_app(app_name, include_disabled=True) for app_name in app_names
		}

	serialized_subscriptions = []
	for subscription in subscriptions:
		app = apps.get(subscription.app)
		site = sites_by_name.get(subscription.site)
		selected_plan = next(
			(
				serialize_plan(plan)
				for plan in plans_by_app.get(subscription.app, [])
				if plan["name"] == subscription.marketplace_app_plan
			),
			None,
		)
		serialized_subscriptions.append(
			{
				"name": subscription.name,
				"app": app.app if app else subscription.app,
				"app_title": app.title if app else subscription.app,
				"app_image": app.image if app else None,
				"site": subscription.site,
				"site_label": (site.host_name or site.name) if site else subscription.site,
				"site_status": site.status if site else None,
				"status": subscription.status,
				"interval": subscription.interval,
				"start_date": subscription.start_date,
				"end_date": subscription.end_date,
				"selected_plan": selected_plan,
			}
		)

	return {
		"team": {
			"name": team.name,
			"title": team.team_title or team.name,
			"currency": team.currency,
		},
		"sites": [serialize_site(site) for site in sites],
		"subscriptions": serialized_subscriptions,
		"can_manage_billing": _can_manage_billing(team),
		"can_manage_catalog": _is_catalog_admin(),
		"can_manage_support": _is_support_agent(),
	}


def serialize_site(site):
	return {
		"name": site.name,
		"label": site.host_name or site.name,
		"status": site.status,
	}


def serialize_plan(plan):
	return {
		"name": plan["name"],
		"title": plan["title"],
		"price_inr": plan["price_inr"],
		"price_usd": plan["price_usd"],
		"enabled": plan["enabled"],
		"features": plan["features"],
	}


@frappe.whitelist(methods=["GET"])
def catalog():
	"""Return the published Marketplace apps and Asumi-to-Press mappings."""
	from press.api.marketplace import get_marketplace_pricing_catalog

	apps = get_marketplace_pricing_catalog()
	mappings = _catalog_mappings(include_unpublished=True)
	app_by_name = {app.name: app for app in apps}
	public_mappings = []
	for mapping in mappings:
		app = app_by_name.get(mapping.marketplace_app)
		public_mappings.append(
			{
				"module_id": mapping.module_id,
				"mode": mapping.mode,
				"marketplace_app_slug": app.app if app else None,
				"marketplace_app_title": app.title if app else None,
				"published": cint(mapping.published),
			}
		)
	return {"apps": apps, "mappings": public_mappings}


@frappe.whitelist(methods=["GET"])
def catalog_admin():
	_require_catalog_admin()
	from press.api.marketplace import get_marketplace_pricing_catalog

	mappings = _catalog_mappings(include_unpublished=True)
	return {"apps": get_marketplace_pricing_catalog(), "mappings": mappings}


@frappe.whitelist(methods=["POST"])
def save_catalog_mapping(module_id: str, mode: str, marketplace_app: str | None = None, published: int = 1):
	_require_catalog_admin()
	from press.press.doctype.asumi_module_mapping.asumi_module_mapping import ASUMI_MODULE_IDS

	if module_id not in ASUMI_MODULE_IDS:
		frappe.throw("Choose a valid Asumi module.")
	if mode not in {"Included", "Marketplace app", "Purchase request"}:
		frappe.throw("Choose a valid catalog type.")
	if mode == "Marketplace app" and not marketplace_app:
		frappe.throw("Choose a Marketplace app for this module.")
	if marketplace_app and not frappe.db.exists("Marketplace App", marketplace_app):
		frappe.throw("The selected Marketplace app does not exist.")

	name = frappe.db.get_value("Asumi Module Mapping", {"module_id": module_id}, "name")
	doc = frappe.get_doc("Asumi Module Mapping", name) if name else frappe.new_doc("Asumi Module Mapping")
	doc.module_id = module_id
	doc.mode = mode
	doc.marketplace_app = marketplace_app if mode == "Marketplace app" else None
	doc.published = cint(published)
	doc.save(ignore_permissions=True)
	return {
		"module_id": doc.module_id,
		"mode": doc.mode,
		"marketplace_app": doc.marketplace_app,
		"published": doc.published,
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
	return {
		"team": {"name": team.name, "title": team.team_title or team.name},
		"members": team.members(),
		"invitations": get_invitations(team.name),
		"roles": [
			{"name": role["name"], "title": role["label"], "admin_access": role["admin_access"]}
			for role in get_roles(team.name)
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
	activities = frappe.get_all(
		"Site Activity",
		filters={"site": name, "action": "Install App"},
		fields=["name", "reason", "job", "creation"],
		order_by="creation desc",
		limit=30,
	)
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
