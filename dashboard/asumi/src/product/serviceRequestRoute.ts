export type ServiceRequestKind = 'module_pricing' | 'website_design';

export function buildServiceRequestHref(service: ServiceRequestKind, context: string, moduleIds: string[] = [], addonIds: string[] = []) {
	const params = new URLSearchParams({
		asumi_service_request: '1',
		service,
	});
	if (service === 'website_design' && context) params.set('context', context);
	if (service === 'module_pricing') {
		const safeModuleIds = moduleIds.filter(id => /^[a-z0-9-]{1,50}$/i.test(id));
		const safeAddonIds = addonIds.filter(id => /^[a-z0-9-]{1,50}$/i.test(id));
		if (safeModuleIds.length) params.set('modules', safeModuleIds.join(','));
		if (safeAddonIds.length) params.set('addons', safeAddonIds.join(','));
	}
	return `/dashboard/orders?${params.toString()}`;
}
