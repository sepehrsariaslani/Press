export type IndustryPath = {
	id: string;
	title: string;
	label: string;
	intro: string;
	challenge: string;
	workflow: readonly string[];
	moduleIds: readonly string[];
};

export const industryPaths: readonly IndustryPath[] = [
	{
		id: 'manufacturing', label: 'تولید', title: 'تولید و مونتاژ',
		intro: 'نیاز مواد، برنامه‌ی ساخت و نتیجه‌ی تولید را در یک مسیر قابل‌پیگیری قرار بده.',
		challenge: 'از برنامه و BOM تا ثبت تولید و بررسی کیفیت',
		workflow: ['برنامه‌ریزی تولید', 'تأمین و رزرو مواد', 'دستورکار و کنترل کیفیت'],
		moduleIds: ['manufacturing', 'inventory', 'procurement', 'quality', 'finance'],
	},
	{
		id: 'distribution', label: 'پخش', title: 'پخش و توزیع',
		intro: 'سفارش مشتری را به موجودی، تحویل، دریافت و گزارش فروش وصل کن.',
		challenge: 'از ثبت سفارش تا تحویل و پیگیری مانده‌حساب',
		workflow: ['سفارش و قیمت', 'آماده‌سازی و تحویل', 'فاکتور و دریافت'],
		moduleIds: ['sales', 'crm', 'inventory', 'fleet', 'finance'],
	},
	{
		id: 'projects', label: 'خدمات و پروژه', title: 'خدمات پروژه‌محور',
		intro: 'وظایف، زمان و هزینه را به پیشرفت و نتیجه‌ی هر پروژه پیوند بده.',
		challenge: 'از تعریف کار تا سنجش پیشرفت و هزینه',
		workflow: ['پروژه و وظایف', 'ثبت زمان و هزینه', 'گزارش پیشرفت'],
		moduleIds: ['projects', 'finance', 'people', 'crm'],
	},
	{
		id: 'restaurant', label: 'رستوران', title: 'رستوران و فروش حضوری',
		intro: 'سفارش، صندوق، سالن و موجودی را در یک جریان کاری کنار هم بیاور.',
		challenge: 'از دریافت سفارش تا آماده‌سازی و جمع‌بندی فروش',
		workflow: ['ثبت سفارش و صندوق', 'آماده‌سازی و تحویل', 'موجودی و گزارش روز'],
		moduleIds: ['restaurant', 'inventory', 'finance', 'people'],
	},
	{
		id: 'commerce', label: 'بازرگانی', title: 'بازرگانی و فروش سازمانی',
		intro: 'مشتری، پیش‌فاکتور و سفارش را به کالا، خرید و وضعیت مالی متصل کن.',
		challenge: 'از پیگیری مشتری تا کنترل سفارش و حاشیه‌ی هزینه',
		workflow: ['مشتری و فرصت', 'قیمت و سفارش', 'تأمین، تحویل و مالی'],
		moduleIds: ['sales', 'crm', 'procurement', 'inventory', 'pricing', 'finance'],
	},
] as const;
