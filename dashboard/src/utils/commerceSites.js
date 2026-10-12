export function resolveCommercePurchaseSite(sites, key) {
	if (!Array.isArray(sites) || !key) return null;
	return sites.find(site => site.key === key) || null;
}

export function commercePurchaseSiteParams(site) {
	if (!site?.name || !["Site", "Docker Control Site"].includes(site.site_type)) {
		throw new Error("سایت خرید معتبر نیست.");
	}
	return { site: site.name, site_type: site.site_type };
}
