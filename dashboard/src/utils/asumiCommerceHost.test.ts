import { describe, expect, it } from 'vitest';
import { getAsumiBillingRedirect, isAsumiCommerceHost } from './asumiCommerceHost';

describe('Asumi legacy billing routing', () => {
	it.each(['/billing', '/billing/', '/billing/payment-methods', '/billing/invoices'])(
		'redirects %s on Asumi to its commerce orders page',
		(path) => {
			expect(getAsumiBillingRedirect('asumi.ir', path)).toEqual({
				name: 'Commerce Orders',
				replace: true,
			});
			expect(getAsumiBillingRedirect('www.asumi.ir', path)).toEqual({
				name: 'Commerce Orders',
				replace: true,
			});
		},
	);

	it('does not redirect unrelated routes or other Press installations', () => {
		expect(getAsumiBillingRedirect('asumi.ir', '/orders')).toBeNull();
		expect(getAsumiBillingRedirect('veederakht.ir', '/billing')).toBeNull();
		expect(getAsumiBillingRedirect('press.example.com', '/billing/invoices')).toBeNull();
	});

	it('matches the Asumi host without relying on letter casing', () => {
		expect(isAsumiCommerceHost('ASUMI.IR')).toBe(true);
		expect(getAsumiBillingRedirect('ASUMI.IR', '/billing')).toEqual({
			name: 'Commerce Orders',
			replace: true,
		});
	});
});
