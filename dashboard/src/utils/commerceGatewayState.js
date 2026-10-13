export function commerceGatewayState(settings) {
	if (!settings?.merchant_id_configured) {
		return {
			label: 'درگاه غیرفعال',
			message: 'برای دریافت وجه واقعی، شناسهٔ پذیرنده را ثبت کنید و حالت آزمایشی را خاموش بگذارید.',
			tone: 'warning',
		};
	}

	if (!settings.enabled) {
		return {
			label: 'درگاه غیرفعال',
			message: 'شناسهٔ پذیرنده ذخیره شده؛ checkout تا فعال‌سازی مدیر غیرفعال است.',
			tone: 'warning',
		};
	}

	if (settings.sandbox_mode) {
		return {
			label: 'حالت آزمایشی',
			message: 'پرداخت آزمایشی است و وجه واقعی دریافت نمی‌شود؛ مشتریان تا خاموش‌شدن حالت آزمایشی امکان خرید پولی ندارند.',
			tone: 'warning',
		};
	}

	if (!settings.allow_marketplace_app_sales && !settings.allow_site_plan_sales && !settings.allow_service_sales) {
		return {
			label: 'فروش غیرفعال',
			message: 'درگاه آماده است؛ برای شروع، فروش برنامه‌ها، خدمات آسومی یا پلن میزبانی را فعال کنید.',
			tone: 'warning',
		};
	}

	return {
		label: 'پرداخت زنده فعال',
		message: 'پرداخت‌های مشتریان با زرین‌پال در حالت تولید انجام می‌شود.',
		tone: 'success',
	};
}
