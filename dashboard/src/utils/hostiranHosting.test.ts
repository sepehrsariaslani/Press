import { describe, expect, it } from 'vitest';
import { canPrepareHostiranSite, hostiranFulfillmentLabel, isHostiranNewSiteOrder } from './hostiranHosting';

describe('HostIran dedicated hosting order UI', () => {
	it('recognizes only new-site hosting orders', () => {
		expect(isHostiranNewSiteOrder({ order_type: 'Hosting', service_delivery_mode: 'Create New Site' })).toBe(true);
		expect(isHostiranNewSiteOrder({ order_type: 'Hosting', service_delivery_mode: 'Upgrade Existing Site' })).toBe(false);
		expect(isHostiranNewSiteOrder({ order_type: 'Marketplace App', service_delivery_mode: 'Create New Site' })).toBe(false);
	});

	it('offers VPS fulfillment only for a paid order that has no deployment yet', () => {
		const order = { order_type: 'Hosting', service_delivery_mode: 'Create New Site', status: 'Paid' };
		expect(canPrepareHostiranSite(order)).toBe(true);
		expect(canPrepareHostiranSite({ ...order, status: 'Provisioning' })).toBe(false);
		expect(canPrepareHostiranSite({ ...order, hostiran_site_group_deploy: 'SGD-1' })).toBe(false);
	});

	it('shows customer-safe VPS progress labels', () => {
		expect(hostiranFulfillmentLabel('Awaiting VPS')).toBe('در انتظار تهیهٔ VPS');
		expect(hostiranFulfillmentLabel('Creating Site')).toBe('در حال ساخت سایت روی VPS');
		expect(hostiranFulfillmentLabel('unknown')).toBe('وضعیت VPS در حال بررسی');
	});
});
