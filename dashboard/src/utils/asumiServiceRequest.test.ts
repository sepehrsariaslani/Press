import { describe, expect, it } from 'vitest';
import { isAsumiServicePurchaseRequest, parseAsumiAddonPurchaseRequest, parseAsumiServiceRequest } from './asumiServiceRequest';

describe('parseAsumiServiceRequest', () => {
	it('reads the selected service and safe module and addon ids', () => {
		const params = new URLSearchParams({
			asumi_service_request: '1',
			service: 'module_pricing',
			modules: 'finance,sales,<script>,finance',
			addons: 'restaurantMenu,<img>,restaurantMenu',
		});

		expect(parseAsumiServiceRequest(`?${params}`)).toEqual({
			service: 'module_pricing',
			intent: 'request',
			context: '',
			moduleIds: ['finance', 'sales'],
			addonIds: ['restaurantMenu'],
		});
	});

	it('only marks module pricing requests as purchases', () => {
		const purchase = parseAsumiServiceRequest('?asumi_service_request=1&service=module_pricing&asumi_service_purchase=1&modules=finance');
		expect(purchase?.intent).toBe('purchase');
		const website = parseAsumiServiceRequest('?asumi_service_request=1&service=website_design&asumi_service_purchase=1');
		expect(website?.intent).toBe('request');
	});

	it('routes only an explicit module purchase to checkout', () => {
		const purchase = parseAsumiServiceRequest('?asumi_service_request=1&service=module_pricing&asumi_service_purchase=1&modules=finance');
		const request = parseAsumiServiceRequest('?asumi_service_request=1&service=module_pricing&modules=finance');
		const website = parseAsumiServiceRequest('?asumi_service_request=1&service=website_design&asumi_service_purchase=1');

		expect(isAsumiServicePurchaseRequest(purchase)).toBe(true);
		expect(isAsumiServicePurchaseRequest(request)).toBe(false);
		expect(isAsumiServicePurchaseRequest(website)).toBe(false);
		expect(isAsumiServicePurchaseRequest(null)).toBe(false);
	});

	it('ignores unrelated, invalid and oversized links', () => {
		expect(parseAsumiServiceRequest('?service=website_design')).toBeNull();
		expect(parseAsumiServiceRequest('?asumi_service_request=1&service=admin')).toBeNull();
		expect(parseAsumiServiceRequest('?asumi_service_request=1&service=website_design&context=web')?.addonIds).toEqual([]);
		const oversized = new URLSearchParams({ asumi_service_request: '1', service: 'website_design', context: 'x'.repeat(5001) });
		expect(parseAsumiServiceRequest(`?${oversized}`)).toBeNull();
	});
});

describe('parseAsumiAddonPurchaseRequest', () => {
	it('accepts only the two site-scoped add-on identifiers', () => {
		expect(parseAsumiAddonPurchaseRequest('?asumi_addon_purchase=1&addon_id=assistant_ai')).toBe('assistant_ai');
		expect(parseAsumiAddonPurchaseRequest('?asumi_addon_purchase=1&addon_id=internal_chat')).toBe('internal_chat');
		expect(parseAsumiAddonPurchaseRequest('?asumi_addon_purchase=1&addon_id=other')).toBeNull();
		expect(parseAsumiAddonPurchaseRequest('?addon_id=assistant_ai')).toBeNull();
	});
});
