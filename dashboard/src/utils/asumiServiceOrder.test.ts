import { describe, expect, it } from 'vitest';
import {
	getAsumiServiceOrderLines,
	getAsumiAddonOrderDetails,
	getAsumiServiceOrderTitle,
	getAsumiServiceOrderTomanAmount,
	nextAsumiServiceDeliveryStatus,
} from './asumiServiceOrder';

describe('Asumi service order helpers', () => {
	it('shows the saved service title and Toman amount from a service order', () => {
		const order = {
			order_type: 'Asumi Service',
			service_title: 'بستهٔ حرفه‌ای',
			service_amount_toman: 9_900_000,
			service_quote_snapshot: JSON.stringify({
				lines: [{ id: 'finance', title: 'مالی و حسابداری', amount: 5_500_000 }],
			}),
		};

		expect(getAsumiServiceOrderTitle(order)).toBe('بستهٔ حرفه‌ای');
		expect(getAsumiServiceOrderTomanAmount(order)).toBe(9_900_000);
		expect(getAsumiServiceOrderLines(order)).toEqual(['مالی و حسابداری']);
	});

	it('preserves plan orders and rejects malformed service snapshots', () => {
		expect(getAsumiServiceOrderTitle({ order_type: 'Hosting', plan: 'basic' })).toBe('basic');
		expect(getAsumiServiceOrderLines({ order_type: 'Asumi Service', service_quote_snapshot: '{bad json' })).toEqual([]);
		expect(getAsumiServiceOrderTomanAmount({ order_type: 'Hosting', amount: 500 })).toBeNull();
	});

	it('offers only the next manual delivery step for a service order', () => {
		expect(nextAsumiServiceDeliveryStatus({ order_type: 'Asumi Service', status: 'Paid' })).toBe('Provisioning');
		expect(nextAsumiServiceDeliveryStatus({ order_type: 'Asumi Service', status: 'Provisioning' })).toBe('Active');
		expect(nextAsumiServiceDeliveryStatus({ order_type: 'Hosting', status: 'Paid' })).toBeNull();
		expect(nextAsumiServiceDeliveryStatus({ order_type: 'Asumi Service', status: 'Active' })).toBeNull();
	});

	it('shows the add-on and exact target site from the saved quote snapshot', () => {
		const order = {
			order_type: 'Asumi Service',
			service_quote_snapshot: JSON.stringify({
				kind: 'account_addon', addon_id: 'internal_chat', title: 'چت سازمانی',
				site_type: 'Docker Control Site', site_name: 'veederakht.ir', monthly_price_toman: 25_000,
			}),
		};
		expect(getAsumiAddonOrderDetails(order)).toEqual({
			addonId: 'internal_chat', addonTitle: 'چت سازمانی', siteName: 'veederakht.ir', siteType: 'Docker Control Site',
		});
		expect(getAsumiAddonOrderDetails({ order_type: 'Hosting', service_quote_snapshot: order.service_quote_snapshot })).toBeNull();
	});
});
