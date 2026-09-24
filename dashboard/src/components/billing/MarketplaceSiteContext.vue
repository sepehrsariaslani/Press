<template>
	<section class="rounded-lg border border-outline-gray-1 bg-surface-white p-5">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div class="min-w-0">
				<p class="text-xs font-semibold uppercase tracking-wide text-ink-gray-5">
					Installation target
				</p>
				<h2 class="mt-1 text-base font-semibold text-ink-gray-9">
					{{ selectedSiteDoc ? siteLabel(selectedSiteDoc) : 'Choose a site' }}
				</h2>
				<p class="mt-1 text-sm text-ink-gray-6">
					{{ contextMessage }}
				</p>
			</div>
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
				<label class="sr-only" for="pricing-site-select">Choose a site</label>
				<select
					id="pricing-site-select"
					:value="selectedSite"
					:disabled="!sites.length || siteChangeDisabled"
					class="h-11 min-w-56 rounded-md border border-outline-gray-2 bg-surface-white px-3 text-sm text-ink-gray-8 focus:outline-none focus:ring-2 focus:ring-outline-gray-5 disabled:bg-surface-gray-1"
					@change="$emit('site-select', $event.target.value)"
				>
					<option value="" disabled>Select a site</option>
					<option v-for="site in sites" :key="site.name" :value="site.name">
						{{ siteLabel(site) }} · {{ siteStatusLabel(site.status) }}
					</option>
				</select>
				<button
					v-if="selectedSiteDoc"
					type="button"
					class="min-h-11 rounded-md border border-outline-gray-2 px-3 text-sm font-medium text-ink-gray-8 hover:bg-surface-gray-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-5"
					@click="$emit('manage-site', selectedSiteDoc.name)"
				>
					Manage site apps
				</button>
			</div>
		</div>

		<div v-if="selectedSiteDoc" class="mt-4 border-t border-outline-gray-1 pt-4">
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-xs font-medium text-ink-gray-6">
					{{ installedMarketplaceApps.length }} Marketplace apps installed
				</span>
				<template v-if="installedMarketplaceApps.length">
					<span
						v-for="app in installedMarketplaceApps.slice(0, 5)"
						:key="app.app"
						class="rounded-full bg-surface-gray-1 px-2.5 py-1 text-xs text-ink-gray-7"
					>
						{{ app.title || app.app_title || app.app }}
					</span>
					<span v-if="installedMarketplaceApps.length > 5" class="text-xs text-ink-gray-5">
						+{{ installedMarketplaceApps.length - 5 }} more
					</span>
				</template>
				<span v-else class="text-xs text-ink-gray-5">No Marketplace apps installed yet.</span>
			</div>
			<p v-if="selectedSiteDoc.status !== 'Active'" class="mt-2 text-xs text-ink-amber-3">
				This site is busy. You can install an app when setup is complete.
			</p>
		</div>

		<div v-else-if="!loading" class="mt-4 rounded-md bg-surface-gray-1 px-4 py-3">
			<p class="text-sm font-medium text-ink-gray-8">No available site yet</p>
			<p class="mt-1 text-xs leading-5 text-ink-gray-6">
				Choose an app below to create a site and install it, or create a site first.
			</p>
		</div>
	</section>
</template>

<script>
export default {
	name: 'MarketplaceSiteContext',
	props: {
		sites: { type: Array, default: () => [] },
		selectedSite: { type: String, default: '' },
		installedApps: { type: Array, default: () => [] },
		marketplaceAppNames: { type: Array, default: () => [] },
		loading: { type: Boolean, default: false },
		siteChangeDisabled: { type: Boolean, default: false },
	},
	emits: ['site-select', 'manage-site'],
	computed: {
		selectedSiteDoc() {
			return this.sites.find((site) => site.name === this.selectedSite)
		},
		installedMarketplaceApps() {
			return this.installedApps.filter((app) =>
				this.marketplaceAppNames.includes(app.app),
			)
		},
		contextMessage() {
			if (this.loading) return 'Loading your sites…'
			if (!this.selectedSiteDoc) return 'Choose where you want to install your apps.'
			return 'Selected apps will be installed on this site. Hosting is billed separately.'
		},
	},
	methods: {
		siteLabel(site) {
			return site.host_name || site.name
		},
		siteStatusLabel(status) {
			return status === 'Active' ? 'Ready' : 'Setup in progress'
		},
	},
}
</script>
