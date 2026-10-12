"""Pure validation for server-priced marketplace orders."""

from decimal import Decimal, InvalidOperation

from press.saas.commerce.pricing import ZARINPAL_MINIMUM_AMOUNT_IRR


def marketplace_app_order_snapshot(plan, app, site, team, customer):
	if not plan or not app or not site or not team or not customer:
		raise ValueError("اطلاعات سفارش کامل نیست")
	if not plan.get("enabled"):
		raise ValueError("این تعرفه فعال نیست")
	if app.get("status") != "Published":
		raise ValueError("این برنامه برای خرید منتشر نشده است")
	if site.get("team") != team.get("name") or site.get("status") != "Active":
		raise ValueError("سایت انتخاب‌شده فعال نیست یا به این حساب تعلق ندارد")
	if app.get("app") not in site.get("installed_apps", []):
		raise ValueError("ابتدا باید برنامه را روی این سایت نصب کنید")

	try:
		decimal_amount = Decimal(str(plan.get("price_irr")))
	except (InvalidOperation, TypeError, ValueError):
		decimal_amount = Decimal(0)
	if isinstance(plan.get("price_irr"), bool) or decimal_amount <= 0 or decimal_amount != decimal_amount.to_integral_value():
		raise ValueError("مبلغ تعرفه معتبر نیست")
	amount = int(decimal_amount)
	if amount < ZARINPAL_MINIMUM_AMOUNT_IRR:
		raise ValueError("حداقل مبلغ پرداخت زرین‌پال ۱۰٬۰۰۰ ریال است")
	if plan.get("app") != app.get("name"):
		raise ValueError("این تعرفه به برنامهٔ انتخاب‌شده تعلق ندارد")
	if plan.get("interval") not in {"Daily", "Monthly", "Yearly"}:
		raise ValueError("دورهٔ تعرفه معتبر نیست")

	return {
		"order_type": "Marketplace App",
		"plan_type": "Marketplace App Plan",
		"plan": plan["name"],
		"interval": plan.get("interval"),
		"marketplace_app": app["name"],
		"app": app["app"],
		"site": site["name"],
		"team": team["name"],
		"customer": customer,
		"currency": "IRR",
		"amount": amount,
	}
