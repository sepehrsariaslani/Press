export function getAccountsPreviewHref(entryHref: string, pagePath = window.location.pathname) {
	if (!pagePath.startsWith('/assets/press/asumi_site/')) return entryHref;
	return new URL(entryHref, 'http://asumi:8000').toString();
}
