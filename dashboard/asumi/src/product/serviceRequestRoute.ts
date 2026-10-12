export type ServiceRequestKind = 'module_pricing' | 'website_design';

export function buildServiceRequestHref(service: ServiceRequestKind, context: string, moduleIds: string[] = []) {
	const params = new URLSearchParams({
		asumi_service_request: '1',
		service,
		context,
	});
	const safeModuleIds = moduleIds.filter(id => /^[a-z0-9-]+$/i.test(id));
	if (safeModuleIds.length) params.set('modules', safeModuleIds.join(','));
	return `/dashboard/orders?${params.toString()}`;
}
