import { describe, expect, it } from 'vitest';
import { commercePurchaseSiteParams, resolveCommercePurchaseSite } from './commerceSites';

describe('commerce purchase site targets', () => {
	const sites = [
		{ key: 'Site:asumi.ir', name: 'asumi', site_type: 'Site', label: 'asumi.ir' },
		{ key: 'Docker Control Site:veederakht.ir', name: 'veederakht.ir', site_type: 'Docker Control Site', label: 'veederakht.ir' },
	];

	it('resolves a selected Press or Docker managed site without losing its type', () => {
		expect(resolveCommercePurchaseSite(sites, 'Site:asumi.ir').site_type).toBe('Site');
		const dockerSite = resolveCommercePurchaseSite(sites, 'Docker Control Site:veederakht.ir');
		expect(commercePurchaseSiteParams(dockerSite)).toEqual({
			site: 'veederakht.ir',
			site_type: 'Docker Control Site',
		});
	});

	it('rejects stale selections and unsupported site types', () => {
		expect(resolveCommercePurchaseSite(sites, 'missing')).toBeNull();
		expect(() => commercePurchaseSiteParams({ name: 'veederakht.ir', site_type: 'Unknown' })).toThrow();
	});
});
