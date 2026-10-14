export const MAX_ASUMI_SERVICE_PRICE_TOMAN = 1_000_000_000_000;
export const MIN_ASUMI_PAID_ADDON_PRICE_TOMAN = 10_000;

export const ASUMI_ACCOUNT_ADDON_CATALOG = [
	{ id: 'assistant_ai', title: 'دستیار هوش مصنوعی حسابیار' },
	{ id: 'internal_chat', title: 'چت سازمانی' },
] as const;

export type AsumiAddonId = typeof ASUMI_ACCOUNT_ADDON_CATALOG[number]['id'];
export type AsumiAddonOfferStatus = 'Unconfigured' | 'Free' | 'Paid' | 'Disabled';
export type AsumiAddonOffer = { status: AsumiAddonOfferStatus; monthly_price_toman: number };
export type AsumiAddonOffers = Record<AsumiAddonId, AsumiAddonOffer>;

export const ASUMI_SERVICE_PRICE_CATALOG = {
	modules: [
		{ id: 'finance', title: 'مالی و حسابداری' },
		{ id: 'sales', title: 'فروش' },
		{ id: 'crm', title: 'مدیریت ارتباط با مشتری' },
		{ id: 'procurement', title: 'خرید و تدارکات' },
		{ id: 'inventory', title: 'انبار و موجودی' },
		{ id: 'projects', title: 'مدیریت پروژه' },
		{ id: 'manufacturing', title: 'تولید' },
		{ id: 'quality', title: 'کنترل کیفیت' },
		{ id: 'people', title: 'منابع انسانی و حقوق' },
		{ id: 'assets', title: 'دارایی و نگهداری' },
		{ id: 'fleet', title: 'مدیریت ناوگان' },
		{ id: 'pricing', title: 'قیمت‌گذاری و بهای تمام‌شده' },
		{ id: 'growth', title: 'بازاریابی و رشد' },
		{ id: 'business', title: 'برنامه‌ریزی کسب‌وکار' },
		{ id: 'restaurant', title: 'فروش حضوری و رستوران' },
	],
	addons: [{ id: 'restaurantMenu', title: 'مدیریت منو و کاتالوگ' }],
	packages: [
		{ id: 'restaurant', title: 'فقط رستوران' },
		{ id: 'restaurantPurchasing', title: 'رستوران + خرید' },
		{ id: 'professional', title: 'حرفه‌ای' },
		{ id: 'completeWithoutMenu', title: 'همهٔ ماژول‌ها بدون مدیریت منو' },
		{ id: 'complete', title: 'همهٔ امکانات' },
	],
} as const;

export type AsumiServicePricing = {
	modules: Record<string, number>;
	addons: Record<string, number>;
	packages: Record<string, number>;
};

export function emptyAsumiAddonOffers(): AsumiAddonOffers {
	return Object.fromEntries(ASUMI_ACCOUNT_ADDON_CATALOG.map(({ id }) => [id, {
		status: 'Unconfigured', monthly_price_toman: 0,
	}])) as AsumiAddonOffers;
}

export function validateAsumiAddonOffers(value: unknown): AsumiAddonOffers {
	if (!isRecord(value)) throw new Error('تنظیمات فروش افزونه‌های حسابیار معتبر نیست.');
	const expectedIds = ASUMI_ACCOUNT_ADDON_CATALOG.map(({ id }) => id);
	if (Object.keys(value).length !== expectedIds.length || expectedIds.some(id => !Object.prototype.hasOwnProperty.call(value, id))) {
		throw new Error('شناسه‌های افزونه باید دقیقاً با کاتالوگ حسابیار برابر باشند.');
	}
	return Object.fromEntries(expectedIds.map(id => {
		const offer = value[id];
		if (!isRecord(offer) || Object.keys(offer).length !== 2 || !('status' in offer) || !('monthly_price_toman' in offer)) {
			throw new Error(`تنظیم افزونهٔ ${id} معتبر نیست.`);
		}
		const status = offer.status;
		if (!['Unconfigured', 'Free', 'Paid', 'Disabled'].includes(String(status))) {
			throw new Error(`وضعیت فروش افزونهٔ ${id} معتبر نیست.`);
		}
		const price = normalizeTomanPrice(offer.monthly_price_toman);
		if (status === 'Paid' && price < MIN_ASUMI_PAID_ADDON_PRICE_TOMAN) {
			throw new Error(`قیمت افزونهٔ پولی باید دست‌کم ${MIN_ASUMI_PAID_ADDON_PRICE_TOMAN.toLocaleString('fa-IR')} تومان باشد.`);
		}
		if (status === 'Free' && price !== 0) throw new Error('قیمت افزونهٔ رایگان باید صفر باشد.');
		return [id, { status: status as AsumiAddonOfferStatus, monthly_price_toman: price }];
	})) as AsumiAddonOffers;
}

