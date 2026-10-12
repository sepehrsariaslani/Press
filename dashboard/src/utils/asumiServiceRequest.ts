export type AsumiServiceKind = 'module_pricing' | 'website_design';

export type AsumiServiceRequest = {
	service: AsumiServiceKind;
	context: string;
	moduleIds: string[];
};

export function parseAsumiServiceRequest(search: string): AsumiServiceRequest | null {
	const params = new URLSearchParams(search);
	if (params.get('asumi_service_request') !== '1') return null;
	const service = params.get('service');
	if (service !== 'module_pricing' && service !== 'website_design') return null;
	const context = params.get('context') || '';
	if (context.length > 5000) return null;
	const moduleIds = (params.get('modules') || '').split(',').filter(id => /^[a-z0-9-]{1,50}$/i.test(id));
	return { service, context, moduleIds };
}
