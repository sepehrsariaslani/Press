import { describe, expect, it } from 'vitest';
import {
	ASUMI_SERVICE_PRICE_CATALOG,
	buildAsumiServicePricingPayload,
	normalizeTomanPrice,
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
});
