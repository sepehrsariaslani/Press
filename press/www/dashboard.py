# Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
# For license information, please see license.txt


import frappe

from press.docker_control.permissions import (
	can_access_docker_control as user_can_access_docker_control,
	is_docker_control_admin,
)
from press.utils import get_default_team_for_user, get_valid_teams_for_user

base_template_path = "templates/www/dashboard.html"
no_cache = 1


def get_context():
	return _get_context()


def _get_context():
	csrf_token = frappe.sessions.get_csrf_token()
	frappe.db.commit()
	context = frappe._dict()
	context.boot = get_boot()
	context.boot.csrf_token = csrf_token
	return context


@frappe.whitelist(methods=["POST"], allow_guest=True)
def get_context_for_dev():
	if not frappe.conf.developer_mode:
		frappe.throw("This method is only meant for developer mode")
	return get_boot()


def get_boot():
	user_roles = frappe.get_roles(frappe.session.user)
	return frappe._dict(
		frappe_version=frappe.__version__,
		press_dashboard_sentry_dsn=frappe.conf.press_dashboard_sentry_dsn or "",
		press_frontend_posthog_host=frappe.conf.posthog_host or "",
		press_frontend_posthog_project_id=frappe.conf.posthog_project_id or "",
		press_site_name=frappe.conf.site,
		site_name=frappe.local.site,
		default_team=get_default_team_for_user(frappe.session.user),
		valid_teams=get_valid_teams_for_user(frappe.session.user),
		is_system_user=frappe.session.data.user_type == "System User",
		is_system_manager="System Manager" in user_roles,
		is_press_admin="Press Admin" in user_roles,
		can_access_docker_control=user_can_access_docker_control(frappe.session.user),
		can_manage_docker_control_host=is_docker_control_admin(frappe.session.user),
		verify_cards_with_micro_charge=frappe.db.get_single_value(
			"Press Settings", "verify_cards_with_micro_charge"
		),
		**(
			frappe.db.get_values(
				"Press Settings",
				"Press Settings",
				["free_credits_inr", "free_credits_usd"],
				as_dict=True,
			)[0]
		),
	)
