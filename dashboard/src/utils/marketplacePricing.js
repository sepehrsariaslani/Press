export function isPlanFreeForCurrency(plan, currency) {
	const priceField = currency === 'INR' ? 'price_inr' : 'price_usd';
	return Number(plan?.[priceField] ?? 0) <= 0;
}
