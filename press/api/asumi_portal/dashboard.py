import frappe

from press.api.asumi_billing import can_manage_billing
from press.api.asumi_permissions import can_manage_apps
from press.marketplace.doctype.marketplace_app_plan.marketplace_app_plan import MarketplaceAppPlan
from press.press.doctype.marketplace_app.marketplace_app import get_plans_for_app
from press.utils import get_current_team

from .common import (
	_asumi_marketplace_app_ids,
	_catalog_mappings,
	_is_catalog_admin,
	_is_support_agent,
	_pending_marketplace_invoice_lines,
	_customer_team_options,
	serialize_plan,
	serialize_site,
)


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

	csrf_token = frappe.sessions.get_csrf_token()
	frappe.db.commit()

	return {
		"csrf_token": csrf_token,
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
