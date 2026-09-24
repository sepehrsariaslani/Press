import frappe

from press.guards.role_guard import roles_enabled, skip_roles
from press.press.doctype.team.team_members import get_roles
from press.utils import get_current_team, is_admin_user, is_team_owner


def can_manage_billing(team):
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


def require_billing_access(team):
	if not can_manage_billing(team):
		frappe.throw("Only a team billing manager can manage account billing.", frappe.PermissionError)


@frappe.whitelist(methods=["GET"])
def billing_settings():
	"""Return the current team's billing address through the Asumi billing role."""
	team = get_current_team(get_doc=True)
	require_billing_access(team)
	address = frappe._dict()
	if team.billing_address:
		doc = frappe.get_doc("Address", team.billing_address)
		address = frappe._dict(
			address=doc.address_line1,
			city=doc.city,
			state=doc.state,
			postal_code=doc.pincode,
			country=doc.country,
			gstin="" if doc.gstin == "Not Applicable" else doc.gstin,
		)
	else:
		address.country = team.country
	return {
		"billing_name": team.billing_name or "",
		"address": address,
		"payment_mode": team.payment_mode,
		"billing_country_code": frappe.db.get_value("Country", address.country, "code") if address.country else None,
	}


@frappe.whitelist(methods=["POST"])
def save_billing_details(billing_details):
	team = get_current_team(get_doc=True)
	require_billing_access(team)
	billing_details = frappe._dict(billing_details)
	if not billing_details.billing_name or not billing_details.country:
		frappe.throw("Enter a billing name and country before saving.")
	from press.api.account import validate_pincode

	validate_pincode(billing_details)
	if (team.country != billing_details.country) and (team.country == "India" or billing_details.country == "India"):
		frappe.throw("Cannot change country after registration")
	if billing_details.country == "India":
		if not billing_details.gstin:
			billing_details.gstin = "Not Applicable"
		from press.api.billing import validate_gst

		validate_gst(billing_details)
	team.update_billing_details(billing_details)
	return billing_settings()


@frappe.whitelist(methods=["POST"])
def refresh_invoice_payment_link(invoice: str):
	team = get_current_team(get_doc=True)
	require_billing_access(team)
	invoice_name = frappe.db.get_value("Invoice", {"name": invoice, "team": team.name}, "name")
	if not invoice_name:
		frappe.throw("This invoice does not belong to the current team.", frappe.PermissionError)
	doc = frappe.get_doc("Invoice", invoice_name)
	if doc.status != "Unpaid" or not doc.stripe_invoice_id:
		frappe.throw("This invoice does not have a renewable Stripe payment link.")
	return doc.refresh_stripe_payment_link()
