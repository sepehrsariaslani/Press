import { describe, expect, it } from 'vitest';
import { marketplacePlanActionLabel, selectMarketplacePlans } from './marketplacePlanSelection';

describe('selectMarketplacePlans', () => {
	it('keeps every plan when the customer did not choose a specific app', () => {
		const plans = [{ app: 'accounts' }, { app: 'restaurant' }];

		expect(selectMarketplacePlans(plans, '')).toEqual(plans);
	});

	it('shows only plans for the app linked from the homepage', () => {
		const plans = [{ app: 'accounts', name: 'accounts-monthly' }, { app: 'restaurant', name: 'restaurant-monthly' }];

		expect(selectMarketplacePlans(plans, 'restaurant')).toEqual([plans[1]]);
	});

	it('does not offer another app when the requested app has no plan on this site', () => {
		const plans = [{ app: 'accounts', name: 'accounts-monthly' }];

		expect(selectMarketplacePlans(plans, 'restaurant')).toEqual([]);
	});
});

describe('marketplacePlanActionLabel', () => {
	it('makes a free new-app order explicitly confirm installation', () => {
		expect(marketplacePlanActionLabel({ asumi_checkout_supported: true, price_irr: 0, installation_required: true }))
			.toBe('ثبت سفارش رایگان و نصب');
	});

	it('makes paid new-app checkout explicitly confirm installation', () => {
		expect(marketplacePlanActionLabel({ asumi_checkout_supported: true, price_irr: 10000, installation_required: true }))
			.toBe('پرداخت و نصب');
	});

	it('keeps existing installed-app checkout labels', () => {
		expect(marketplacePlanActionLabel({ asumi_checkout_supported: true, price_irr: 0, installation_required: false }))
			.toBe('فعال‌سازی رایگان');
		expect(marketplacePlanActionLabel({ asumi_checkout_supported: true, price_irr: 10000, installation_required: false }))
			.toBe('ثبت سفارش و پرداخت');
	});
});
