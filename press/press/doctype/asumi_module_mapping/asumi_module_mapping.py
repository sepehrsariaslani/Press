import frappe
from frappe import _
from frappe.model.document import Document


ASUMI_MODULE_IDS = {
	"finance",
	"sales",
	"crm",
	"procurement",
	"inventory",
	"projects",
	"manufacturing",
	"quality",
	"people",
	"assets",
	"fleet",
	"pricing",
	"growth",
	"restaurant",
	"business",
}

DEFAULT_MODULE_PREREQUISITES = {
	"finance": [],
	"sales": [],
	"crm": [],
	"procurement": [],
	"inventory": [],
	"projects": [],
	"manufacturing": ["inventory"],
	"quality": [],
	"people": [],
	"assets": ["finance"],
	"fleet": [],
	"pricing": [],
	"growth": [],
	"restaurant": [],
	"business": ["growth"],
}


class AsumiModuleMapping(Document):
	def validate(self):
		if self.module_id not in ASUMI_MODULE_IDS:
			frappe.throw(_("Choose a valid Asumi module."))

		if self.mode == "Marketplace app" and not self.marketplace_app:
			frappe.throw(_("Choose a Marketplace app for this module."))
