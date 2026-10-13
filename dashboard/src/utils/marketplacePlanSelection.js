export function selectMarketplacePlans(plans, requestedApp) {
	if (!Array.isArray(plans)) return [];
	if (!requestedApp) return plans;
	return plans.filter((plan) => plan.app === requestedApp);
}
