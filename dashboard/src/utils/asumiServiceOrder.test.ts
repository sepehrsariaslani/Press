import { describe, expect, it } from 'vitest';
import {
	getAsumiServiceOrderLines,
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
});
