import frappe

from press.api.asumi_billing import require_billing_access
from press.api.site import protected
from press.utils import get_current_team

from .common import _asumi_marketplace_app_ids, _validate_marketplace_plan_currency


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
