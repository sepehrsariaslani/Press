import { describe, expect, it } from 'vitest';
import * as marketplacePricing from './marketplacePricing';
import { isPlanFreeForCurrency } from './marketplacePricing';

describe('marketplace app plan prices', () => {
	it('treats an INR-priced plan as paid for an INR team when USD is zero', () => {
		expect(
			isPlanFreeForCurrency({ price_inr: 1200, price_usd: 0 }, 'INR')
		).toBe(false);
	});

	it('treats a USD-priced plan as paid for a USD team when INR is zero', () => {
		expect(isPlanFreeForCurrency({ price_inr: 0, price_usd: 9 }, 'USD')).toBe(
			false
		);
	});

	it('provides a custom label only for plans that are free in the selected currency', () => {
		const getPlanLabel = marketplacePricing.marketplacePlanLabel;

		expect(getPlanLabel).toBeTypeOf('function');
		expect(getPlanLabel({ price_inr: 0, price_usd: 9 }, 'INR', 'رایگان')).toBe(
			'رایگان'
		);
		expect(
			getPlanLabel({ price_inr: 1200, price_usd: 0 }, 'INR', 'رایگان')
		).toBe('');
	});

	it('requires plan selection only when the plan is paid in the team currency', () => {
		const hasPaidPlan = marketplacePricing.hasPaidPlanForCurrency;

		expect(hasPaidPlan).toBeTypeOf('function');
		expect(hasPaidPlan([{ price_inr: 0, price_usd: 9 }], 'USD')).toBe(true);
		expect(hasPaidPlan([{ price_inr: 0, price_usd: 9 }], 'INR')).toBe(false);
	});

	it('does not require publisher teams to subscribe to their own paid app', () => {
		const requiresSelection = marketplacePricing.requiresMarketplaceAppPlanSelection;

		expect(requiresSelection).toBeTypeOf('function');
		expect(
			requiresSelection(
				{ team: 'publisher-team', plans: [{ price_inr: 100, price_usd: 10 }] },
				'USD',
				'publisher-team',
			),
		).toBe(false);
		expect(
			requiresSelection(
				{ team: 'another-team', plans: [{ price_inr: 100, price_usd: 10 }] },
				'USD',
				'publisher-team',
			),
		).toBe(true);
	});
});
