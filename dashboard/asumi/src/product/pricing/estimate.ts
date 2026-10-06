import { productModules } from '../modules';
import { completeModulesPackagePrice, moduleAddonPrices, pricingAddonPrices, pricingPresets, type PricingAddonId, type ModuleId } from './catalog';

export type PricingEstimate = {
	moduleTotal: number;
	addonTotal: number;
	listedTotal: number;
	bundleDiscount: number;
	bundleDiscountLabel: string;
	total: number;
};

export function estimateSelection(moduleIds: readonly ModuleId[], addonIds: readonly PricingAddonId[]): PricingEstimate {
	const moduleTotal = moduleIds.reduce((sum, id) => sum + moduleAddonPrices[id], 0);
	const addonTotal = addonIds.reduce((sum, id) => sum + pricingAddonPrices[id], 0);
	const listedTotal = moduleTotal + addonTotal;
	const includesAllModules = productModules.every(module => moduleIds.includes(module.id));
	const discountedPreset = pricingPresets.find(preset => preset.packageMonthlyPrice !== undefined
		&& sameItems(moduleIds, preset.moduleIds) && sameItems(addonIds, preset.addonIds));
	const bundleDiscount = discountedPreset
		? Math.max(0, moduleTotal - discountedPreset.packageMonthlyPrice!)
		: includesAllModules ? Math.max(0, moduleTotal - completeModulesPackagePrice) : 0;
	const bundleDiscountLabel = discountedPreset
		? `تخفیف بستهٔ ${discountedPreset.title}`
		: 'تخفیف بستهٔ کامل';
	return { moduleTotal, addonTotal, listedTotal, bundleDiscount, bundleDiscountLabel, total: listedTotal - bundleDiscount };
}

function sameItems(left: readonly string[], right: readonly string[]) {
	return left.length === right.length && left.every(id => right.includes(id));
}
