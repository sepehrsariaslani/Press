export function isPlanFreeForCurrency(plan, currency) {
	const priceField =
		{
			INR: 'price_inr',
			IRR: 'price_irr',
		}[currency] || 'price_usd';
	return Number(plan?.[priceField] ?? 0) <= 0;
}

export function marketplacePlanLabel(plan, currency, freeLabel) {
	return isPlanFreeForCurrency(plan, currency) ? freeLabel : '';
}

export function hasPaidPlanForCurrency(plans, currency) {
	const priceField =
		{
			INR: 'price_inr',
			IRR: 'price_irr',
		}[currency] || 'price_usd';
	return Boolean(plans?.some((plan) => Number(plan?.[priceField] ?? 0) > 0));
}

export function requiresMarketplaceAppPlanSelection(app, currency, teamName) {
	return app?.team !== teamName && hasPaidPlanForCurrency(app?.plans, currency);
}
