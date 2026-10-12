import unittest
from types import SimpleNamespace
from unittest.mock import call, patch

from press.saas.commerce import api as commerce_api
from press.saas.commerce.provisioning_recovery import subscription_recovery_state


class SubscriptionRecoveryStateTest(unittest.TestCase):
	def test_failed_renewal_restores_a_previously_active_subscription(self):
		state = subscription_recovery_state(
			{"plan": "OLD-PLAN", "enabled": 1, "team": "TEAM-1", "secret_key": "existing-secret"}
		)

		self.assertEqual(
			state,
			{
				"fields": {"plan": "OLD-PLAN", "enabled": 1, "team": "TEAM-1"},
				"secret_key": "existing-secret",
			},
		)

	def test_failed_activation_does_not_restore_key_for_an_inactive_subscription(self):
		state = subscription_recovery_state(
			{"plan": "OLD-PLAN", "enabled": 0, "team": "TEAM-1", "secret_key": "old-secret"}
		)

		self.assertEqual(state["fields"], {"plan": "OLD-PLAN", "enabled": 0, "team": "TEAM-1"})
		self.assertIsNone(state["secret_key"])

	def test_failed_first_activation_disables_the_new_subscription_and_removes_its_key(self):
		state = subscription_recovery_state(None)

		self.assertEqual(state, {"fields": {"enabled": 0}, "secret_key": None})


class MarketplaceProvisioningRecoveryTest(unittest.TestCase):
	def test_failed_renewal_restores_subscription_and_its_site_key(self):
		class FakeDoc(SimpleNamespace):
			def db_set(self, values):
				for key, value in values.items():
					setattr(self, key, value)

			def save(self, **kwargs):
				return self

			def update_site_config(self, config):
				self.updated_config = config

		order = FakeDoc(
			name="ORDER-1",
			status="Paid",
			order_type="Marketplace App",
			plan="NEW-PLAN",
			marketplace_app="APP-DOC",
			app="demo_app",
			team="TEAM-1",
			customer="buyer@example.com",
			amount=10000,
			interval="Monthly",
			site="site.example.test",
			docker_site=None,
			provisioning_attempts=0,
		)
		plan = FakeDoc(name="NEW-PLAN", app="APP-DOC", enabled=1, price_irr=10000, interval="Monthly")
		app = FakeDoc(name="APP-DOC", app="demo_app")
		site = FakeDoc(
			name="site.example.test",
			team="TEAM-1",
			status="Active",
			apps=[SimpleNamespace(app="demo_app")],
			configuration=[
				SimpleNamespace(key="timezone", value="UTC", type="String"),
				SimpleNamespace(key="sk_demo_app", value="existing-secret", type="String"),
			],
		)
		subscription = FakeDoc(
			name="SUB-1",
			plan="OLD-PLAN",
			enabled=1,
			team="TEAM-1",
			secret_key="existing-secret",
		)
		docs = {
			("Commerce Order", "ORDER-1"): order,
			("Marketplace App Plan", "NEW-PLAN"): plan,
			("Marketplace App", "APP-DOC"): app,
			("Site", "site.example.test"): site,
		}
		sync_calls = []

		def fail_initial_sync(order_arg, app_arg, secret_key):
			sync_calls.append(call(order_arg, app_arg, secret_key))
			raise RuntimeError("temporary config sync failure")

		with (
			patch.object(
				commerce_api.frappe,
				"get_doc",
				side_effect=lambda doctype, name, **kwargs: docs[(doctype, name)],
			),
			patch.object(commerce_api.frappe, "log_error"),
			patch.object(commerce_api, "_get_app_subscription", return_value=subscription),
			patch.object(commerce_api, "_sync_marketplace_subscription_config", side_effect=fail_initial_sync),
		):
			commerce_api.provision_paid_order("ORDER-1")

		self.assertEqual(order.status, "Provisioning Failed")
		self.assertEqual(subscription.plan, "OLD-PLAN")
		self.assertEqual(subscription.enabled, 1)
		self.assertEqual(subscription.team, "TEAM-1")
		self.assertEqual(sync_calls, [call(order, app, "existing-secret")])
		self.assertEqual(
			[(row["key"], row["value"]) for row in site.updated_config],
			[("timezone", "UTC"), ("sk_demo_app", "existing-secret")],
		)


if __name__ == "__main__":
	unittest.main()
