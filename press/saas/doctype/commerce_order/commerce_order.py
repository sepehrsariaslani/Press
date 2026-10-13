import frappe
from frappe.model.document import Document

from press.saas.commerce.commerce_order_validation import validate_commerce_order


class CommerceOrder(Document):
	def validate(self):
		try:
			validate_commerce_order(self)
		except ValueError as error:
			frappe.throw(str(error))
