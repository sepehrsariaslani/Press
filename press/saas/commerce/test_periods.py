import unittest
from datetime import datetime

from press.saas.commerce.periods import period_end


class PaidPlanPeriodTest(unittest.TestCase):
	def test_daily_plan_expires_after_one_day(self):
		start = datetime(2026, 10, 12, 12)
		self.assertEqual(period_end(start, "Daily"), datetime(2026, 10, 13, 12))

	def test_monthly_plan_uses_calendar_month_and_handles_month_end(self):
		self.assertEqual(period_end(datetime(2026, 1, 31), "Monthly"), datetime(2026, 2, 28))

	def test_annual_plan_expires_after_one_calendar_year(self):
		self.assertEqual(period_end(datetime(2024, 2, 29), "Yearly"), datetime(2025, 2, 28))

	def test_unknown_interval_is_rejected(self):
		with self.assertRaises(ValueError):
			period_end(datetime(2026, 1, 1), "Hourly")


if __name__ == "__main__":
	unittest.main()
