import { describe, expect, it } from 'vitest';
import {
	ASUMI_ACCOUNT_ADDON_CATALOG,
	ASUMI_SERVICE_PRICE_CATALOG,
	buildAsumiAddonOffersPayload,
	buildAsumiServicePricingPayload,
	emptyAsumiAddonOffers,
	normalizeTomanPrice,
	validateAsumiAddonOffers,
	validateAsumiServicePricing,
} from './asumiServicePricing';

const pricing = {
	modules: Object.fromEntries(ASUMI_SERVICE_PRICE_CATALOG.modules.map(({ id }, index) => [id, index + 1])),
	addons: Object.fromEntries(ASUMI_SERVICE_PRICE_CATALOG.addons.map(({ id }, index) => [id, index + 101])),
	packages: Object.fromEntries(ASUMI_SERVICE_PRICE_CATALOG.packages.map(({ id }, index) => [id, index + 201])),
};

describe('Asumi service pricing admin data', () => {
	it('normalizes Persian digits and separators into integer toman amounts', () => {
		expect(normalizeTomanPrice('۱۲٬۳۴۵')).toBe(12345);
		expect(normalizeTomanPrice(' ۶,۰۰۰ ')).toBe(6000);
	});

	it('rejects negative, fractional, empty, and over-limit values', () => {
		for (const value of ['-1', '1.5', '', '۱٬۰۰۰٬۰۰۰٬۰۰۰٬۰۰۱']) {
			expect(() => normalizeTomanPrice(value)).toThrow();
		}
	});

	it('requires exactly the known IDs and validates every amount', () => {
		expect(validateAsumiServicePricing(pricing)).toEqual(pricing);
		expect(() => validateAsumiServicePricing({ ...pricing, modules: { finance: 1 } })).toThrow(/شناسه/);
		expect(() => validateAsumiServicePricing({ ...pricing, addons: { ...pricing.addons, unknown: 1 } })).toThrow(/شناسه/);
		expect(() => validateAsumiServicePricing({ ...pricing, packages: { ...pricing.packages, complete: 1_000_000_000_001 } })).toThrow(/مبلغ/);
	});

	it('converts validated maps into the three save endpoint arguments', () => {
		const payload = buildAsumiServicePricingPayload(pricing);
		expect(JSON.parse(payload.module_prices)).toEqual(pricing.modules);
		expect(JSON.parse(payload.addon_prices)).toEqual(pricing.addons);
		expect(JSON.parse(payload.package_prices)).toEqual(pricing.packages);
	});

	it('keeps account add-on offers separate from the legacy module and menu tariffs', () => {
		const offers = emptyAsumiAddonOffers();
		expect(Object.keys(offers)).toEqual(ASUMI_ACCOUNT_ADDON_CATALOG.map(({ id }) => id));
		expect(offers.assistant_ai).toEqual({ status: 'Unconfigured', monthly_price_toman: 0 });
		const changed = {
			...offers,
			assistant_ai: { status: 'Paid' as const, monthly_price_toman: 25_000 },
			internal_chat: { status: 'Free' as const, monthly_price_toman: 0 },
		};
		expect(validateAsumiAddonOffers(changed)).toEqual(changed);
		expect(JSON.parse(buildAsumiAddonOffersPayload(changed).addon_offer_config)).toEqual(changed);
		expect(pricing.addons).toEqual({ restaurantMenu: 101 });
	});

	it('rejects malformed add-on IDs, statuses, and prices', () => {
		const offers = emptyAsumiAddonOffers();
		expect(() => validateAsumiAddonOffers({ ...offers, unknown: offers.assistant_ai })).toThrow(/شناسه/);
		expect(() => validateAsumiAddonOffers({ ...offers, assistant_ai: { status: 'Paid', monthly_price_toman: 9_999 } })).toThrow(/دست‌کم/);
		expect(() => validateAsumiAddonOffers({ ...offers, assistant_ai: { status: 'Free', monthly_price_toman: 1 } })).toThrow(/صفر/);
		expect(() => validateAsumiAddonOffers({ ...offers, assistant_ai: { status: 'Paid', monthly_price_toman: 25_000.5 } })).toThrow(/صحیح/);
	});
});
