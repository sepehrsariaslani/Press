import { productModules } from '../modules';
import { pricingAddons, pricingPresets, type ModuleId, type PricingAddonId } from './catalog';

const MAX_SERVICE_PRICE_TOMAN = 1_000_000_000_000;
const endpoint = '/api/method/press.saas.commerce.api.service_pricing';
const checkoutStatusEndpoint = '/api/method/press.saas.commerce.api.checkout_status';
const addonCatalogEndpoint = '/api/method/press.saas.commerce.api.service_addon_catalog';
const MIN_PAID_ADDON_PRICE_TOMAN = 10_000;
const addonIds = new Set(['assistant_ai', 'internal_chat']);

export type SellableAddon = {
	id: 'assistant_ai' | 'internal_chat';
	title: string;
	status: 'Free' | 'Paid';
	monthly_price_toman: number;
};

export type ServicePriceMap = {
	modules: Record<ModuleId, number>;
	addons: Record<PricingAddonId, number>;
	packages: Record<(typeof pricingPresets)[number]['id'], number>;
};

export async function loadServicePrices(fetcher: typeof fetch = fetch): Promise<ServicePriceMap> {
	let response: Response;
	try {
		response = await fetcher(endpoint, { credentials: 'same-origin' });
	} catch {
		throw new Error('دریافت تعرفهٔ خدمات آسومی ممکن نشد. اتصال را بررسی و دوباره تلاش کن.');
	}
	if (!response.ok) throw new Error('دریافت قیمت‌های آسومی با خطا روبه‌رو شد.');

	let payload: unknown;
	try {
		payload = await response.json();
	} catch {
		throw new Error('پاسخ تعرفهٔ آسومی قابل خواندن نیست.');
	}
	const message = isRecord(payload) && 'message' in payload ? payload.message : payload;
	if (!isRecord(message)) throw new Error('نقشهٔ تعرفهٔ آسومی کامل نیست.');

	return {
		modules: validatePriceMap<ModuleId>(message.modules, productModules.map(module => module.id)),
		addons: validatePriceMap<PricingAddonId>(message.addons, pricingAddons.map(addon => addon.id)),
		packages: validatePriceMap<(typeof pricingPresets)[number]['id']>(message.packages, pricingPresets.map(preset => preset.id)),
	};
}

export async function loadServiceCheckoutStatus(fetcher: typeof fetch = fetch): Promise<boolean> {
	let response: Response;
	try {
		response = await fetcher(checkoutStatusEndpoint, { credentials: 'same-origin' });
	} catch {
		throw new Error('وضعیت ثبت سفارش آنلاین آسومی دریافت نشد.');
	}
	if (!response.ok) throw new Error('وضعیت ثبت سفارش آنلاین آسومی دریافت نشد.');
	let payload: unknown;
	try {
		payload = await response.json();
	} catch {
		throw new Error('وضعیت فروش آسومی قابل خواندن نیست.');
	}
	const message = isRecord(payload) && 'message' in payload ? payload.message : payload;
	if (!isRecord(message) || typeof message.services_enabled !== 'boolean') {
		throw new Error('وضعیت فروش خدمات آسومی معتبر نیست.');
	}
	return message.services_enabled;
}

export async function loadServiceAddonCatalog(fetcher: typeof fetch = fetch): Promise<SellableAddon[]> {
	let response: Response;
	try {
		response = await fetcher(addonCatalogEndpoint, { credentials: 'same-origin' });
	} catch {
		throw new Error('دریافت کاتالوگ افزونه‌های حسابیار ممکن نشد.');
	}
	if (!response.ok) throw new Error('کاتالوگ افزونه‌های حسابیار دریافت نشد.');
	let body: unknown;
	try {
		body = await response.json();
	} catch {
		throw new Error('پاسخ کاتالوگ افزونه‌ها قابل خواندن نیست.');
	}
	const message = isRecord(body) && 'message' in body ? body.message : body;
	if (!Array.isArray(message)) throw new Error('ساختار کاتالوگ افزونه‌ها معتبر نیست.');
	const seen = new Set<string>();
	const offers: SellableAddon[] = [];
	for (const row of message) {
		if (!isRecord(row) || typeof row.id !== 'string' || !addonIds.has(row.id) || seen.has(row.id)) {
			throw new Error('شناسهٔ افزونه در کاتالوگ معتبر نیست.');
		}
		seen.add(row.id);
		if (typeof row.title !== 'string' || !row.title.trim() || row.title.length > 120) {
			throw new Error('عنوان افزونه در کاتالوگ معتبر نیست.');
		}
		if (!['Unconfigured', 'Free', 'Paid', 'Disabled'].includes(String(row.status))) {
			throw new Error('وضعیت افزونه در کاتالوگ معتبر نیست.');
		}
		const price = row.monthly_price_toman;
		if (typeof price !== 'number' || !Number.isSafeInteger(price) || price < 0 || price > MAX_SERVICE_PRICE_TOMAN) {
			throw new Error('قیمت افزونه در کاتالوگ معتبر نیست.');
		}
		if (row.status === 'Paid' && price < MIN_PAID_ADDON_PRICE_TOMAN) throw new Error('قیمت افزونهٔ پولی کمتر از حد مجاز است.');
		if (row.status === 'Free' && price !== 0) throw new Error('افزونهٔ رایگان باید قیمت صفر داشته باشد.');
		if (row.status === 'Free' || row.status === 'Paid') {
			offers.push({ id: row.id as SellableAddon['id'], title: row.title.trim(), status: row.status, monthly_price_toman: price });
		}
	}
	return offers;
}

function validatePriceMap<Id extends string>(value: unknown, expectedIds: readonly Id[]): Record<Id, number> {
	if (!isRecord(value)) throw new Error('نقشهٔ تعرفه کامل نیست.');
	const actualIds = Object.keys(value);
	if (actualIds.length !== expectedIds.length || expectedIds.some(id => !Object.prototype.hasOwnProperty.call(value, id))) {
		throw new Error('شناسه‌های نقشهٔ تعرفه با کاتالوگ آسومی هم‌خوانی ندارند.');
	}
	const normalized = {} as Record<Id, number>;
	for (const id of expectedIds) {
		const amount = value[id];
		if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount < 0 || amount > MAX_SERVICE_PRICE_TOMAN) {
			throw new Error('مقدار یکی از تعرفه‌های آسومی معتبر نیست.');
		}
		normalized[id] = amount;
	}
	return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
