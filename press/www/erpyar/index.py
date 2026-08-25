from .data import ERPYAR_HOMEPAGE_DATA


def get_context(context):
    context.no_cache = 1
    context.homepage = ERPYAR_HOMEPAGE_DATA
    context.metatags = {
        "title": "ارپ یار | راهکارهای Frappe و ERPNext",
        "description": "ارپ یار بستری برای معرفی، فروش، استقرار و مدیریت اپلیکیشن های مبتنی بر Frappe در کنار زیرساخت Press است.",
        "og:type": "website",
    }
