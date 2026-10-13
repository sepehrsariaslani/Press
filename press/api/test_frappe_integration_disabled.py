import unittest
from types import SimpleNamespace
from unittest.mock import patch

from press.api.account import get_frappe_io_auth_url
from press.api.marketplace import get_discount_percent
from press.api.partner import can_apply_for_certificate
from press.exceptions import FrappeioServerNotSet
from press.partner.doctype.partner_approval_request.partner_approval_request import (
	PartnerApprovalRequest,
)


class FrappeIntegrationDisabledTest(unittest.TestCase):
	def test_frappe_login_url_is_not_resolved_when_authentication_is_disabled(self):
		with (
			patch(
				"press.api.account.is_frappe_auth_disabled",
				return_value=True,
			create=True,
			),
			patch(
				"press.api.account.frappe.get_last_doc",
				side_effect=AssertionError("Frappe login provider must not be queried"),
			),
		):
			self.assertIsNone(get_frappe_io_auth_url())

	def test_partner_approval_skips_frappe_email_when_integration_is_disabled(self):
		request = object.__new__(PartnerApprovalRequest)
		with (
			patch("press.utils.billing.is_frappe_auth_disabled", return_value=True),
			patch(
				"press.utils.billing.get_frappe_io_connection",
				side_effect=FrappeioServerNotSet,
			) as get_connection,
		):
			request.send_approval_request_email()

		get_connection.assert_not_called()

	def test_certificate_check_skips_frappe_when_integration_is_disabled(self):
		with (
			patch("press.guards.role_guard.roles_enabled", return_value=False),
			patch(
				"press.api.partner.get_current_team",
				return_value=SimpleNamespace(partner_email="partner@example.com"),
			),
			patch("press.utils.billing.is_frappe_auth_disabled", return_value=True),
			patch(
				"press.utils.billing.get_frappe_io_connection",
				side_effect=FrappeioServerNotSet,
			) as get_connection,
		):
			self.assertIsNone(can_apply_for_certificate())

		get_connection.assert_not_called()

	def test_marketplace_discount_uses_existing_discount_when_integration_is_disabled(self):
		with (
			patch(
				"press.api.marketplace.get_current_team",
				return_value=SimpleNamespace(erpnext_partner=True),
			),
			patch("press.api.marketplace.frappe.get_value", return_value=True),
			patch(
				"press.api.marketplace.is_frappe_auth_disabled",
				return_value=True,
				create=True,
			),
			patch(
				"press.api.marketplace.get_frappe_io_connection",
				side_effect=FrappeioServerNotSet,
			) as get_connection,
		):
			self.assertEqual(get_discount_percent("plan-1", discount=12.5), 12.5)

		get_connection.assert_not_called()


if __name__ == "__main__":
	unittest.main()
