from frappe.model.document import Document


class AsumiAddonSubscription(Document):
	def autoname(self):
		from press.saas.commerce.addon_entitlements import addon_subscription_name

		self.name = addon_subscription_name(self.site_type, self.site_name, self.addon_id)
