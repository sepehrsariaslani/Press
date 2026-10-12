import json
import unittest
from pathlib import Path


class SubscriptionDocTypeIdentityTest(unittest.TestCase):
	def test_press_subscription_uses_a_name_distinct_from_erpnext_subscription(self):
		repo_root = Path(__file__).resolve().parents[3]
		doctype_path = (
			repo_root / "press" / "press" / "doctype" / "press_subscription" / "press_subscription.json"
		)
		with doctype_path.open(encoding="utf-8") as source:
			doctype = json.load(source)

		self.assertEqual(doctype["name"], "Press Subscription")
		self.assertIn("docker_site", {field["fieldname"] for field in doctype["fields"]})


if __name__ == "__main__":
	unittest.main()
