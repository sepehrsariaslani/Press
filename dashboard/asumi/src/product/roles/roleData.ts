export type RoleDashboard = {
	id: string;
	label: string;
	description: string;
	moduleIds: readonly string[];
	entryPath?: string;
};

export const roleDashboards: readonly RoleDashboard[] = [
	{
		id: 'executive', label: 'مدیر کسب‌وکار',
		description: 'نمای مدیریتی و کارهای نیازمند توجه را از یک نقطه دنبال کن.',
		moduleIds: ['finance', 'sales', 'inventory', 'projects'], entryPath: '/manager-dashboard',
	},
	{
		id: 'finance', label: 'مدیر مالی',
		description: 'سندها، دریافت‌ها و گزارش‌های مالی را در محیط واقعی حسابیار ببین.',
		moduleIds: ['finance', 'sales', 'procurement'],
	},
	{
		id: 'sales', label: 'مدیر فروش',
		description: 'مشتری، فرصت، سفارش و وضعیت تحویل را در مسیر واقعی فروش مرور کن.',
		moduleIds: ['sales', 'crm', 'inventory', 'finance'],
	},
	{
		id: 'inventory', label: 'مدیر انبار',
		description: 'صفحه‌های موجودی، رسید و گردش کالا را در سامانه‌ی آسومی ببین.',
		moduleIds: ['inventory', 'procurement', 'sales', 'quality'],
	},
	{
		id: 'operations', label: 'مدیر عملیات',
		description: 'برنامه‌ی تولید، مواد و کنترل کیفیت را در محیط واقعی دنبال کن.',
		moduleIds: ['manufacturing', 'inventory', 'procurement', 'quality'],
	},
	{
		id: 'people', label: 'مدیر منابع انسانی',
		description: 'کارکرد، درخواست‌ها و مسیرهای منابع انسانی را در Accounts مشاهده کن.',
		moduleIds: ['people', 'projects', 'finance'],
	},
	{
		id: 'procurement', label: 'مدیر خرید',
		description: 'درخواست‌های خرید، تأمین و دریافت کالا را در صفحه‌ی واقعی خرید ببین.',
		moduleIds: ['procurement', 'inventory', 'finance', 'pricing'],
	},
	{
		id: 'projects', label: 'مدیر پروژه',
		description: 'پروژه‌ها، وظایف تیم و ثبت زمان را در محیط واقعی مدیریت پروژه ببین.',
		moduleIds: ['projects', 'people', 'finance', 'business'],
	},
	{
		id: 'growth', label: 'مدیر بازاریابی',
		description: 'کمپین‌ها، سرنخ‌ها و مسیر رشد را در صفحه‌های واقعی سامانه مرور کن.',
		moduleIds: ['growth', 'crm', 'sales', 'business'],
	},
	{
		id: 'restaurant', label: 'مدیر رستوران',
		description: 'سفارش، صندوق و مسیرهای عملیاتی رستوران را در خود آسومی ببین.',
		moduleIds: ['restaurant', 'inventory', 'finance', 'sales'],
	},
	{
		id: 'maintenance', label: 'مسئول نگهداری و ناوگان',
		description: 'صفحه‌های دارایی، سرویس و ناوگان را در محیط واقعی باز کن.',
		moduleIds: ['assets', 'fleet', 'inventory', 'finance', 'quality'],
	},
];
