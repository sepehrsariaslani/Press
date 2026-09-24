export type SalesGuideStep = {
	id: string;
	title: string;
	description: string;
	records: readonly string[];
	action: string;
	path: string;
};

export const salesJourney: readonly SalesGuideStep[] = [
	{
		id: 'opportunity',
		title: 'سرنخ و پیگیری',
		description: 'گفت‌وگو، سرنخ و فرصت خرید در CRM پیگیری می‌شود؛ وقتی مشتری درخواست قیمت دارد، مسیر به فروش می‌رسد.',
		records: ['CRM Lead', 'CRM Deal'],
		action: 'دیدن قیف CRM',
		path: '/crm/pipeline',
	},
	{
		id: 'quotation',
		title: 'ساخت پیشنهاد قیمت',
		description: 'مشتری و کالا را انتخاب کن، مقدار و قیمت را مشخص کن و شرایط تجاریِ توافق‌شده را در پیش‌فاکتور بیاور.',
		records: ['Quotation'],
		action: 'رفتن به ثبت فروش',
		path: '/sales/invoice-entry',
	},
	{
		id: 'order',
		title: 'تبدیل توافق به سفارش',
		description: 'پس از تأیید پیشنهاد، سفارش فروش را ثبت کن و وضعیت آماده‌سازی و مقدار تحویل‌شده را دنبال کن.',
		records: ['Sales Order'],
		action: 'دیدن مرکز فروش',
		path: '/modules/sales',
	},
	{
		id: 'fulfillment',
		title: 'آماده‌سازی و ارسال',
		description: 'برداشت کالا، حواله‌ی تحویل و ارسال را پیگیری کن؛ سفارش‌های معوق و برگشت فروش هم در مسیرهای عملیاتی دیده می‌شوند.',
		records: ['Pick List', 'Delivery Note', 'Shipment'],
		action: 'دیدن برد ارسال',
		path: '/sales/dispatch',
	},
	{
		id: 'invoice',
		title: 'فاکتور و پیگیری دریافت',
		description: 'فاکتور فروش را برای معامله ثبت کن و وضعیت دریافت و تسویه را در ارتباط با گردش مالی شرکت دنبال کن.',
		records: ['Sales Invoice', 'Payment Entry'],
		action: 'رفتن به ماژول مالی',
		path: '/modules/finance',
	},
	{
		id: 'insight',
		title: 'کنترل و بهبود فروش',
		description: 'از نمای مدیریتی و گزارش‌ها، سفارش‌های باز، کنترل‌های فروش و روند عملکرد را بررسی کن.',
		records: ['گزارش فروش', 'کنترل عملیات'],
		action: 'دیدن مرکز کنترل فروش',
		path: '/sales/operations-center',
	},
] as const;

export type SalesCapability = {
	id: string;
	eyebrow: string;
	title: string;
	description: string;
	items: readonly string[];
	linkLabel?: string;
	path?: string;
	note?: string;
};

export const salesCapabilities: readonly SalesCapability[] = [
	{
		id: 'documents',
		eyebrow: 'از پیشنهاد تا معامله',
		title: 'گردش اسناد فروش',
		description: 'سندهای اصلی معامله را در مسیر قابل‌پیگیری کنار هم نگه دار.',
		items: ['پیش‌فاکتور و سفارش فروش', 'فاکتور فروش و برگشت از فروش', 'سفارش‌های باز و پیگیری تکمیل'],
		linkLabel: 'رفتن به ثبت و گردش سند',
		path: '/sales/invoice-entry',
	},
	{
		id: 'fulfillment',
		eyebrow: 'از سفارش تا تحویل',
		title: 'آماده‌سازی و ارسال',
		description: 'وضعیت انجام سفارش را از برداشت کالا تا تحویل و ارسال دنبال کن.',
		items: ['لیست برداشت و حواله‌ی تحویل', 'برد ارسال و برنامه‌ی مسیرها', 'سفارش‌های معوق و برگشت فروش'],
		linkLabel: 'رفتن به برد ارسال',
		path: '/sales/dispatch',
	},
	{
		id: 'commercial',
		eyebrow: 'آماده‌ی فروش',
		title: 'کالا، مشتری و شرایط تجاری',
		description: 'اطلاعات پایه و قواعدی را تنظیم کن که تیم برای ارائه‌ی پیشنهاد و ثبت سفارش به آن‌ها نیاز دارد.',
		items: ['کالا، خدمات، گروه کالا و بسته‌ها', 'پرونده و نشانی‌های مشتری', 'فروشندگان، شرکا، قلمرو و گروه مشتری', 'قرارداد، تخفیف و شرایط پرداخت و حمل'],
		linkLabel: 'رفتن به تنظیمات فروش',
		path: '/sales/setup-center',
	},
	{
		id: 'management',
		eyebrow: 'برای کنترل روزانه',
		title: 'مدیریت و گزارش فروش',
		description: 'عملیات روزانه و تصویر مدیریتی فروش را از یک مسیر مشخص بررسی کن.',
		items: ['داشبورد، قیف و گزارش‌های فروش', 'کنترل اعتبار مشتری و سفارش', 'مرکز صندوق و نمای مدیریتی'],
		linkLabel: 'رفتن به مرکز کنترل فروش',
		path: '/sales/operations-center',
	},
	{
		id: 'messaging',
		eyebrow: 'ارتباط با مشتری',
		title: 'پیامک و پیگیری',
		description: 'قالب پیام را انتخاب کن، زمان ارسال را تنظیم کن و تاریخچه‌ی پیام‌ها را ببین.',
		items: ['انتخاب مشتری و قالب پیامک', 'زمان‌بندی و تاریخچه‌ی ارسال'],
		linkLabel: 'رفتن به مرکز پیامک',
		path: '/sms-center',
		note: 'ارسال پیامک به فعال‌بودن اتصال sms.ir و تنظیمات حساب وابسته است.',
	},
] as const;
