import unittest

from press.saas.commerce.service_requests import build_service_request_lead, normalize_service_request_status


class ServiceRequestTests(unittest.TestCase):
	def test_builds_module_pricing_lead_from_server_quote_snapshot(self):
		lead = build_service_request_lead(
			service="module_pricing",
			full_name="  سپهر مدیر  ",
			phone="۰۹۱۲۱۲۳۴۵۶۷",
			company=" وی‌درخت ",
			context="تعرفهٔ جعلی: ۱ تومان",
			source_path="/#pricing",
			source_host="asumi.ir",
			quote_snapshot={
				"lines": [
					{"kind": "module", "id": "finance", "title": "مالی و حسابداری", "amount": 5_500_000}
				],
				"module_total": 5_500_000,
				"addon_total": 0,
				"listed_total": 5_500_000,
				"package_id": None,
				"package_title": None,
				"discount": 0,
				"discount_label": "",
				"total": 5_500_000,
				"quoted_at": "2026-10-13 12:00:00",
			},
		)

		self.assertEqual(
			lead,
			{
				"full_name": "سپهر مدیر",
				"phone": "09121234567",
				"company": "وی‌درخت",
				"lead_type": "contact",
				"status": "New",
				"product_interest": "asumi_service_request:module_pricing",
				"message": (
					"درخواست بررسی برآورد خدمات آسومی. این درخواست فاکتور یا پرداخت نیست.\n\n"
					"مبنای برآورد: تعرفهٔ ذخیره‌شده روی سرور\n"
					"انتخاب‌ها:\n• مالی و حسابداری: ۵٬۵۰۰٬۰۰۰ تومان\n"
					"جمع قیمت‌های تکی: ۵٬۵۰۰٬۰۰۰ تومان\n"
					"مبلغ نهایی ماهانه: ۵٬۵۰۰٬۰۰۰ تومان\n"
					"زمان محاسبه: 2026-10-13 12:00:00"
				),
				"source_path": "/#pricing",
				"source_host": "asumi.ir",
			},
		)
		self.assertNotIn("تعرفهٔ جعلی", lead["message"])

	def test_accepts_only_supported_service_kinds(self):
		for service in ("website_design",):
			with self.subTest(service=service):
				lead = build_service_request_lead(
					service=service,
					full_name="مشتری",
					phone="09123456789",
				)
				self.assertEqual(lead["product_interest"], f"asumi_service_request:{service}")
				self.assertIn("فاکتور یا پرداخت نیست", lead["message"])

	def test_module_pricing_requires_a_server_quote_snapshot(self):
		with self.assertRaisesRegex(ValueError, "quote_snapshot"):
			build_service_request_lead(
				service="module_pricing",
				full_name="مشتری",
				phone="09123456789",
				context="مبلغ جعلی",
			)

	def test_website_design_request_keeps_its_existing_context(self):
		lead = build_service_request_lead(
			service="website_design",
			full_name="مشتری",
			phone="09123456789",
			context="برآورد طراحی وب‌سایت",
		)
		self.assertIn("برآورد طراحی وب‌سایت", lead["message"])

	def test_rejects_invalid_service_request_data(self):
		invalid_requests = (
			({"service": "unknown", "full_name": "مشتری", "phone": "09123456789"}, "service"),
			({"service": "module_pricing", "full_name": "   ", "phone": "09123456789"}, "name"),
			({"service": "module_pricing", "full_name": "مشتری", "phone": "abc"}, "phone"),
			(
				{
					"service": "module_pricing",
					"full_name": "مشتری",
					"phone": "09123456789",
					"context": "x" * 5001,
				},
				"context",
			),
		)
		for payload, field in invalid_requests:
			with self.subTest(field=field):
				with self.assertRaisesRegex(ValueError, field):
					build_service_request_lead(**payload)

	def test_accepts_only_lead_statuses(self):
		self.assertEqual(normalize_service_request_status("Contacted"), "Contacted")
		with self.assertRaisesRegex(ValueError, "status"):
			normalize_service_request_status("Paid")


if __name__ == "__main__":
	unittest.main()
