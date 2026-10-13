const HOSTIRAN_FULFILLMENT_LABELS = {
	'Not Applicable': 'بدون VPS اختصاصی',
	'Awaiting VPS': 'در انتظار تهیهٔ VPS',
	'VPS Ready': 'VPS آمادهٔ راه‌اندازی',
	'Deploying Bench': 'در حال آماده‌سازی بنچ روی VPS',
	'Creating Site': 'در حال ساخت سایت روی VPS',
	Active: 'سایت فعال شد',
	Failed: 'نیازمند پیگیری مدیر',
};

export function isHostiranNewSiteOrder(order) {
	return order?.order_type === 'Hosting' && order?.service_delivery_mode === 'Create New Site';
}

export function canPrepareHostiranSite(order) {
	return Boolean(
		isHostiranNewSiteOrder(order) &&
		['Paid', 'Provisioning Failed'].includes(order.status) &&
		!order.hostiran_site_group_deploy,
	);
}

export function hostiranFulfillmentLabel(status) {
	return HOSTIRAN_FULFILLMENT_LABELS[status] || 'وضعیت VPS در حال بررسی';
}
