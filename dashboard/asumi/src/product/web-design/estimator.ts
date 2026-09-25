import { monthlyAddons, monthlyServices, websiteAddons, websiteTiers, type WebsiteAddon, type WebsiteTierId } from './catalog';

export type QuantitySelection = Record<string, number>;

export type WebsiteEstimate = {
	setupMin: number;
	setupMax: number;
	monthlyMin: number;
	monthlyMax: number;
	firstMonthMin: number;
	firstMonthMax: number;
	yearOneMin: number;
	yearOneMax: number;
	marketRateCount: number;
};

function selectedAddonTotal(items: WebsiteAddon[], selection: QuantitySelection, billing: 'once' | 'market' | 'range') {
	return items.reduce((sum, item) => {
		const quantity = Math.max(0, selection[item.code] || 0);
		if (!quantity || item.billing !== billing || item.price === null) return sum;
		return sum + item.price * quantity;
	}, 0);
}

export function estimateWebsiteSelection(tierId: WebsiteTierId, addons: QuantitySelection, recurring: QuantitySelection): WebsiteEstimate {
	const tier = websiteTiers.find(item => item.id === tierId) || websiteTiers[0];
	const selectedAddonIds = new Set(Object.entries(addons).filter(([, quantity]) => quantity > 0).map(([code]) => code));
	const allowedAddonIds = new Set(websiteAddons
		.filter(item => item.availableTiers.includes(tier.id) && !item.blockedReason)
		.filter(item => (item.requires || []).every(code => selectedAddonIds.has(code)))
		.map(item => item.code));
	const validAddons = Object.fromEntries(Object.entries(addons).filter(([code, quantity]) => allowedAddonIds.has(code) && quantity > 0));
	const setupBase = tier.price + selectedAddonTotal(websiteAddons, validAddons, 'once');
	const setupRangeMin = selectedAddonTotal(websiteAddons, validAddons, 'range');
	const setupRangeMax = websiteAddons.reduce((sum, item) => sum + (validAddons[item.code] || 0) * (item.billing === 'range' ? item.priceMax || item.price || 0 : 0), 0);

	const recurringPrices = [...monthlyServices, ...monthlyAddons];
	const monthlyTotal = recurringPrices.reduce((sum, item) => sum + item.price * Math.max(0, recurring[item.code] || 0), 0);
	const setupMin = setupBase + setupRangeMin;
	const setupMax = setupBase + setupRangeMax;
	const marketRateCount = websiteAddons.filter(item => item.billing === 'market').reduce((sum, item) => sum + (validAddons[item.code] || 0), 0);

	return {
		setupMin, setupMax,
		monthlyMin: monthlyTotal, monthlyMax: monthlyTotal,
		firstMonthMin: setupMin + monthlyTotal,
		firstMonthMax: setupMax + monthlyTotal,
		yearOneMin: setupMin + monthlyTotal * 12,
		yearOneMax: setupMax + monthlyTotal * 12,
		marketRateCount,
	};
}

export function formatToman(value: number) {
	return `${new Intl.NumberFormat('fa-IR').format(value)} تومان`;
}

export function quoteRange(min: number, max: number) {
	return min === max ? formatToman(min) : `${formatToman(min)} تا ${formatToman(max)}`;
}
