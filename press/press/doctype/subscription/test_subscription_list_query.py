import unittest
from unittest.mock import patch

import frappe
from frappe.query_builder.builder import QueryBuilder

from press.press.doctype.subscription.subscription import Subscription


class SubscriptionListQueryTest(unittest.TestCase):
	def test_marketplace_subscription_list_includes_docker_sites(self):
		captured = {}

		def capture_query(query, *args, **kwargs):
			captured["sql"] = query.get_sql()
			return []

		with (
			patch.object(
				frappe.local,
				"team",
				return_value=frappe._dict(currency="IRR"),
				create=True,
			),
			patch.object(QueryBuilder, "run", capture_query),
		):
			Subscription.get_list_query(
				None,
				filters={"document_name": "accounts"},
				limit=10,
				start=0,
			)

		sql = captured["sql"].lower()
		self.assertIn("coalesce(`tabsubscription`.`site`,`tabsubscription`.`docker_site`)", sql)
		self.assertIn("`tabsubscription`.`docker_site`<>''", sql)
		self.assertIn(" or ", sql)


if __name__ == "__main__":
	unittest.main()
