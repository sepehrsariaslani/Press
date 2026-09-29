import { productModules, type ProductModule } from '../modules';

export type ModuleId = ProductModule['id'];
export type PricingAddonId = 'restaurantMenu';

export type PricingPreset = {
	id: 'restaurant' | 'restaurantPurchasing' | 'completeWithoutMenu' | 'complete';
	title: string;
	description: string;
	moduleIds: readonly ModuleId[];
	addonIds: readonly PricingAddonId[];
	badge?: string;
};

export const moduleAddonPrices: Readonly<Record<ModuleId, number>> = {
	finance: 5_000_000,
	sales: 5_000_000,
	crm: 1_800_000,
	procurement: 5_000_000,
	inventory: 5_000_000,
	projects: 2_500_000,
	manufacturing: 4_700_000,
	quality: 1_800_000,
	people: 2_900_000,
	assets: 2_500_000,
	fleet: 2_500_000,
	pricing: 2_200_000,
	growth: 2_500_000,
	business: 2_900_000,
	restaurant: 2_200_000,
};

export const pricingAddonPrices: Readonly<Record<PricingAddonId, number>> = {
	restaurantMenu: 1_500_000,
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
		id: 'completeWithoutMenu', title: 'همهٔ ماژول‌ها بدون مدیریت منو', description: 'تمام ۱۵ ماژول، بدون افزونهٔ منو',
		moduleIds: productModules.map(module => module.id), addonIds: [], badge: 'بدون افزونهٔ منو',
	},
	{
		id: 'complete', title: 'همهٔ امکانات', description: 'تمام ۱۵ ماژول به‌همراه مدیریت منو',
		moduleIds: productModules.map(module => module.id), addonIds: ['restaurantMenu'], badge: '۵۰ میلیون تومان در ماه',
	},
];

export const pricingNotice = 'هر ماژول و افزونه با تعرفهٔ ماهانهٔ مشخص و به تومان جداگانه انتخاب می‌شود؛ تعداد کاربران و شرکت‌ها محدودیتی ندارد. مالیات ارزش افزوده، استقرار، آموزش و انتقال داده جداگانه محاسبه می‌شوند. ثبت درخواست خرید، فاکتور یا پرداخت نیست و برای هماهنگی راه‌اندازی بررسی می‌شود.';

export const modulePrerequisites: Readonly<Record<ModuleId, readonly ModuleId[]>> = {
	finance: [], sales: [], crm: [], procurement: [], inventory: [], projects: [],
	manufacturing: ['inventory'], quality: [], people: [], assets: ['finance'],
	fleet: [], pricing: [], growth: [], business: ['growth'], restaurant: [],
};
