import { productModules, type ProductModule } from '../modules';

export type PricingTierId = 'starter' | 'professional' | 'enterprise';

export type PricingTier = {
	id: PricingTierId;
	title: string;
	fit: string;
	monthlyPrice: number;
	userLimit: number;
	includedModuleIds: readonly ProductModule['id'][];
	perks: readonly string[];
	recommended?: boolean;
};

export const pricingTiers: readonly PricingTier[] = [
	{
		id: 'starter', title: 'پایه', fit: 'برای شروع منظم و سبک', monthlyPrice: 3_900_000, userLimit: 3,
		includedModuleIds: ['finance', 'sales', 'procurement', 'inventory'],
		perks: ['مالی، فروش، خرید و انبار', 'یک شرکت', 'تا ۳ کاربر'],
	},
	{
		id: 'professional', title: 'حرفه‌ای', fit: 'برای کسب‌وکار در حال رشد', monthlyPrice: 9_900_000, userLimit: 10,
		includedModuleIds: ['finance', 'sales', 'procurement', 'inventory', 'crm', 'projects', 'manufacturing', 'quality', 'people', 'assets', 'pricing'],
		perks: ['۱۱ ماژول تا تولید و دارایی', 'یک شرکت', 'تا ۱۰ کاربر'], recommended: true,
	},
	{
		id: 'enterprise', title: 'سازمانی', fit: 'برای عملیات چندبخشی', monthlyPrice: 24_900_000, userLimit: 25,
		includedModuleIds: productModules.map(module => module.id),
		perks: ['هر ۱۵ ماژول آسومی', 'یک شرکت', 'تا ۲۵ کاربر'],
	},
];

export const moduleAddonPrices: Readonly<Record<ProductModule['id'], number>> = {
	finance: 0, sales: 0, crm: 490_000, procurement: 0, inventory: 0, projects: 690_000,
	manufacturing: 1_290_000, quality: 490_000, people: 790_000, assets: 690_000,
	fleet: 690_000, pricing: 590_000, growth: 690_000, business: 790_000, restaurant: 990_000,
};

export const pricingNotice = 'بسته‌ها و افزونه‌ها ماهانه، به تومان و برای یک شرکت تا سقف کاربران درج‌شده هستند. مالیات ارزش افزوده، استقرار، آموزش و انتقال داده جداگانه محاسبه می‌شوند.';

export const modulePrerequisites: Readonly<Record<ProductModule['id'], readonly ProductModule['id'][]>> = {
	finance: [], sales: [], crm: [], procurement: [], inventory: [], projects: [],
	manufacturing: ['inventory'], quality: [], people: [], assets: ['finance'],
	fleet: [], pricing: [], growth: [], business: ['growth'], restaurant: [],
};
