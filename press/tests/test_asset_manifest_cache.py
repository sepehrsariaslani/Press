import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from press import hooks
from press.utils.asset_manifest_cache import invalidate_assets_json_cache


class TestAssetManifestCache(unittest.TestCase):
	def test_press_after_build_invalidates_shared_asset_manifest(self):
		self.assertIn(
			"press.utils.asset_manifest_cache.invalidate_assets_json_cache",
			hooks.after_build,
		)

	def test_invalidator_deletes_shared_assets_json_key(self):
		delete_value = Mock()
		frappe_stub = SimpleNamespace(
			client_cache=SimpleNamespace(delete_value=delete_value),
		)
		with patch("press.utils.asset_manifest_cache.frappe", frappe_stub):
			invalidate_assets_json_cache()

		delete_value.assert_called_once_with("assets_json", shared=True)


if __name__ == "__main__":
	unittest.main()
