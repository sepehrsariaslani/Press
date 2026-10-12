import frappe

from press.www.saas.catalog import get_public_marketplace_catalog
from press.www.saas.index import _can_manage_marketplace_prices


def get_context(context):
	context.no_cache = 1
	context.marketplace_apps = get_public_marketplace_catalog(frappe.get_all)
	context.can_manage_marketplace_prices = _can_manage_marketplace_prices()
	context.asumi_user_authenticated = frappe.session.user != "Guest"
