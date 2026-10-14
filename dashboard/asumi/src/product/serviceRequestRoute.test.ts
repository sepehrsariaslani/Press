import { expect, test } from 'vitest';
import { buildAddonPurchaseHref, buildServiceRequestHref } from './serviceRequestRoute';

test('carries only selected module and addon IDs for a server-priced inquiry', () => {
	const href = buildServiceRequestHref(
		'module_pricing',
		'مبلغ دستکاری‌شده نباید در URL باشد',
		['finance', 'sales', '<script>'],
		['restaurantMenu'],
	);
	const url = new URL(href, 'https://asumi.ir');

	expect(url.pathname).toBe('/dashboard/orders');
	expect(url.searchParams.get('asumi_service_request')).toBe('1');
	expect(url.searchParams.get('service')).toBe('module_pricing');
	expect(url.searchParams.has('context')).toBe(false);
	expect(url.searchParams.get('modules')).toBe('finance,sales');
	expect(url.searchParams.get('addons')).toBe('restaurantMenu');
});

test('keeps the website-design context on its existing inquiry route', () => {
	const href = buildServiceRequestHref('website_design', 'ساخت وب‌سایت فروشگاهی');
	const url = new URL(href, 'https://asumi.ir');
	expect(url.searchParams.get('service')).toBe('website_design');
	expect(url.searchParams.get('context')).toBe('ساخت وب‌سایت فروشگاهی');
	expect(url.searchParams.has('modules')).toBe(false);
	expect(url.searchParams.has('addons')).toBe(false);
	expect(url.searchParams.has('asumi_service_purchase')).toBe(false);
});

test('marks a module pricing route for checkout without changing its selected IDs', () => {
	const href = buildServiceRequestHref('module_pricing', '', ['finance'], ['restaurantMenu'], 'purchase');
	const url = new URL(href, 'https://asumi.ir');
	expect(url.searchParams.get('asumi_service_purchase')).toBe('1');
	expect(url.searchParams.get('modules')).toBe('finance');
	expect(url.searchParams.get('addons')).toBe('restaurantMenu');
});

test('opens the site-scoped add-on checkout for signed-in users and sends guests through login', () => {
	const signedIn = new URL(buildAddonPurchaseHref('assistant_ai', true), 'https://asumi.ir');
	expect(signedIn.pathname).toBe('/dashboard/orders');
	expect(signedIn.searchParams.get('asumi_addon_purchase')).toBe('1');
	expect(signedIn.searchParams.get('addon_id')).toBe('assistant_ai');
	expect(signedIn.searchParams.has('price')).toBe(false);

	const guest = new URL(buildAddonPurchaseHref('internal_chat', false), 'https://asumi.ir');
	expect(guest.pathname).toBe('/hesab/login');
	const next = new URL(guest.searchParams.get('next') || '', 'https://asumi.ir');
	expect(next.pathname).toBe('/dashboard/orders');
	expect(next.searchParams.get('addon_id')).toBe('internal_chat');
});

test('rejects unknown add-on checkout identifiers', () => {
	expect(() => buildAddonPurchaseHref('unlisted', true)).toThrow(/افزونه/);
});
