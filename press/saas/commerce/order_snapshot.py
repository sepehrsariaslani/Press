"""Pure validation for server-priced marketplace orders."""

from decimal import Decimal, InvalidOperation
import re

from press.saas.commerce.pricing import normalize_zarinpal_price
from press.saas.commerce.pricing import ZARINPAL_MINIMUM_AMOUNT_IRR
from press.saas.commerce.service_delivery import (
	EXISTING_SITE_UPGRADE,
	NEW_SITE_PROVISIONING,
	normalize_site_plan_delivery_mode,
)

SITE_SUBDOMAIN_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{3,30}[a-z0-9])$")
SITE_PLAN_INTERVALS = {"Daily": "Daily", "Monthly": "Monthly", "Annually": "Yearly", "Yearly": "Yearly"}


def marketplace_app_order_snapshot(plan, app, site, team, customer):
	if not plan or not app or not site or not team or not customer:
		raise ValueError("اطلاعات سفارش کامل نیست")
	if not plan.get("enabled"):
		raise ValueError("این تعرفه فعال نیست")
	if app.get("status") != "Published":
		raise ValueError("این برنامه برای خرید منتشر نشده است")
	if site.get("team") != team.get("name") or site.get("status") != "Active":
		raise ValueError("سایت انتخاب‌شده فعال نیست یا به این حساب تعلق ندارد")
	site_type = site.get("site_type", "Site")
	if site_type == "Docker Control Site" and not site.get("enabled"):
		raise ValueError("سایت انتخاب‌شده فعال نیست یا به این حساب تعلق ندارد")
	if site_type not in {"Site", "Docker Control Site"}:
		raise ValueError("نوع سایت برای خرید برنامه معتبر نیست")
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

	snapshot = {
		"order_type": "Marketplace App",
		"plan_type": "Marketplace App Plan",
		"plan": plan["name"],
		"interval": plan.get("interval"),
		"marketplace_app": app["name"],
		"app": app["app"],
		"team": team["name"],
		"customer": customer,
		"currency": "IRR",
		"amount": amount,
	}
	if site_type == "Docker Control Site":
		snapshot["docker_site"] = site["name"]
	else:
		snapshot["site"] = site["name"]
	return snapshot


def hosting_order_snapshot(
	plan,
	team,
	customer,
	*,
	site=None,
	subdomain=None,
	apps=None,
	renew_new_site=False,
	root_domain="asumi.ir",
):
	"""Build an immutable paid Site Plan order from trusted plan and team data."""
	if not plan or not team or not customer:
		raise ValueError("اطلاعات سفارش کامل نیست")
	if plan.get("document_type") != "Site" or not plan.get("enabled"):
		raise ValueError("این تعرفهٔ میزبانی فعال نیست")
	try:
		amount = normalize_zarinpal_price(plan.get("price_irr"))
	except ValueError as error:
		raise ValueError(str(error)) from None
	if amount < ZARINPAL_MINIMUM_AMOUNT_IRR:
		raise ValueError("مبلغ تعرفهٔ میزبانی باید حداقل ۱۰٬۰۰۰ ریال باشد")

	interval = SITE_PLAN_INTERVALS.get(plan.get("interval"))
	if not interval:
		raise ValueError("دورهٔ تعرفهٔ میزبانی معتبر نیست")
	try:
		delivery_mode = normalize_site_plan_delivery_mode(plan.get("commerce_delivery_mode"))
	except ValueError as error:
		raise ValueError(str(error)) from None

	if delivery_mode == EXISTING_SITE_UPGRADE:
		if not site or subdomain:
			raise ValueError("برای این تعرفه باید یک سایت فعال انتخاب کنید")
		if site.get("team") != team.get("name") or site.get("status") != "Active":
			raise ValueError("سایت انتخاب‌شده فعال نیست یا به این حساب تعلق ندارد")
		if not site.get("plan"):
			raise ValueError("سایت فعلی پلن پایهٔ قابل‌بازگشت ندارد")
		site_name = site["name"]
		subdomain_value = None
		original_plan = site["plan"]
		selected_apps = []
	else:
		if site:
			if (
				not renew_new_site
				or subdomain
				or apps
				or site.get("team") != team.get("name")
				or site.get("status") not in {"Active", "Suspended"}
				or site.get("plan") != plan.get("name")
				or site.get("domain") != root_domain
			):
				raise ValueError("سایت انتخاب‌شده برای تمدید این پلن قابل استفاده نیست")
			subdomain_value = str(site.get("subdomain") or "").strip()
			if (
				not SITE_SUBDOMAIN_PATTERN.fullmatch(subdomain_value)
				or site.get("name") != f"{subdomain_value}.{root_domain}"
			):
				raise ValueError("زیردامنهٔ سایت برای تمدید معتبر نیست")
			site_name = site["name"]
			selected_apps = []
		else:
			if renew_new_site:
				raise ValueError("برای تمدید، سایت اصلی این پلن را انتخاب کنید")
			subdomain_value = str(subdomain or "").strip()
			if not SITE_SUBDOMAIN_PATTERN.fullmatch(subdomain_value) or len(subdomain_value) > 32:
				raise ValueError("زیردامنه باید ۵ تا ۳۲ نویسه و شامل حروف کوچک انگلیسی، عدد یا خط تیره باشد")
			site_name = None
			if not isinstance(apps, (list, tuple)):
				raise ValueError("فهرست برنامه‌های سایت معتبر نیست")
			selected_apps = []
			for app in apps:
				app_name = str(app or "").strip()
				if not app_name or len(app_name) > 140 or any(char.isspace() for char in app_name):
					raise ValueError("شناسهٔ برنامهٔ انتخاب‌شده معتبر نیست")
				if app_name not in selected_apps:
					selected_apps.append(app_name)
			if len(selected_apps) > 30:
				raise ValueError("تعداد برنامه‌های انتخاب‌شده بیش از حد مجاز است")
		original_plan = None

	return {
		"order_type": "Hosting",
		"plan_type": "Site Plan",
		"plan": plan["name"],
		"interval": interval,
		"site": site_name,
		"team": team["name"],
		"customer": customer,
		"currency": "IRR",
		"amount": amount,
		"service_delivery_mode": delivery_mode,
		"subdomain": subdomain_value,
		"original_plan": original_plan,
		"apps": selected_apps,
	}
