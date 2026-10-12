export type SalesBoardPaper = {
	id: string;
	source: string;
	title: string;
	description: string;
	fields: readonly { label: string; value: string }[];
	stamp?: string;
	path: string;
	chart?: {
		label: string;
		values: readonly number[];
	};
};

export type SalesBoardDestination = {
	module: string;
	description: string;
	path: string;
};

export type SalesFeatureBoard = {
	id: string;
	number: string;
	title: string;
	description: string;
	papers: readonly SalesBoardPaper[];
	connector: string;
	destinations: readonly SalesBoardDestination[];
};

export const salesFeatureBoards: readonly SalesFeatureBoard[] = [
	{
		id: 'customer-catalog',
		number: '۰۱',
		title: 'مشتری، کالا و شرایط',
		description: 'پیش از پیشنهاد، طرف معامله، چیزی که می‌فروشی و چارچوب توافق روی یک بورد قرار می‌گیرند.',
		papers: [
			{
				id: 'opportunity', source: 'CRM Lead / CRM Deal', title: 'پرونده‌ی فرصت',
				description: 'سرنخ، مرحله‌ی گفتگو و مسئول پیگیری را تا زمان آماده‌شدن درخواست قیمت دنبال کن.',
				fields: [{ label: 'مرحله', value: 'سرنخ ← فرصت' }, { label: 'گام بعد', value: 'پیگیری یا پیشنهاد' }],
				stamp: 'رابطه در CRM', path: '/crm/pipeline',
			},
			{
				id: 'customer', source: 'Customer', title: 'پرونده‌ی مشتری',
				description: 'مشخصات و نشانی‌های مشتری برای صورتحساب و ارسال کنار معامله می‌ماند.',
				fields: [{ label: 'دسته‌بندی', value: 'گروه مشتری' }, { label: 'نشانی', value: 'صورتحساب / ارسال' }],
				stamp: 'اطلاعات پایه', path: '/sales/setup-center',
			},
			{
				id: 'catalog', source: 'Item / Item Group / Product Bundle', title: 'کالا، خدمت و بسته',
				description: 'کالای قابل‌فروش، گروه‌بندی و بسته‌ی محصول را برای انتخاب در پیشنهاد آماده کن.',
				fields: [{ label: 'قلم', value: 'کالا یا خدمت' }, { label: 'ارائه', value: 'واحد یا بسته' }],
				stamp: 'کاتالوگ فروش', path: '/sales/setup-center',
			},
			{
				id: 'commercial-rules', source: 'Contract / Pricing Rule / Sales Partner', title: 'قواعد معامله',
				description: 'قرارداد، تخفیف، شرایط پرداخت و حمل را همراه شبکه‌ی فروش و قلمرو مشخص کن.',
				fields: [{ label: 'شرایط', value: 'قیمت و تخفیف' }, { label: 'شبکه', value: 'فروشنده و قلمرو' }],
				stamp: 'تنظیمات فروش', path: '/sales/setup-center',
			},
		],
		connector: 'پرونده‌ی مشتری + کالای انتخاب‌شده + شرایط فروش، به پیشنهاد قیمت می‌رسند.',
		destinations: [{ module: 'CRM', description: 'سرنخ و پیگیری رابطه با مشتری', path: '/crm/pipeline' }],
	},
	{
		id: 'sales-documents',
		number: '۰۲',
		title: 'گردش اسناد فروش',
		description: 'پیشنهاد، تأیید مشتری و سندهای معامله به هم وصل می‌شوند؛ هر کاغذ ادامه‌ی همان پرونده است.',
		papers: [
			{
				id: 'quotation', source: 'Quotation', title: 'پیش‌فاکتور',
				description: 'قلم، تعداد، قیمت و شرایط توافق را به شکل پیشنهاد قابل‌ارسال ثبت کن.',
				fields: [{ label: 'محتوا', value: 'کالا × تعداد' }, { label: 'شرایط', value: 'قیمت، تخفیف، تحویل' }],
				stamp: 'پیشنهاد قیمت', path: '/sales/invoice-entry',
			},
			{
				id: 'sales-order', source: 'Sales Order', title: 'سفارش فروش',
				description: 'پس از تأیید، تعهد فروش و مقدار باقی‌مانده برای انجام سفارش را نگه دار.',
				fields: [{ label: 'وضعیت', value: 'تأیید مشتری' }, { label: 'ادامه', value: 'آماده‌سازی سفارش' }],
				stamp: 'سفارش نمونه', path: '/sales-orders',
			},
			{
				id: 'blanket-order', source: 'Blanket Order', title: 'توافق فروش دوره‌ای',
				description: 'برای توافق‌های بلندمدت، چارچوب سفارش و مقدار موردانتظار را در دسترس داشته باش.',
				fields: [{ label: 'بازه', value: 'دوره‌ی توافق' }, { label: 'تعهد', value: 'مقدار برنامه‌ریزی‌شده' }],
				stamp: 'توافق تجاری', path: '/sales/blanket-orders',
			},
			{
				id: 'sales-invoice', source: 'Sales Invoice / Sales Return', title: 'فاکتور و برگشت فروش',
				description: 'فاکتور معامله و در صورت نیاز برگشت فروش را در امتداد سفارش ثبت و پیگیری کن.',
				fields: [{ label: 'سند', value: 'فاکتور فروش' }, { label: 'اصلاح', value: 'برگشت از فروش' }],
				stamp: 'دریافت وجه در مالی', path: '/sales/invoice-entry',
			},
		],
		connector: 'با تأیید سفارش، پرونده از ثبت تجاری به آماده‌سازی، تحویل و پیگیری مالی می‌رود.',
		destinations: [{ module: 'مالی', description: 'ثبت دریافت و تسویه‌ی وجه', path: '/modules/finance' }],
	},
	{
		id: 'fulfillment',
		number: '۰۳',
		title: 'آماده‌سازی و ارسال',
		description: 'سفارش تأییدشده از موجودی و برداشت کالا تا تحویل و رهگیری ارسال روی بورد عملیاتی می‌ماند.',
		papers: [
			{
				id: 'pick-list', source: 'Pick List', title: 'لیست برداشت',
				description: 'اقلام سفارش را برای برداشت از انبار و آماده‌سازی جمع کن.',
				fields: [{ label: 'مبدأ', value: 'انبار انتخاب‌شده' }, { label: 'مرحله', value: 'برداشت اقلام' }],
				stamp: 'آماده‌سازی', path: '/sales/pick-lists',
			},
			{
				id: 'delivery-note', source: 'Delivery Note', title: 'حواله‌ی تحویل',
				description: 'کالاهای تحویل‌شده را به سفارش پیوند بده تا مقدار انجام‌شده روشن باشد.',
				fields: [{ label: 'مرجع', value: 'سفارش فروش' }, { label: 'ثبت', value: 'مقدار تحویل' }],
				stamp: 'تحویل کالا', path: '/delivery-notes',
			},
			{
				id: 'shipment', source: 'Shipment', title: 'ارسال و رهگیری',
				description: 'وضعیت ارسال را ثبت کن تا مسیر کالا پس از تحویل از دید تیم پنهان نماند.',
				fields: [{ label: 'فرستنده', value: 'اطلاعات ارسال' }, { label: 'وضعیت', value: 'رهگیری مرسوله' }],
				stamp: 'در مسیر مشتری', path: '/sales/shipments',
			},
			{
				id: 'delivery-exceptions', source: 'Delivery Trip / Backorder / Sales Return', title: 'برنامه و موارد پیگیری',
				description: 'مسیر تحویل را برنامه‌ریزی کن و سفارش معوق یا برگشت را جداگانه دنبال کن.',
				fields: [{ label: 'برنامه', value: 'سفر و مسیر تحویل' }, { label: 'استثنا', value: 'معوق یا برگشتی' }],
				stamp: 'کنترل عملیات', path: '/sales/dispatch',
			},
		],
		connector: 'تحویل ثبت‌شده، وضعیت مشتری و وجه را برای پیگیری و گزارش به بورد پایانی می‌رساند.',
		destinations: [{ module: 'انبار', description: 'موجودی، برداشت و گردش کالا', path: '/modules/inventory' }],
	},
	{
		id: 'follow-up-insight',
		number: '۰۴',
		title: 'پیگیری، ارتباط و تصویر فروش',
		description: 'پس از ثبت سفارش هم جریان ادامه دارد: تیم پیگیری می‌کند، پیام می‌فرستد و تصویر عملکرد را می‌بیند.',
		papers: [
			{
				id: 'activities', source: 'CRM Task / CRM Call Log', title: 'پیگیری مشتری',
				description: 'تماس‌ها، فعالیت‌ها و قدم بعدی رابطه با مشتری را در CRM ثبت کن.',
				fields: [{ label: 'ارتباط', value: 'تماس و فعالیت' }, { label: 'گام بعد', value: 'پیگیری زمان‌دار' }],
				stamp: 'ادامه در CRM', path: '/crm/activities',
			},
			{
				id: 'sms', source: 'SMS Template / Send History', title: 'پیامک و تاریخچه‌ی ارسال',
				description: 'مشتری و قالب پیام را انتخاب کن، زمان‌بندی را ببین و سابقه‌ی ارسال را دنبال کن.',
				fields: [{ label: 'آماده‌سازی', value: 'قالب پیامک' }, { label: 'کنترل', value: 'زمان و تاریخچه' }],
				stamp: 'نیازمند اتصال sms.ir', path: '/sms-center',
			},
			{
				id: 'sales-operations', source: 'Sales Operations / Credit Control', title: 'کنترل عملیات فروش',
				description: 'کنترل اعتبار مشتری و سفارش، صندوق و نمای مدیریتی را از مرکز عملیات دنبال کن.',
				fields: [{ label: 'کنترل', value: 'اعتبار مشتری' }, { label: 'عملیات', value: 'صندوق و سفارش' }],
				stamp: 'مرکز کنترل فروش', path: '/sales/operations-center',
			},
			{
				id: 'dashboard', source: 'Sales Dashboard / Funnel / Reports', title: 'داشبورد و روندها',
				description: 'گزارش و قیف فروش را کنار وضعیت سفارش‌ها ببین و برای قدم بعدی تصمیم بگیر.',
				fields: [{ label: 'نمایش', value: 'روند فروش · نمونه' }, { label: 'تحلیل', value: 'قیف و گزارش' }],
				stamp: 'شاخص‌ها نمایشی‌اند', path: '/sales/operations-center',
				chart: { label: 'نمودار نمونه‌ی روند فروش، بدون داده‌ی زنده', values: [28, 40, 36, 56, 49, 72, 84] },
			},
		],
		connector: 'روند فروش، سندهای واقعی و اقدام بعدی را به یک تصمیم روشن وصل می‌کند.',
		destinations: [
			{ module: 'CRM', description: 'پیگیری رابطه و فعالیت‌ها', path: '/crm/activities' },
			{ module: 'مالی', description: 'ثبت دریافت و تسویه', path: '/modules/finance' },
		],
	},
] as const;

export const salesModuleBoundary = 'سرنخ و رابطه با مشتری در CRM، مقدار و جابه‌جایی کالا در انبار، و ثبت دریافت وجه در مالی ادامه پیدا می‌کند؛ این بوردها نشان می‌دهند هرکدام کجای پرونده‌ی فروش به هم می‌رسند.';
