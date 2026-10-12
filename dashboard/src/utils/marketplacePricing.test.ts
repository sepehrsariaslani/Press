import { describe, expect, it } from 'vitest';
import { isPlanFreeForCurrency } from './marketplacePricing';

describe('marketplace app plan prices', () => {
	it('treats an INR-priced plan as paid for an INR team when USD is zero', () => {
		expect(isPlanFreeForCurrency({ price_inr: 1200, price_usd: 0 }, 'INR')).toBe(false);
	});

	it('treats a USD-priced plan as paid for a USD team when INR is zero', () => {
		expect(isPlanFreeForCurrency({ price_inr: 0, price_usd: 9 }, 'USD')).toBe(false);
	});
});
