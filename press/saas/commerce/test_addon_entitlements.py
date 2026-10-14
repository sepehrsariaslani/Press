import re
import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch

import frappe
from press.saas.doctype.asumi_addon_subscription.asumi_addon_subscription import AsumiAddonSubscription
from press.saas.commerce.addon_entitlements import (
	AddonSubscriptionSyncError,
	addon_subscription_name,
	evaluate_addon_access,
	generate_addon_secret_key,
	hash_addon_secret_key,
	issue_or_extend_addon_subscription,
	check_addon_subscription,
	subscription_term,
)


class AddonEntitlementPolicyTests(unittest.TestCase):
	now = datetime(2026, 10, 14, 12, 0, 0)
	key = "a" * 40

	def test_subscription_document_name_is_stable_for_site_and_addon(self):
		doc = SimpleNamespace(site_type="Site", site_name="tenant.asumi.ir", addon_id="assistant_ai")

		AsumiAddonSubscription.autoname(doc)

		self.assertEqual(doc.name, addon_subscription_name("Site", "tenant.asumi.ir", "assistant_ai"))

	def test_generates_hashed_site_scoped_keys_without_storing_raw_key(self):
		secret = generate_addon_secret_key()
		self.assertRegex(secret, re.compile(r"^[a-f0-9]{40}$"))
		self.assertEqual(hash_addon_secret_key(self.key), __import__("hashlib").sha256(self.key.encode()).hexdigest())
		self.assertNotEqual(addon_subscription_name("Site", "a.asumi.ir", "assistant_ai"),
			addon_subscription_name("Site", "b.asumi.ir", "assistant_ai"))
		self.assertNotEqual(addon_subscription_name("Site", "a.asumi.ir", "assistant_ai"),
			addon_subscription_name("Site", "a.asumi.ir", "internal_chat"))

	def test_extends_from_existing_expiry_only_when_it_is_in_the_future(self):
		future = datetime(2026, 11, 14, 12, 0, 0)
		start, end = subscription_term(self.now, future)
		self.assertEqual(start, future)
		self.assertEqual(end, datetime(2026, 12, 14, 12, 0, 0))
		start, _ = subscription_term(self.now, datetime(2026, 10, 1, 12, 0, 0))
		self.assertEqual(start, self.now)

	def test_unconfigured_and_free_preserve_legacy_access_without_a_key(self):
		for status in ("Unconfigured", "Free"):
			with self.subTest(status=status):
				self.assertEqual(
					evaluate_addon_access(status, now=self.now),
					{"enabled": True, "status": status, "expires_at": None},
				)

	def test_disabled_status_denies_access(self):
		self.assertEqual(
			evaluate_addon_access("Disabled", now=self.now),
			{"enabled": False, "status": "Disabled", "expires_at": None},
		)

	def test_paid_access_requires_matching_key_synced_active_order_and_future_end(self):
		result = evaluate_addon_access(
			"Paid", secret_key=self.key, key_hash=hash_addon_secret_key(self.key),
			subscription_status="Active", sync_status="Synced", order_status="Active",
			ends_at=datetime(2026, 11, 14, 12), now=self.now,
		)
		self.assertEqual(result, {"enabled": True, "status": "Paid", "expires_at": "2026-11-14 12:00:00"})
		self.assertNotIn(self.key, repr(result))

	def test_paid_access_denies_bad_key_order_refund_sync_or_expiry(self):
		base = {
			"secret_key": self.key,
			"key_hash": hash_addon_secret_key(self.key),
			"subscription_status": "Active",
			"sync_status": "Synced",
			"order_status": "Active",
			"ends_at": datetime(2026, 11, 14, 12),
			"now": self.now,
		}
		invalid = (
			{"secret_key": "b" * 40},
			{"subscription_status": "Revoked"},
			{"sync_status": "Failed"},
			{"order_status": "Refunded"},
			{"refund_reference": "REF-1"},
			{"ends_at": self.now},
			{"ends_at": None},
		)
		for changes in invalid:
			with self.subTest(changes=changes):
				result = evaluate_addon_access("Paid", **(base | changes))
				self.assertFalse(result["enabled"])
				self.assertEqual(set(result), {"enabled", "status", "expires_at"})

	def test_invalid_secrets_are_rejected_before_hashing(self):
		for secret in ("", "not-a-secret", "A" * 40):
			with self.subTest(secret=secret), self.assertRaises(ValueError):
				hash_addon_secret_key(secret)


