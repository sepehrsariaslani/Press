import { pricingPresets, type PricingAddonId, type ModuleId } from './catalog';
import type { ServicePriceMap } from './pricingApi';

export type PricingEstimate = {
	moduleTotal: number;
	addonTotal: number;
	listedTotal: number;
	bundleDiscount: number;
	bundleDiscountLabel: string;
	packageId: keyof ServicePriceMap['packages'] | null;
	total: number;
};

export function estimateSelection(moduleIds: readonly ModuleId[], addonIds: readonly PricingAddonId[], prices: ServicePriceMap): PricingEstimate {
	const moduleTotal = moduleIds.reduce((sum, id) => sum + prices.modules[id], 0);
	const addonTotal = addonIds.reduce((sum, id) => sum + prices.addons[id], 0);
	const listedTotal = moduleTotal + addonTotal;
	const exactPreset = pricingPresets.find(preset =>
		sameItems(moduleIds, preset.moduleIds) && sameItems(addonIds, preset.addonIds));
	const packageId = exactPreset?.id || null;
	const total = packageId ? prices.packages[packageId] : listedTotal;
	const bundleDiscount = Math.max(0, listedTotal - total);
	const bundleDiscountLabel = packageId && exactPreset ? `تخفیف بستهٔ ${exactPreset.title}` : '';
	return { moduleTotal, addonTotal, listedTotal, bundleDiscount, bundleDiscountLabel, packageId, total };
}

function sameItems(left: readonly string[], right: readonly string[]) {
	return left.length === right.length && left.every(id => right.includes(id));
}
