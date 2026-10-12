from datetime import datetime, timedelta

from dateutil.relativedelta import relativedelta


def period_end(start: datetime, interval: str) -> datetime:
	"""Return the end of one paid marketplace plan interval."""
	if interval == "Daily":
		return start + timedelta(days=1)
	if interval == "Monthly":
		return start + relativedelta(months=1)
	if interval in {"Yearly", "Annually"}:
		return start + relativedelta(years=1)
	raise ValueError(f"Unsupported billing interval: {interval}")
