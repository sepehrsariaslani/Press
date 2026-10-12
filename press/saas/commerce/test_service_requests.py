import unittest

from press.saas.commerce.service_requests import build_service_request_lead, normalize_service_request_status


class ServiceRequestTests(unittest.TestCase):
	def test_builds_module_pricing_lead_without_creating_an_order(self):
		lead = build_service_request_lead(
			service="module_pricing",
			full_name="  سپهر مدیر  ",
			phone="۰۹۱۲۱۲۳۴۵۶۷",
			company=" وی‌درخت ",
			context="ماژول‌های انتخاب‌شده: مالی، فروش\nتعرفهٔ ماهانه: ۵٬۵۰۰٬۰۰۰ تومان",
			source_path="/#pricing",
			source_host="asumi.ir",
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
					"ماژول‌های انتخاب‌شده: مالی، فروش\nتعرفهٔ ماهانه: ۵٬۵۰۰٬۰۰۰ تومان"
				),
				"source_path": "/#pricing",
				"source_host": "asumi.ir",
			},
		)

	def test_accepts_only_supported_service_kinds(self):
		for service in ("module_pricing", "website_design"):
			with self.subTest(service=service):
				lead = build_service_request_lead(
					service=service,
					full_name="مشتری",
					phone="09123456789",
				)
				self.assertEqual(lead["product_interest"], f"asumi_service_request:{service}")
				self.assertIn("فاکتور یا پرداخت نیست", lead["message"])

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
