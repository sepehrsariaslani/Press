from pathlib import Path
import unittest

from press.www.saas.catalog import add_app_categories


class AsumiMarketplaceListingTest(unittest.TestCase):
	def test_categories_are_attached_to_the_matching_public_apps(self):
		apps = [
			{"id": "app-a", "title": "A"},
			{"id": "app-b", "title": "B"},
		]
		rows = [
			{"parent": "app-a", "category": "مالی"},
			{"parent": "app-a", "category": "مالی"},
			{"parent": "app-b", "category": "مدیریت"},
			{"parent": "unpublished-app", "category": "پنهان"},
		]

		categories = add_app_categories(apps, rows)

		self.assertEqual(apps[0]["categories"], ["مالی"])
		self.assertEqual(apps[1]["categories"], ["مدیریت"])
		self.assertEqual(categories, ["مالی", "مدیریت"])

	def test_listing_uses_asumi_brand_real_plans_and_safe_dom_rendering(self):
		template = Path(__file__).with_name("index.html").read_text()

		self.assertIn("مارکت‌پلیس اپلیکیشن‌های آسومی", template)
		self.assertIn("plan.prices", template)
		self.assertIn("{{ app.title | e }}", template)
		self.assertNotIn("innerHTML", template)
		self.assertNotIn("press.www.marketplace.index.search", template)

	def test_marketplace_app_detail_title_uses_asumi_brand(self):
		base = Path(__file__).parents[2].joinpath("templates/marketplace/base.html").read_text()
		detail = Path(__file__).parents[2].joinpath(
			"press/doctype/marketplace_app/templates/marketplace_app.html"
		).read_text()

		self.assertNotIn("Frappe Cloud Marketplace", base)
		self.assertIn("آسومی", detail)

	def test_marketplace_app_detail_escapes_publisher_content(self):
		detail = Path(__file__).parents[2].joinpath(
			"press/doctype/marketplace_app/templates/marketplace_app.html"
		).read_text()

		for escaped_value in (
			"app.title | e",
			"app.description | e",
			"app.image | e",
			"category.category | e",
			"publisher_profile.display_name | e",
			"image.image | e",
			"image.caption | e",
			"supported_version.version | e",
			"review.title | e",
			"review.review | e",
			"review.user_name | e",
			"reply[1:] | e",
			"reply | e",
			"feature | e",
		):
			with self.subTest(escaped_value=escaped_value):
				self.assertIn(escaped_value, detail)

		self.assertIn("frappe.utils.markdown(app.long_description)", detail)
		self.assertNotIn("frappe.utils.md_to_html(app.long_description)", detail)


if __name__ == "__main__":
	unittest.main()
