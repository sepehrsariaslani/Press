export const salesSample = {
	customer: 'مشتری نمونه',
	product: 'کد A',
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
	{ id: 'shipment', label: 'ارسال', value: 'هماهنگی سفارش', suffix: '', status: 'در جریان' },
	{ id: 'finance', label: 'مالی', value: salesSample.advancePercent, suffix: '٪ پیش‌پرداخت', status: 'دریافت‌شده' },
] as const;

export const salesSignals = [
	{ id: 'follow-up', value: '۲۳', label: 'فرصت بدون پیگیری', detail: 'گفت‌وگوهایی که هنوز پاسخ روشن نگرفته‌اند.' },
	{ id: 'repeat-sales', value: '۱۲٪', label: 'کاهش فروش مشتریان قبلی', detail: 'نشانه‌ای برای بازبینی ارتباط و زمان‌بندی تماس.' },
	{ id: 'late-orders', value: '۷', label: 'سفارش با تأخیر موجودی', detail: 'سفارش‌هایی که منتظر تأمین کالا مانده‌اند.' },
] as const;

export const salesChapters = [
	{
		id: 'sales-request', label: 'درخواست', eyebrow: 'پرونده‌ی فروش · ۰۱ / ۰۶',
		title: 'یک درخواست تازه.',
		description: 'پیامی کوتاه می‌رسد؛ هنوز نمی‌دانی به یک سفارش واقعی تبدیل می‌شود یا نه.',
		detail: 'آیا این مشتری به فروش تبدیل می‌شود؟',
	},
	{
		id: 'sales-quote', label: 'پیشنهاد', eyebrow: 'پیشنهاد قیمت · ۰۲ / ۰۶',
		title: 'درخواست، شکلِ یک پیشنهاد می‌گیرد.',
		description: 'کد A و تعداد ۱۲۰، قیمت، تخفیف و زمان تحویل؛ یکی‌یکی روی همان برگه کامل می‌شوند.',
		detail: 'پیشنهاد آماده است؛ حالا برای مشتری ارسال می‌شود.',
	},
	{
		id: 'sales-accepted', label: 'تأیید', eyebrow: 'مشتری پاسخ داد · ۰۳ / ۰۶',
		title: '«تأیید شد.»',
		description: 'برای یک لحظه به‌نظر می‌رسد معامله تمام شده است.',
		detail: 'اما فروش با بله‌گفتن مشتری تمام نمی‌شود.',
	},
	{
		id: 'sales-connected', label: 'تحویل', eyebrow: 'پشت سفارش چه خبر است؟ · ۰۴ / ۰۶',
		title: 'حالا باید\nتحویلش بدهی.',
		description: 'موجودی هست؟ زمان تحویل کی است؟ ارسال انجام شده؟ پرداخت چطور؟',
		detail: 'با عقب‌رفتن صحنه، سؤال‌های پنهانِ پشت سفارش پیدا می‌شوند.',
	},
	{
		id: 'sales-order', label: 'اتصال', eyebrow: 'همه در یک پرونده · ۰۵ / ۰۶',
		title: 'یک سفارش؛\nچند جریان پیوسته.',
		description: 'انبار، تحویل، ارسال و مالی، به همان سفارش وصل می‌شوند؛ هر سند جای خودش را پیدا می‌کند.',
		detail: 'نه فلوچارت‌های جدا؛ یک پرونده که با هر مرحله کامل‌تر می‌شود.',
	},
	{
		id: 'sales-outlook', label: 'آینده', eyebrow: 'به‌سوی آینده‌ی روشن · ۰۶ / ۰۶',
		title: 'از درخواست تا تحویل؛\nمسیر روشن‌تر.',
		description: 'فرصت، پیشنهاد، سفارش و تعهدهای بعدش را در یک مسیر قابل‌پیگیری ببین.',
		detail: 'آسومی؛ فروش تنها نیست.',
	},
] as const;
