import { describe, expect, it } from 'vitest';
import { selectMarketplacePlans } from './marketplacePlanSelection';

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
