import type { MarketplaceApp } from './MarketplaceShowcase';

export function buildMarketplacePurchaseHref(app: Pick<MarketplaceApp, 'id' | 'title'>): string {
	const params = new URLSearchParams({
		asumi_app: app.id,
		asumi_app_title: app.title,
	});

	return `/dashboard/orders?${params.toString()}`;
}
