import { productModules, type ProductModule } from '../modules';

export type ModuleId = ProductModule['id'];
export type PricingAddon = {
	id: string;
	moduleId: ModuleId;
	title: string;
	description: string;
};

export const pricingAddons = [
	{
		id: 'restaurantMenu',
		moduleId: 'restaurant',
		title: 'مدیریت منو و کاتالوگ',
		description: 'ساخت و نگهداری منو و فهرست محصولات',
	},
] as const satisfies readonly PricingAddon[];

export type PricingAddonId = (typeof pricingAddons)[number]['id'];

export type PricingPreset = {
	id: 'restaurant' | 'restaurantPurchasing' | 'professional' | 'completeWithoutMenu' | 'complete';
	title: string;
	description: string;
	moduleIds: readonly ModuleId[];
	addonIds: readonly PricingAddonId[];
	badge?: string;
};

export const pricingPresets: readonly PricingPreset[] = [
	{
		id: 'restaurant', title: 'فقط رستوران', description: 'عملیات رستوران، بدون افزونهٔ مدیریت منو',
		moduleIds: ['restaurant'], addonIds: [], badge: 'شروع ساده',
	},
	{
		id: 'restaurantPurchasing', title: 'رستوران + خرید', description: 'عملیات رستوران همراه با خرید و تدارکات',
		moduleIds: ['restaurant', 'procurement'], addonIds: [],
	},
	{
		id: 'professional', title: 'حرفه‌ای', description: '۱۱ ماژول برای فروش، خرید و عملیات',
		moduleIds: ['finance', 'sales', 'procurement', 'inventory', 'crm', 'projects', 'manufacturing', 'quality', 'people', 'assets', 'pricing'],
		addonIds: [], badge: 'بستهٔ پیشنهادی',
	},
	{
		id: 'completeWithoutMenu', title: 'همهٔ ماژول‌ها بدون مدیریت منو', description: 'تمام ۱۵ ماژول، بدون افزونهٔ منو',
		moduleIds: productModules.map(module => module.id), addonIds: [], badge: 'بدون افزونهٔ منو',
	},
	{
		id: 'complete', title: 'همهٔ امکانات', description: 'تمام ۱۵ ماژول به‌همراه مدیریت منو',
		moduleIds: productModules.map(module => module.id), addonIds: ['restaurantMenu'], badge: 'همهٔ امکانات',
	},
];

export const pricingNotice = 'قیمت هر ماژول و افزونه ماهانه و جداگانه محاسبه می‌شود؛ تعداد کاربران و شرکت‌ها محدودیتی ندارد. مالیات ارزش افزوده، استقرار، آموزش و انتقال داده جداگانه محاسبه می‌شوند.';

export const modulePrerequisites: Readonly<Record<ModuleId, readonly ModuleId[]>> = {
	finance: [], sales: [], crm: [], procurement: [], inventory: [], projects: [],
	manufacturing: ['inventory'], quality: [], people: [], assets: ['finance'],
	fleet: [], pricing: [], growth: [], business: ['growth'], restaurant: [],
};
