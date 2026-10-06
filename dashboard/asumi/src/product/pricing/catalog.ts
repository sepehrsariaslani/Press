import { productModules, type ProductModule } from '../modules';

export type ModuleId = ProductModule['id'];
export type PricingAddon = {
	id: string;
	moduleId: ModuleId;
	title: string;
	description: string;
	monthlyPrice: number;
};

export const pricingAddons = [
	{
		id: 'restaurantMenu',
		moduleId: 'restaurant',
		title: 'مدیریت منو و کاتالوگ',
		description: 'ساخت و نگهداری منو و فهرست محصولات',
		monthlyPrice: 2_500_000,
	},
] as const satisfies readonly PricingAddon[];

export type PricingAddonId = (typeof pricingAddons)[number]['id'];

export type PricingPreset = {
	id: 'restaurant' | 'restaurantPurchasing' | 'professional' | 'completeWithoutMenu' | 'complete';
	title: string;
	description: string;
	moduleIds: readonly ModuleId[];
	addonIds: readonly PricingAddonId[];
	packageMonthlyPrice?: number;
	badge?: string;
};

export const moduleAddonPrices: Readonly<Record<ModuleId, number>> = {
	finance: 5_500_000,
	sales: 5_500_000,
	crm: 2_500_000,
	procurement: 6_000_000,
	inventory: 6_000_000,
	projects: 3_200_000,
	manufacturing: 5_500_000,
	quality: 2_500_000,
	people: 3_600_000,
	assets: 3_200_000,
	fleet: 3_200_000,
	pricing: 3_000_000,
	growth: 3_500_000,
	business: 3_800_000,
	restaurant: 6_500_000,
};

export const pricingAddonPrices = Object.fromEntries(pricingAddons.map(addon => [addon.id, addon.monthlyPrice])) as Record<PricingAddonId, number>;

export const completeModulesPackagePrice = 47_500_000;

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
		addonIds: [], packageMonthlyPrice: 9_900_000, badge: 'بستهٔ پیشنهادی',
	},
	{
		id: 'completeWithoutMenu', title: 'همهٔ ماژول‌ها بدون مدیریت منو', description: 'تمام ۱۵ ماژول، بدون افزونهٔ منو',
		moduleIds: productModules.map(module => module.id), addonIds: [], badge: 'بدون افزونهٔ منو',
	},
	{
		id: 'complete', title: 'همهٔ امکانات', description: 'تمام ۱۵ ماژول به‌همراه مدیریت منو',
		moduleIds: productModules.map(module => module.id), addonIds: ['restaurantMenu'], badge: '۵۰ میلیون تومان در ماه',
	},
];

export const pricingNotice = 'قیمت هر ماژول و افزونه ماهانه و جداگانه محاسبه می‌شود؛ تعداد کاربران و شرکت‌ها محدودیتی ندارد. بستهٔ حرفه‌ای ۱۱ ماژول را با تعرفهٔ ماهانهٔ ۹٬۹۰۰٬۰۰۰ تومان ارائه می‌کند و برای ترکیب همهٔ ماژول‌ها نیز تخفیف بستهٔ کامل اعمال می‌شود. مالیات ارزش افزوده، استقرار، آموزش و انتقال داده جداگانه محاسبه می‌شوند. ثبت درخواست خرید، فاکتور یا پرداخت نیست و برای هماهنگی راه‌اندازی بررسی می‌شود.';

export const modulePrerequisites: Readonly<Record<ModuleId, readonly ModuleId[]>> = {
	finance: [], sales: [], crm: [], procurement: [], inventory: [], projects: [],
	manufacturing: ['inventory'], quality: [], people: [], assets: ['finance'],
	fleet: [], pricing: [], growth: [], business: ['growth'], restaurant: [],
};
