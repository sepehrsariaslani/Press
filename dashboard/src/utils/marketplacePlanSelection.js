export function selectMarketplacePlans(plans, requestedApp) {
	if (!Array.isArray(plans)) return [];
	if (!requestedApp) return plans;
	return plans.filter((plan) => plan.app === requestedApp);
}

export function marketplacePlanActionLabel(plan) {
	if (!plan?.asumi_checkout_supported) return 'نیازمند قیمت ریالی';
	const install = Boolean(plan.installation_required);
	if (Number(plan.price_irr) === 0) return install ? 'ثبت سفارش رایگان و نصب' : 'فعال‌سازی رایگان';
	return install ? 'پرداخت و نصب' : 'ثبت سفارش و پرداخت';
}
