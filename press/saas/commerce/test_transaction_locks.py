import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from press.saas.commerce import api


class TransactionLockTest(unittest.TestCase):
	def setUp(self):
		self.after_commit = SimpleNamespace(callbacks=[])
		self.after_commit.add = self.after_commit.callbacks.append
		self.after_rollback = SimpleNamespace(callbacks=[])
		self.after_rollback.add = self.after_rollback.callbacks.append
		self.sql = Mock(return_value=[[1]])
		self.db = SimpleNamespace(
			sql=self.sql,
			after_commit=self.after_commit,
			after_rollback=self.after_rollback,
		)

	def test_advisory_lock_is_released_only_after_transaction_commit(self):
		with patch.object(api, "frappe", SimpleNamespace(db=self.db)):
			acquired = api._acquire_transaction_lock("asumi-marketplace:test")

		self.assertTrue(acquired)
		self.assertEqual(self.sql.call_count, 1)
		self.assertEqual(len(self.after_commit.callbacks), 1)
		self.assertEqual(len(self.after_rollback.callbacks), 1)

		self.after_commit.callbacks[0]()

		self.assertEqual(self.sql.call_count, 2)
		self.assertEqual(self.sql.call_args.args[0], "SELECT RELEASE_LOCK(%s)")
		self.assertEqual(self.sql.call_args.args[1], ("asumi-marketplace:test",))

	def test_advisory_lock_is_released_after_transaction_rollback(self):
		with patch.object(api, "frappe", SimpleNamespace(db=self.db)):
			acquired = api._acquire_transaction_lock("asumi-marketplace:test")

		self.assertTrue(acquired)
		self.after_rollback.callbacks[0]()

		self.assertEqual(self.sql.call_count, 2)
		self.assertEqual(self.sql.call_args.args[0], "SELECT RELEASE_LOCK(%s)")

	def test_failed_lock_acquisition_does_not_register_release_callbacks(self):
		self.sql.return_value = [[0]]
		with patch.object(api, "frappe", SimpleNamespace(db=self.db)):
			acquired = api._acquire_transaction_lock("asumi-marketplace:test")

		self.assertFalse(acquired)
		self.assertEqual(self.sql.call_count, 1)
		self.assertEqual(self.after_commit.callbacks, [])
		self.assertEqual(self.after_rollback.callbacks, [])


if __name__ == "__main__":
	unittest.main()
