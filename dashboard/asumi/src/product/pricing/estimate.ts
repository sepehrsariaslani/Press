import { productModules } from '../modules';
import { completeModulesPackagePrice, moduleAddonPrices, pricingAddonPrices, type PricingAddonId, type ModuleId } from './catalog';

export type PricingEstimate = {
	moduleTotal: number;
	addonTotal: number;
	listedTotal: number;
	bundleDiscount: number;
	total: number;
};

export function estimateSelection(moduleIds: readonly ModuleId[], addonIds: readonly PricingAddonId[]): PricingEstimate {
	const moduleTotal = moduleIds.reduce((sum, id) => sum + moduleAddonPrices[id], 0);
	const addonTotal = addonIds.reduce((sum, id) => sum + pricingAddonPrices[id], 0);
	const listedTotal = moduleTotal + addonTotal;
	const includesAllModules = productModules.every(module => moduleIds.includes(module.id));
	const bundleDiscount = includesAllModules ? Math.max(0, moduleTotal - completeModulesPackagePrice) : 0;
	return { moduleTotal, addonTotal, listedTotal, bundleDiscount, total: listedTotal - bundleDiscount };
}
