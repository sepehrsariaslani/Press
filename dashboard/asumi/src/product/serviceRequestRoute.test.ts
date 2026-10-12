import { expect, test } from 'vitest';
import { buildServiceRequestHref } from './serviceRequestRoute';

test('carries module selection and estimate context to the shared Asumi order center', () => {
	const href = buildServiceRequestHref(
		'module_pricing',
		'ماژول‌های انتخاب‌شده: مالی، فروش\nتعرفهٔ ماهانه: ۵٬۵۰۰٬۰۰۰ تومان',
		['finance', 'sales'],
	);
	const url = new URL(href, 'https://asumi.ir');

	expect(url.pathname).toBe('/dashboard/orders');
	expect(url.searchParams.get('asumi_service_request')).toBe('1');
	expect(url.searchParams.get('service')).toBe('module_pricing');
	expect(url.searchParams.get('context')).toBe('ماژول‌های انتخاب‌شده: مالی، فروش\nتعرفهٔ ماهانه: ۵٬۵۰۰٬۰۰۰ تومان');
	expect(url.searchParams.get('modules')).toBe('finance,sales');
});
