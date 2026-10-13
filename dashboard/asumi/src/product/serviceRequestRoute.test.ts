import { expect, test } from 'vitest';
import { buildServiceRequestHref } from './serviceRequestRoute';

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
});
