def is_marketplace_app_plan_free(prices: dict, currency: str) -> bool:
	price_field = "price_inr" if currency == "INR" else "price_usd"
	return (prices.get(price_field) or 0) <= 0


def has_paid_marketplace_app_plan(plans: list[dict], currency: str) -> bool:
	price_field = "price_inr" if currency == "INR" else "price_usd"
	return any((plan.get(price_field) or 0) > 0 for plan in plans)
