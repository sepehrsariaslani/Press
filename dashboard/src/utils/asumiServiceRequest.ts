export type AsumiServiceKind = 'module_pricing' | 'website_design';

export type AsumiServiceRequest = {
	service: AsumiServiceKind;
	intent: 'request' | 'purchase';
	context: string;
	moduleIds: string[];
	addonIds: string[];
};

export type AsumiAccountAddonId = 'assistant_ai' | 'internal_chat';

export function parseAsumiAddonPurchaseRequest(search: string): AsumiAccountAddonId | null {
	const params = new URLSearchParams(search);
	if (params.get('asumi_addon_purchase') !== '1') return null;
	const addonId = params.get('addon_id');
	return addonId === 'assistant_ai' || addonId === 'internal_chat' ? addonId : null;
}

export function isAsumiServicePurchaseRequest(request: AsumiServiceRequest | null): boolean {
	return request?.service === 'module_pricing' && request.intent === 'purchase';
}

export function parseAsumiServiceRequest(search: string): AsumiServiceRequest | null {
	const params = new URLSearchParams(search);
	if (params.get('asumi_service_request') !== '1') return null;
	const service = params.get('service');
	if (service !== 'module_pricing' && service !== 'website_design') return null;
	const context = params.get('context') || '';
	if (context.length > 5000) return null;
	const moduleIds = [...new Set((params.get('modules') || '').split(',').filter(id => /^[a-z0-9-]{1,50}$/i.test(id)))].slice(0, 15);
	const addonIds = [...new Set((params.get('addons') || '').split(',').filter(id => /^[a-z0-9-]{1,50}$/i.test(id)))].slice(0, 10);
	const intent = service === 'module_pricing' && params.get('asumi_service_purchase') === '1' ? 'purchase' : 'request';
	return { service, intent, context, moduleIds, addonIds };
}
