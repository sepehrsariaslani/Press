import { productModules } from '../modules';
import { pricingAddons, pricingPresets, type ModuleId, type PricingAddonId } from './catalog';

const MAX_SERVICE_PRICE_TOMAN = 1_000_000_000_000;
const endpoint = '/api/method/press.saas.commerce.api.service_pricing';
const checkoutStatusEndpoint = '/api/method/press.saas.commerce.api.checkout_status';

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
