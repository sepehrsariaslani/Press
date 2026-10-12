from decimal import Decimal, InvalidOperation

VALID_BILLING_INTERVALS = {"Daily", "Monthly", "Yearly"}
ZARINPAL_MINIMUM_AMOUNT_IRR = 10_000


def normalize_interval(value, default: str = "Daily") -> str:
	"""Validate the billing interval stored on a published plan."""
	interval = value or default
	if interval not in VALID_BILLING_INTERVALS:
		raise ValueError("دورهٔ تعرفه معتبر نیست")
	return interval


def normalize_price(value, currency: str) -> int | float:
	"""Validate a nonnegative catalog price; Iranian Rial must be whole Rials."""
	try:
		amount = Decimal(str(value))
	except (InvalidOperation, TypeError, ValueError):
		raise ValueError("قیمت واردشده معتبر نیست") from None
	if not amount.is_finite() or amount < 0:
		raise ValueError("قیمت نمی‌تواند منفی باشد")
	if currency == "IRR":
		if amount != amount.to_integral_value():
			raise ValueError("قیمت ریالی باید عدد صحیح باشد")
		return int(amount)
	return float(amount)


def normalize_zarinpal_price(value) -> int:
	"""Allow free catalog entries, but reject paid amounts below ZarinPal's minimum."""
	amount = normalize_price(value, "IRR")
	if amount and amount < ZARINPAL_MINIMUM_AMOUNT_IRR:
		raise ValueError("حداقل مبلغ پرداخت زرین‌پال ۱۰٬۰۰۰ ریال است")
	return amount


def normalize_marketplace_app_plan_prices(prices: dict) -> dict[str, int | float]:
	"""Validate all prices before a marketplace plan is written."""
	return {
		"price_inr": normalize_price(prices.get("price_inr") or 0, "INR"),
		"price_usd": normalize_price(prices.get("price_usd") or 0, "USD"),
		"price_irr": normalize_price(prices.get("price_irr") or 0, "IRR"),
	}
