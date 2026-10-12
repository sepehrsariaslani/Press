export type ProcurementChapter = {
	id: string;
	label: string;
	eyebrow: string;
	title: string;
	description: string;
	detail: string;
};

export const procurementSample = {
	item: 'قطعه‌ی A',
	requested: 80,
	available: 24,
	orderNumber: 'PO-1405-00128',
	received: 78,
	accepted: 76,
	needsInspection: 2,
	currency: 'تومان',
} as const;

export const procurementSuppliers = [
	{ id: 'arya', name: 'تأمین آریا', price: '۳۲٬۸۰۰٬۰۰۰', delivery: '۳ روز', quality: '۹۸٪', selected: true },
	{ id: 'pars', name: 'پارس‌تأمین', price: '۳۰٬۹۰۰٬۰۰۰', delivery: '۸ روز', quality: '۸۷٪', selected: false },
	{ id: 'novin', name: 'تدارک نوین', price: '۳۴٬۱۰۰٬۰۰۰', delivery: '۲ روز', quality: '۹۶٪', selected: false },
] as const;

export const procurementChapters: readonly ProcurementChapter[] = [
	{
		id: 'purchase-need', label: 'نیاز', eyebrow: 'پرونده‌ی خرید · ۰۱ / ۰۶',
		title: 'یک کمبود،\nیک سؤال.',
		description: 'درخواست ۸۰ قطعه ثبت شده؛ اما فقط ۲۴ عدد در دسترس است. پیش از سفارش، باید بفهمیم چه مقدار و با چه اولویتی لازم داریم.',
		detail: 'نیاز واقعی را از دل درخواست و موجودی پیدا کن.',
	},
	{
		id: 'purchase-quotes', label: 'استعلام', eyebrow: 'دعوت به تأمین · ۰۲ / ۰۶',
		title: 'یک درخواست؛\nچند پاسخ.',
		description: 'استعلام برای تأمین‌کنندگان می‌رود و قیمت، زمان تحویل و کیفیت پیشنهادی کنار هم قرار می‌گیرند.',
		detail: 'پیشنهادها به همان نیاز اولیه وصل می‌مانند.',
	},
	{
		id: 'purchase-decision', label: 'انتخاب', eyebrow: 'مقایسه‌ی پیشنهادها · ۰۳ / ۰۶',
		title: 'ارزان‌ترین،\nهمیشه مناسب‌ترین نیست.',
		description: 'قیمت را کنار موعد تحویل و سابقه‌ی کیفیت ببین؛ بعد با معیارهای روشن تأمین‌کننده را انتخاب کن.',
		detail: 'تصمیم خرید، قابل‌توضیح و قابل‌پیگیری است.',
	},
	{
		id: 'purchase-order', label: 'سفارش', eyebrow: 'تعهد خرید · ۰۴ / ۰۶',
		title: 'انتخاب، به سفارش\nتبدیل می‌شود.',
		description: 'تأمین‌کننده، اقلام، قیمت توافق‌شده و موعد تحویل در سفارش خرید ثبت می‌شوند؛ همان سند مبنای پیگیری بعدی است.',
		detail: 'از تأیید تا تحویل، سفارش گم نمی‌شود.',
	},
	{
		id: 'purchase-receipt', label: 'دریافت', eyebrow: 'ورود کالا · ۰۵ / ۰۶',
		title: 'رسیدن کالا،\nپایان کار نیست.',
		description: 'مقدار دریافتی با سفارش سنجیده می‌شود و بازرسی کیفیت مشخص می‌کند چه چیزی آماده‌ی ورود به موجودی است.',
		detail: 'مغایرت یا کالای در انتظار بررسی پنهان نمی‌ماند.',
	},
	{
		id: 'purchase-match', label: 'تطبیق', eyebrow: 'تصویر کامل خرید · ۰۶ / ۰۶',
		title: 'سفارش، رسید،\nفاکتور؛ یک تصویر.',
		description: 'اسناد سه‌طرفه را تطبیق بده، مبلغ قابل‌پرداخت و موارد اختلاف را ببین و خرید را به انبار و مالی وصل کن.',
		detail: 'آسومی؛ خریدی که از نیاز تا تسویه روشن می‌ماند.',
	},
];