export function buildAsumiAddonOffersPayload(value: unknown): { addon_offer_config: string } {
	return { addon_offer_config: JSON.stringify(validateAsumiAddonOffers(value)) };
}

export function emptyAsumiServicePricing(): AsumiServicePricing {
	return {
		modules: Object.fromEntries(ASUMI_SERVICE_PRICE_CATALOG.modules.map(({ id }) => [id, 0])),
		addons: Object.fromEntries(ASUMI_SERVICE_PRICE_CATALOG.addons.map(({ id }) => [id, 0])),
		packages: Object.fromEntries(ASUMI_SERVICE_PRICE_CATALOG.packages.map(({ id }) => [id, 0])),
	};
}

export function normalizeTomanPrice(value: unknown): number {
	if (typeof value === 'number') {
		if (Number.isSafeInteger(value) && value >= 0 && value <= MAX_ASUMI_SERVICE_PRICE_TOMAN) return value;
		throw new Error('مبلغ باید عدد صحیح نامنفی و حداکثر ۱٬۰۰۰٬۰۰۰٬۰۰۰٬۰۰۰ تومان باشد.');
	}
	if (typeof value !== 'string') throw new Error('مبلغ معتبر نیست.');
	const normalizedDigits = value.trim().replace(/[۰-۹٠-٩]/g, digit => {
		const code = digit.charCodeAt(0);
		return String(code >= 0x06f0 && code <= 0x06f9 ? code - 0x06f0 : code - 0x0660);
	});
	const compact = normalizedDigits.replace(/[\s,٬،]/g, '');
	if (!/^\d+$/.test(compact)) throw new Error('مبلغ باید عدد صحیح نامنفی باشد.');
	const amount = Number(compact);
	if (!Number.isSafeInteger(amount) || amount > MAX_ASUMI_SERVICE_PRICE_TOMAN) {
		throw new Error('مبلغ از سقف ۱٬۰۰۰٬۰۰۰٬۰۰۰٬۰۰۰ تومان بیشتر است.');
	}
	return amount;
}

export function validateAsumiServicePricing(value: unknown): AsumiServicePricing {
	if (!isRecord(value)) throw new Error('نقشهٔ تعرفهٔ خدمات آسومی معتبر نیست.');
	return {
		modules: validatePriceMap(value.modules, ASUMI_SERVICE_PRICE_CATALOG.modules.map(({ id }) => id)),
		addons: validatePriceMap(value.addons, ASUMI_SERVICE_PRICE_CATALOG.addons.map(({ id }) => id)),
		packages: validatePriceMap(value.packages, ASUMI_SERVICE_PRICE_CATALOG.packages.map(({ id }) => id)),
	};
}

export function buildAsumiServicePricingPayload(value: unknown) {
	const pricing = validateAsumiServicePricing(value);
	return {
		module_prices: JSON.stringify(pricing.modules),
		addon_prices: JSON.stringify(pricing.addons),
		package_prices: JSON.stringify(pricing.packages),
	};
}

function validatePriceMap(value: unknown, expectedIds: readonly string[]): Record<string, number> {
	if (!isRecord(value)) throw new Error('یکی از نقشه‌های تعرفه معتبر نیست.');
	const keys = Object.keys(value);
	if (keys.length !== expectedIds.length || expectedIds.some(id => !Object.prototype.hasOwnProperty.call(value, id))) {
		throw new Error('شناسه‌های تعرفه باید دقیقاً با کاتالوگ خدمات آسومی برابر باشند.');
	}
	return Object.fromEntries(expectedIds.map(id => [id, normalizeTomanPrice(value[id])]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
