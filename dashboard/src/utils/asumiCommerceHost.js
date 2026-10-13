const ASUMI_COMMERCE_HOSTS = new Set(['asumi.ir', 'www.asumi.ir']);

export function isAsumiCommerceHost(hostname) {
	return ASUMI_COMMERCE_HOSTS.has(String(hostname || '').toLowerCase());
}

export function getAsumiBillingRedirect(hostname, path) {
	if (
		!isAsumiCommerceHost(hostname) ||
		!(path === '/billing' || path.startsWith('/billing/'))
	) {
		return null;
	}

	return { name: 'Commerce Orders', replace: true };
}