class FakeDocument(SimpleNamespace):
	def insert(self, **_kwargs):
		self.inserted = True
		return self

	def save(self, **_kwargs):
		self.saved = True
		return self

	def db_set(self, values, **_kwargs):
		self.__dict__.update(values)


class AddonSubscriptionLifecycleTests(unittest.TestCase):
	key = "b" * 40
	order = FakeDocument(
		name="ORDER-ADDON",
		order_type="Asumi Service",
		status="Provisioning",
		provider="ZarinPal",
		payment_reference="12345",
		paid_at="2026-10-14 11:00:00",
		refund_reference="",
		amount=250_000,
		service_amount_toman=25_000,
		service_quote_snapshot=(
			'{"kind":"account_addon","addon_id":"assistant_ai",'
			'"title":"AI","monthly_price_toman":25000,"site_type":"Site",'
			'"site_name":"tenant.asumi.ir"}'
		),
		site="tenant.asumi.ir",
		docker_site=None,
		team="TEAM-1",
	)

	def test_creates_hashed_subscription_only_after_site_key_sync_succeeds(self):
		created = []
		with (
			patch.object(frappe.db, "exists", return_value=False),
			patch("press.saas.commerce.addon_entitlements._acquire_addon_subscription_lock", return_value=True),
			patch.object(frappe, "get_doc", side_effect=lambda values: created.append(FakeDocument(**values)) or created[-1]),
			patch("press.saas.commerce.addon_entitlements.generate_addon_secret_key", return_value=self.key),
			patch.object(frappe.utils, "now_datetime", return_value=datetime(2026, 10, 14, 12)),
			patch("press.saas.commerce.addon_entitlements.sync_addon_subscription_key") as sync,
		):
			subscription = issue_or_extend_addon_subscription(self.order)

		sync.assert_called_once()
		self.assertEqual(sync.call_args.args[1], self.key)
		self.assertTrue(subscription.inserted)
		self.assertEqual(subscription.name, addon_subscription_name("Site", "tenant.asumi.ir", "assistant_ai"))
		self.assertEqual(subscription.key_hash, hash_addon_secret_key(self.key))
		self.assertNotIn(self.key, repr(subscription.__dict__))
		self.assertEqual(subscription.status, "Active")
		self.assertEqual(subscription.sync_status, "Synced")
		self.assertEqual(subscription.ends_at, datetime(2026, 11, 14, 12))

	def test_renewal_extends_from_future_term_end_and_rotates_key_after_sync(self):
		previous_end = datetime(2026, 11, 14, 12)
		existing = FakeDocument(
			name=addon_subscription_name("Site", "tenant.asumi.ir", "assistant_ai"),
			team="TEAM-1", site_type="Site", site_name="tenant.asumi.ir", addon_id="assistant_ai",
			key_hash="c" * 64, source_order="ORDER-OLD", status="Active", starts_at=datetime(2026, 10, 14, 12),
			ends_at=previous_end, sync_status="Synced", sync_error="",
		)
		with (
			patch.object(frappe.db, "exists", return_value=True),
			patch("press.saas.commerce.addon_entitlements._acquire_addon_subscription_lock", return_value=True),
			patch.object(frappe, "get_doc", return_value=existing),
			patch("press.saas.commerce.addon_entitlements.generate_addon_secret_key", return_value=self.key),
			patch.object(frappe.utils, "now_datetime", return_value=datetime(2026, 10, 20, 12)),
			patch("press.saas.commerce.addon_entitlements.sync_addon_subscription_key") as sync,
		):
			subscription = issue_or_extend_addon_subscription(self.order)

		sync.assert_called_once()
		self.assertEqual(sync.call_args.args[1], self.key)
		self.assertIs(subscription, existing)
		self.assertEqual(subscription.starts_at, previous_end)
		self.assertEqual(subscription.ends_at, datetime(2026, 12, 14, 12))
		self.assertEqual(subscription.source_order, "ORDER-ADDON")
		self.assertTrue(subscription.saved)

	def test_failed_key_sync_does_not_store_the_raw_key_or_activate_subscription(self):
		created = []
		with (
			patch.object(frappe.db, "exists", return_value=False),
			patch("press.saas.commerce.addon_entitlements._acquire_addon_subscription_lock", return_value=True),
			patch.object(frappe, "get_doc", side_effect=lambda values: created.append(FakeDocument(**values)) or created[-1]),
			patch("press.saas.commerce.addon_entitlements.generate_addon_secret_key", return_value=self.key),
			patch.object(frappe.utils, "now_datetime", return_value=datetime(2026, 10, 14, 12)),
			patch("press.saas.commerce.addon_entitlements.sync_addon_subscription_key", side_effect=RuntimeError(f"sync failed with {self.key}")),
			self.assertRaises(AddonSubscriptionSyncError) as raised,
		):
			issue_or_extend_addon_subscription(self.order)

		self.assertNotIn(self.key, str(raised.exception))
		self.assertTrue(created[0].inserted)
		self.assertEqual(created[0].status, "Provisioning")
		self.assertEqual(created[0].sync_status, "Failed")
		self.assertNotIn(self.key, repr(created[0].__dict__))

	def test_failed_renewal_keeps_the_current_active_key_and_term(self):
		previous_end = datetime(2026, 11, 14, 12)
		old_hash = "c" * 64
		existing = FakeDocument(
			name=addon_subscription_name("Site", "tenant.asumi.ir", "assistant_ai"),
			team="TEAM-1", site_type="Site", site_name="tenant.asumi.ir", addon_id="assistant_ai",
			key_hash=old_hash, source_order="ORDER-OLD", status="Active", starts_at=datetime(2026, 10, 14, 12),
			ends_at=previous_end, sync_status="Synced", sync_error="",
		)
		with (
			patch.object(frappe.db, "exists", return_value=True),
			patch("press.saas.commerce.addon_entitlements._acquire_addon_subscription_lock", return_value=True),
			patch.object(frappe, "get_doc", return_value=existing),
			patch("press.saas.commerce.addon_entitlements.generate_addon_secret_key", return_value=self.key),
			patch.object(frappe.utils, "now_datetime", return_value=datetime(2026, 10, 20, 12)),
			patch("press.saas.commerce.addon_entitlements.sync_addon_subscription_key", side_effect=RuntimeError("agent unavailable")),
			self.assertRaises(AddonSubscriptionSyncError),
		):
			issue_or_extend_addon_subscription(self.order)

		self.assertEqual(existing.status, "Active")
		self.assertEqual(existing.key_hash, old_hash)
		self.assertEqual(existing.source_order, "ORDER-OLD")
		self.assertEqual(existing.ends_at, previous_end)
		self.assertEqual(existing.sync_status, "Synced")
		self.assertEqual(existing.sync_error, "agent unavailable")


