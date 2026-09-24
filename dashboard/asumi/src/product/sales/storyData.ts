export const salesSample = {
	customer: 'مشتری نمونه',
	product: 'محصول A',
	quantity: 120,
	unitPrice: 2_400_000,
	discountPercent: 5,
	advancePercent: 40,
	deliveryTime: 'پنج‌شنبه · ۱۰:۳۰',
	orderId: 'SO-1405-00291',
	currency: 'تومان',
} as const;

export const salesQuote = {
	grossTotal: salesSample.quantity * salesSample.unitPrice,
	discountAmount: salesSample.quantity * salesSample.unitPrice * salesSample.discountPercent / 100,
	get total() {
		return this.grossTotal - this.discountAmount;
	},
} as const;

export const salesFlow = [
	{ id: 'inventory', label: 'انبار', value: salesSample.quantity, suffix: ' عدد آماده‌ی تحویل', status: 'موجود' },
	{ id: 'delivery', label: 'تحویل', value: salesSample.deliveryTime, suffix: '', status: 'برنامه‌ریزی‌شده' },
	{ id: 'finance', label: 'مالی', value: salesSample.advancePercent, suffix: '٪ پیش‌پرداخت', status: 'دریافت‌شده' },
	{ id: 'follow-up', label: 'پیگیری فروش', value: 'مکالمه و توافق ثبت شد', suffix: '', status: 'تکمیل' },
] as const;

export const salesSignals = [
	{ id: 'follow-up', value: '۲۳', label: 'فرصت بدون پیگیری', detail: 'گفت‌وگوهایی که هنوز پاسخ روشن نگرفته‌اند.' },
	{ id: 'repeat-sales', value: '۱۲٪', label: 'کاهش فروش مشتریان قبلی', detail: 'نشانه‌ای برای بازبینی ارتباط و زمان‌بندی تماس.' },
	{ id: 'late-orders', value: '۷', label: 'سفارش با تأخیر موجودی', detail: 'سفارش‌هایی که منتظر تأمین کالا مانده‌اند.' },
] as const;

export const salesChapters = [
	{
		id: 'sales-request', label: 'درخواست', eyebrow: 'پرونده‌ی فروش · ۰۱ / ۰۶',
		title: 'این درخواست،\nبه فروش می‌رسد؟',
		description: 'یک مشتری برای ۱۲۰ عدد قیمت می‌خواهد؛ پاسخ به‌موقع می‌تواند آغاز یک سفارش باشد.',
		detail: 'فرصت از همان اولین پیام، قابل‌پیگیری می‌ماند.',
	},
	{
		id: 'sales-quote', label: 'پیشنهاد', eyebrow: 'پیشنهاد قیمت · ۰۲ / ۰۶',
		title: 'پیشنهاد،\nآماده‌ی ارسال است.',
		description: 'کالا، تعداد، تخفیف و زمان تحویل در یک پیشنهاد روشن کنار هم قرار می‌گیرند.',
		detail: 'مشتری دقیقاً می‌بیند چه چیزی، با چه شرایطی عرضه شده است.',
	},
	{
		id: 'sales-accepted', label: 'تأیید', eyebrow: 'مشتری پاسخ داد · ۰۳ / ۰۶',
		title: 'پیشنهاد\nتأیید شد.',
		description: 'یک لحظه فکر می‌کنی کار تمام شده؛ اما قول فروش، تازه شروع تعهد توست.',
		detail: 'فروش با «بله» گفتن مشتری تمام نمی‌شود.',
	},
	{
		id: 'sales-connected', label: 'اتصال', eyebrow: 'سازمان وارد جریان می‌شود · ۰۴ / ۰۶',
		title: 'فروش،\nتنها نیست.',
		description: 'موجودی، زمان تحویل، پیش‌پرداخت و پیگیری در امتداد همان سفارش دیده می‌شوند.',
		detail: 'آسومی فروش، انبار، تحویل و مالی را در یک مسیر نگه می‌دارد.',
	},
	{
		id: 'sales-order', label: 'سفارش', eyebrow: 'از روایت تا محصول · ۰۵ / ۰۶',
		title: 'این، نمای سفارش\nدر آسومی است.',
		description: 'شماره‌ی سفارش، وضعیت، اقلام، تحویل و دریافتی را در یک نمای واقعی از محصول ببین.',
		detail: 'این پیش‌نمایش برای نمایش مسیر است؛ سند واقعی در محیط کاری ثبت می‌شود.',
	},
	{
		id: 'sales-outlook', label: 'رشد', eyebrow: 'به‌سوی آینده‌ی روشن · ۰۶ / ۰۶',
		title: 'فقط ندان\nچقدر فروختی.',
		description: 'فرصت‌های معطل، سفارش‌های در خطر و رابطه‌هایی را ببین که می‌توانند بهتر پیش بروند.',
		detail: 'از مشتری و سفارش تا تحویل و تحلیل؛ مسیر بعدی را خودت انتخاب کن.',
	},
] as const;