export type ProcurementPaper = {
	id: string;
	source: string;
	title: string;
	description: string;
	fields: readonly { label: string; value: string }[];
	path: string;
	stamp: string;
};

export type ProcurementFeatureBoard = {
	id: string;
	number: string;
	title: string;
	description: string;
	connector: string;
	papers: readonly ProcurementPaper[];
};

export const procurementFeatureBoards: readonly ProcurementFeatureBoard[] = [
	{
		id: 'demand', number: '۰۱', title: 'نیاز، موجودی و برنامه',
		description: 'قبل از خرید، درخواست‌ها و کمبودها را به یک اولویت قابل‌اقدام تبدیل کن.',
		connector: 'نیاز تأییدشده و مقدار قابل‌تأمین، به استعلام خرید می‌رسد.',
		papers: [
			{ id: 'request', source: 'Material Request', title: 'درخواست مواد و خرید', description: 'درخواست جدید را ثبت کن و نوع، قلم، مقدار و تاریخ نیاز را مشخص نگه دار.', fields: [{ label: 'شروع', value: 'ثبت درخواست' }, { label: 'اقدام', value: 'بررسی و تأیید' }], path: '/material-requests?new=1', stamp: 'نیاز خرید' },
			{ id: 'inbox', source: 'Material Request Workspace', title: 'مرکز درخواست‌ها', description: 'درخواست‌های باز، موجودی و نیازهای هم‌قلم را کنار هم مرور کن.', fields: [{ label: 'نمایش', value: 'درخواست‌های باز' }, { label: 'تصمیم', value: 'تجمیع یا اقدام' }], path: '/material-requests?workspace=1', stamp: 'کارتابل نیاز' },
			{ id: 'planning', source: 'Purchase Planning', title: 'برنامه‌ریزی خرید', description: 'برنامه‌ی تأمین را با تقاضا، ظرفیت و زمان موردنیاز هماهنگ کن.', fields: [{ label: 'ورودی', value: 'تقاضا و کمبود' }, { label: 'خروجی', value: 'پیشنهاد خرید' }], path: '/procurement/planning', stamp: 'برنامه‌ی تأمین' },
			{ id: 'budget', source: 'Purchase Budget', title: 'کنترل بودجه', description: 'پیش از تعهد خرید، وضعیت بودجه و نیاز به تأیید را بررسی کن.', fields: [{ label: 'کنترل', value: 'بودجه‌ی خرید' }, { label: 'پیگیری', value: 'تأیید و انحراف' }], path: '/procurement/budget', stamp: 'کنترل پیش از سفارش' },
		],
	},
	{
		id: 'sourcing', number: '۰۲', title: 'استعلام و انتخاب تأمین‌کننده',
		description: 'پیشنهادها را از حالت پراکنده بیرون بیاور و با معیارهای روشن مقایسه کن.',
		connector: 'پیشنهاد منتخب، با شرایط توافق‌شده به سفارش خرید تبدیل می‌شود.',
		papers: [
			{ id: 'rfq', source: 'Request for Quotation', title: 'استعلام قیمت', description: 'اقلام و شرایط موردنیاز را برای تأمین‌کنندگان واجدشرایط ارسال کن.', fields: [{ label: 'اقلام', value: 'کالا و مقدار' }, { label: 'شرایط', value: 'قیمت و موعد' }], path: '/procurement/rfq', stamp: 'دعوت به پیشنهاد' },
			{ id: 'supplier-quotes', source: 'Supplier Quotation', title: 'پیشنهادهای تأمین‌کنندگان', description: 'قیمت، اعتبار زمانی و شرایط هر پیشنهاد را در پرونده‌ی خرید نگه دار.', fields: [{ label: 'منبع', value: 'پیشنهاد تأمین' }, { label: 'ادامه', value: 'مقایسه‌ی هم‌زمان' }], path: '/procurement/supplier-quotations', stamp: 'پیشنهاد دریافتی' },
			{ id: 'comparison', source: 'Quotation Comparison', title: 'مقایسه‌ی پیشنهادها', description: 'قیمت، موعد تحویل و امتیازها را کنار هم ببین؛ فقط با کمترین قیمت تصمیم نگیر.', fields: [{ label: 'معیار', value: 'قیمت و تحویل' }, { label: 'معیار', value: 'امتیاز و کیفیت' }], path: '/procurement/quotation-comparison', stamp: 'تصمیم مستند' },
			{ id: 'supplier-evaluation', source: 'Supplier Evaluation', title: 'ارزیابی تأمین‌کننده', description: 'عملکرد و معیارهای ارزیابی را برای انتخاب‌های بعدی در دسترس داشته باش.', fields: [{ label: 'سنجش', value: 'عملکرد تأمین' }, { label: 'ادامه', value: 'کارت امتیازی' }], path: '/procurement/evaluation', stamp: 'کیفیت همکاری' },
		],
	},
	{
		id: 'orders', number: '۰۳', title: 'سفارش و پیگیری تعهد',
		description: 'بعد از انتخاب، توافق را به تعهدی تبدیل کن که تا زمان تحویل قابل‌ردیابی است.',
		connector: 'سفارش باز، در زمان دریافت با مقدار واقعی کالا سنجیده می‌شود.',
		papers: [
			{ id: 'purchase-order', source: 'Purchase Order', title: 'سفارش خرید', description: 'تأمین‌کننده، اقلام، قیمت و موعد توافق‌شده را در سند سفارش ثبت کن.', fields: [{ label: 'وضعیت', value: 'باز / تأییدشده' }, { label: 'گام بعد', value: 'پیگیری تحویل' }], path: '/procurement/orders', stamp: 'تعهد خرید' },
			{ id: 'contract', source: 'Purchase Contract', title: 'قراردادهای خرید', description: 'شرایط توافق بلندمدت و تعهدهای خرید را کنار سفارش نگه دار.', fields: [{ label: 'شرایط', value: 'چارچوب توافق' }, { label: 'پیوند', value: 'تأمین و سفارش' }], path: '/procurement/contracts', stamp: 'شرایط همکاری' },
			{ id: 'tracking', source: 'Purchase Order Tracking', title: 'پیگیری سفارش', description: 'موعد، وضعیت تحویل و سفارش‌های در انتظار را از یک مسیر دنبال کن.', fields: [{ label: 'زمان', value: 'موعد تحویل' }, { label: 'هشدار', value: 'تأخیر یا مغایرت' }], path: '/procurement/tracking', stamp: 'تعهد باز' },
			{ id: 'shipping', source: 'Inbound Shipping', title: 'حمل و هزینه‌های ورودی', description: 'اطلاعات حمل و هزینه‌های رسیدن کالا به انبار را به پرونده‌ی تأمین پیوند بده.', fields: [{ label: 'مسیر', value: 'حمل ورودی' }, { label: 'هزینه', value: 'هزینه‌های جانبی' }], path: '/procurement/shipping', stamp: 'در مسیر دریافت' },
		],
	},
	{
		id: 'receiving', number: '۰۴', title: 'دریافت، کیفیت و مغایرت',
		description: 'رسیدن محموله را با سفارش مقایسه کن؛ کالای نیازمند بررسی را از مقدار پذیرفته‌شده جدا ببین.',
		connector: 'مقدار پذیرفته‌شده به موجودی می‌رود؛ اختلاف، برای پیگیری باقی می‌ماند.',
		papers: [
			{ id: 'receipt', source: 'Purchase Receipt', title: 'رسید خرید', description: 'مقدار تحویل‌شده و انبار مقصد را در ادامه‌ی سفارش خرید ثبت کن.', fields: [{ label: 'مرجع', value: 'سفارش خرید' }, { label: 'ثبت', value: 'مقدار دریافتی' }], path: '/purchase-receipt-list', stamp: 'ورود به انبار' },
			{ id: 'quality', source: 'Quality Inspection', title: 'کنترل کیفیت ورودی', description: 'نتیجه‌ی بازرسی و وضعیت اقلام پذیرفته یا نیازمند بررسی را پیگیری کن.', fields: [{ label: 'کنترل', value: 'معیار پذیرش' }, { label: 'نتیجه', value: 'قبول یا پیگیری' }], path: '/procurement/quality', stamp: 'بازرسی کالا' },
			{ id: 'returns', source: 'Purchase Return', title: 'مرجوعی خرید', description: 'مغایرت یا کالای برگشتی را در امتداد دریافت و تأمین‌کننده دنبال کن.', fields: [{ label: 'دلیل', value: 'مغایرت یا عیب' }, { label: 'پیگیری', value: 'برگشت و مطالبه' }], path: '/procurement/returns', stamp: 'رسیدگی به اختلاف' },
			{ id: 'subcontracting', source: 'Subcontracting Inward Order', title: 'دریافت پیمانکاری', description: 'ورود مواد و پیگیری تحویل در جریان‌های خرید پیمانکاری را مدیریت کن.', fields: [{ label: 'جریان', value: 'مواد پیمانکاری' }, { label: 'ادامه', value: 'دریافت خروجی' }], path: '/procurement/subcontracting/inward-orders', stamp: 'تأمین تخصصی' },
		],
	},
	{
		id: 'finance-control', number: '۰۵', title: 'فاکتور، تطبیق و تصویر خرید',
		description: 'ثبت دریافت کافی نیست؛ سندها، مبلغ پرداختنی و نشانه‌های عملکرد را یک‌جا بررسی کن.',
		connector: 'سند خرید به مالی و گزارش‌ها می‌رسد؛ هر بخش مرز کار خودش را حفظ می‌کند.',
		papers: [
			{ id: 'invoice', source: 'Purchase Invoice', title: 'فاکتور تأمین‌کننده', description: 'فاکتور را به سفارش و دریافت پیوند بده تا مبنای پرداخت روشن باشد.', fields: [{ label: 'مرجع', value: 'سفارش / رسید' }, { label: 'نتیجه', value: 'حساب پرداختنی' }], path: '/procurement/invoices', stamp: 'تعهد مالی' },
			{ id: 'three-way', source: 'Three-way Match', title: 'تطبیق سه‌طرفه', description: 'سفارش، رسید و فاکتور را مقایسه کن و اختلاف‌ها را پیش از تسویه پیدا کن.', fields: [{ label: 'سند اول', value: 'Purchase Order' }, { label: 'سندها', value: 'Receipt + Invoice' }], path: '/procurement/three-way', stamp: 'کنترل پیش از پرداخت' },
			{ id: 'payment', source: 'Supplier Payment', title: 'پرداخت تأمین‌کننده', description: 'وضعیت پرداخت و پیگیری تعهدهای مالی تأمین‌کننده را از مسیر مالی دنبال کن.', fields: [{ label: 'وضعیت', value: 'پرداختنی / تسویه' }, { label: 'پیوند', value: 'ماژول مالی' }], path: '/procurement/payments', stamp: 'ادامه در مالی' },
			{ id: 'reports', source: 'Purchase Reports / Control Tower', title: 'گزارش و برج کنترل', description: 'وضعیت سفارش‌های باز، استثناها و روندهای خرید را برای تصمیم بعدی ببین.', fields: [{ label: 'نمایش', value: 'شاخص‌های خرید' }, { label: 'تمرکز', value: 'اقدام بعدی' }], path: '/procurement/control-tower', stamp: 'تصویر مدیریت' },
		],
	},
];