class AddonEntitlementLookupTests(unittest.TestCase):
	key = "d" * 40

	def test_paid_status_checks_hash_source_order_and_requested_site(self):
		row = SimpleNamespace(
			team="TEAM-1", site_type="Site", key_hash=hash_addon_secret_key(self.key), status="Active",
			sync_status="Synced", source_order="ORDER-1", ends_at=datetime(2026, 11, 14, 12),
		)
		with (
			patch("press.saas.commerce.addon_entitlements.frappe.get_all", return_value=[row]),
			patch("press.saas.commerce.addon_entitlements.frappe.db.get_value", return_value={
				"status": "Active", "refund_reference": "", "site": "tenant.asumi.ir", "docker_site": None,
				"order_type": "Asumi Service", "provider": "ZarinPal", "payment_reference": "REF-1",
				"paid_at": "2026-10-14 11:00:00", "team": "TEAM-1",
				"service_quote_snapshot": (
					'{"kind":"account_addon","addon_id":"assistant_ai",'
					'"site_type":"Site","site_name":"tenant.asumi.ir","monthly_price_toman":25000}'
				),
				"service_amount_toman": 25000, "amount": 250000,
			}),
			patch("press.saas.commerce.addon_entitlements.frappe.utils.now_datetime", return_value=datetime(2026, 10, 14, 12)),
		):
			result = check_addon_subscription("assistant_ai", "tenant.asumi.ir", self.key, {"status": "Paid"})

		self.assertTrue(result["enabled"])
		self.assertEqual(set(result), {"enabled", "status", "expires_at"})

	def test_free_and_unconfigured_do_not_need_site_key_lookup(self):
		with patch("press.saas.commerce.addon_entitlements.frappe.get_all") as get_all:
			for status in ("Unconfigured", "Free"):
				self.assertTrue(check_addon_subscription("internal_chat", "", "", {"status": status})["enabled"])
		get_all.assert_not_called()


if __name__ == "__main__":
	unittest.main()
