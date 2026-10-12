def _price_field(currency: str) -> str:
	return {
		"INR": "price_inr",
		"IRR": "price_irr",
	}.get(currency, "price_usd")


def is_marketplace_app_plan_free(prices: dict, currency: str) -> bool:
	price_field = _price_field(currency)
	return (prices.get(price_field) or 0) <= 0


def has_paid_marketplace_app_plan(plans: list[dict], currency: str) -> bool:
	price_field = _price_field(currency)
	return any((plan.get(price_field) or 0) > 0 for plan in plans)
