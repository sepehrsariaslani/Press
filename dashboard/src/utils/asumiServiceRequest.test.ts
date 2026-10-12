import { describe, expect, it } from 'vitest';
import { parseAsumiServiceRequest } from './asumiServiceRequest';

describe('parseAsumiServiceRequest', () => {
	it('reads the selected service, estimate and safe module ids', () => {
		const params = new URLSearchParams({
			asumi_service_request: '1',
			service: 'module_pricing',
			context: 'ماژول‌های مالی و فروش',
			modules: 'finance,sales,<script>',
		});

		expect(parseAsumiServiceRequest(`?${params}`)).toEqual({
			service: 'module_pricing',
			context: 'ماژول‌های مالی و فروش',
			moduleIds: ['finance', 'sales'],
		});
	});

	it('ignores unrelated, invalid and oversized links', () => {
		expect(parseAsumiServiceRequest('?service=website_design')).toBeNull();
		expect(parseAsumiServiceRequest('?asumi_service_request=1&service=admin')).toBeNull();
		const oversized = new URLSearchParams({ asumi_service_request: '1', service: 'website_design', context: 'x'.repeat(5001) });
		expect(parseAsumiServiceRequest(`?${oversized}`)).toBeNull();
	});
});
