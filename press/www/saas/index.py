# Copyright (c) 2026, Frappe Technologies Pvt. Ltd. and Contributors
# For license information, please see license.txt

import frappe


def _get_trial_days_by_app():
	rows = frappe.db.sql(
		"""
		SELECT
			pta.app AS app,
			MAX(pt.trial_days) AS trial_days
		FROM `tabProduct Trial App` pta
		INNER JOIN `tabProduct Trial` pt ON pt.name = pta.parent
		WHERE pt.published = 1
		GROUP BY pta.app
		""",
		as_dict=True,
	)
	return {row.app: int(row.trial_days or 0) for row in rows}


def _normalize_prices(site_plan):
	monthly = 0.0
	yearly = 0.0
	price_inr = float(site_plan.get("price_inr") or 0)
	interval = (site_plan.get("interval") or "").strip().lower()

	if interval == "monthly":
		monthly = price_inr
		yearly = monthly * 12
	elif interval in ("annually", "yearly"):
		yearly = price_inr
		monthly = yearly / 12 if yearly else 0
	else:
		monthly = price_inr
		yearly = monthly * 12

	return round(monthly, 2), round(yearly, 2)


def _resource_hint(site_plans):
	resource_rows = [
		row
		for row in site_plans
		if int(row.get("vcpu") or 0) > 0 and int(row.get("memory") or 0) > 0 and int(row.get("disk") or 0) > 0
	]
	if not resource_rows:
		return {
			"min_cpu": 1,
			"min_ram": 2,
			"min_disk": 20,
			"recommended_cpu": 2,
			"recommended_ram": 4,
			"recommended_disk": 50,
		}

	return {
		"min_cpu": min(int(r.get("vcpu") or 1) for r in resource_rows),
		"min_ram": min(int(r.get("memory") or 2) for r in resource_rows),
		"min_disk": min(int(r.get("disk") or 20) for r in resource_rows),
		"recommended_cpu": max(int(r.get("vcpu") or 2) for r in resource_rows),
		"recommended_ram": max(int(r.get("memory") or 4) for r in resource_rows),
		"recommended_disk": max(int(r.get("disk") or 50) for r in resource_rows),
	}


def _collect_apps_payload():
	saas_apps = frappe.get_all(
		"Saas App",
		filters={"status": "Published"},
		fields=["name", "app", "title", "description", "image", "signup_url"],
		order_by="modified desc",
	)
	if not saas_apps:
		return []

	trial_days_by_app = _get_trial_days_by_app()
	app_names = [app.name for app in saas_apps]

	saas_plans = frappe.get_all(
		"Saas App Plan",
		filters={"enabled": 1, "app": ["in", app_names]},
		fields=["name", "app", "plan_title", "site_plan", "is_free", "annual_discount", "annual_discount_inr"],
	)
	site_plan_names = sorted({plan.site_plan for plan in saas_plans if plan.site_plan})
	site_plan_rows = frappe.get_all(
		"Site Plan",
		filters={"enabled": 1, "name": ["in", site_plan_names]} if site_plan_names else {"name": ""},
		fields=["name", "plan_title", "interval", "price_inr", "vcpu", "memory", "disk", "allow_downgrading_from_other_plan"],
	)
	site_plan_map = {row.name: row for row in site_plan_rows}

	plans_by_app = {}
	for plan in saas_plans:
		site_plan = site_plan_map.get(plan.site_plan)
		if not site_plan:
			continue
		monthly, yearly = _normalize_prices(site_plan)
		if int(plan.is_free or 0):
			monthly, yearly = 0, 0
		if int(plan.annual_discount or 0) and yearly:
			yearly = max(yearly - float(plan.annual_discount_inr or 0), 0)
		plans_by_app.setdefault(plan.app, []).append(
			{
				"name": plan.name,
				"title": plan.plan_title or site_plan.plan_title,
				"site_plan": plan.site_plan,
				"price_monthly": round(monthly, 2),
				"price_yearly": round(yearly, 2),
				"vcpu": int(site_plan.vcpu or 0),
				"memory": int(site_plan.memory or 0),
				"disk": int(site_plan.disk or 0),
				"allow_downgrade": int(site_plan.allow_downgrading_from_other_plan or 0),
			}
		)

	payload = []
	for app in saas_apps:
		app_plans = plans_by_app.get(app.name, [])
		app_plans.sort(key=lambda row: row.get("price_monthly") or 0)
		resource_hint = _resource_hint(app_plans)
		trial_days = trial_days_by_app.get(app.app, 0)
		cheapest_monthly = app_plans[0]["price_monthly"] if app_plans else 0
		cheapest_yearly = app_plans[0]["price_yearly"] if app_plans else 0

		payload.append(
			{
				"id": app.name,
				"app_code": app.app,
				"title": app.title,
				"description": app.description,
				"image": app.image,
				"signup_url": app.signup_url or f"/signup?app={app.name}",
				"trial_days": int(trial_days or 0),
				"price_monthly": cheapest_monthly,
				"price_yearly": cheapest_yearly,
				"plans": app_plans,
				**resource_hint,
			}
		)

	return payload


def get_context(context):
	context.no_cache = 1
	context.apps_payload = _collect_apps_payload()
	context.metatags = {
		"title": "DEN SaaS Platform",
		"description": "فروش اپلیکیشن + صورتحساب زیرساخت + دمو محدود در یک پلتفرم یکپارچه",
		"og:type": "website",
	}
