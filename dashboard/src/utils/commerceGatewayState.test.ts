import { describe, expect, it } from 'vitest';
import { commerceGatewayState } from './commerceGatewayState';

describe('Asumi commerce gateway status', () => {
	it('does not claim the gateway is active before a merchant ID is configured', () => {
		expect(commerceGatewayState({ enabled: true, sandbox_mode: true, merchant_id_configured: false }).label).toBe('درگاه غیرفعال');
	});

	it('explains when checkout stays disabled despite a stored merchant ID', () => {
		const state = commerceGatewayState({ enabled: false, sandbox_mode: false, merchant_id_configured: true });
		expect(state.label).toBe('درگاه غیرفعال');
		expect(state.message).toMatch(/فعال‌سازی مدیر/);
	});

	it('labels a configured sandbox as a test environment, never as live payment', () => {
		const state = commerceGatewayState({ enabled: true, allow_marketplace_app_sales: true, merchant_id_configured: true, sandbox_mode: true });
		expect(state.label).toBe('حالت آزمایشی');
		expect(state.message).toMatch(/وجه واقعی/);
		expect(state.tone).toBe('warning');
	});

	it('labels production payment only when at least one sale type is enabled', () => {
		const settings = { enabled: true, allow_marketplace_app_sales: true, allow_site_plan_sales: false, merchant_id_configured: true, sandbox_mode: false };
		expect(commerceGatewayState(settings).label).toBe('پرداخت زنده فعال');
		expect(commerceGatewayState({ ...settings, allow_marketplace_app_sales: false }).label).toBe('فروش غیرفعال');
	});
});
