<template>
	<main class="mx-auto max-w-[1600px] px-5 pb-24 pt-5 xl:pb-10">
		<section class="mb-5 rounded-lg border border-outline-gray-1 bg-surface-white p-5 md:p-6">
			<div class="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
				<div>
					<p class="text-xs font-semibold uppercase tracking-wide text-ink-gray-5">App catalogue</p>
					<h1 class="mt-1 text-2xl font-semibold text-ink-gray-9">Apps &amp; pricing</h1>
					<p class="mt-2 max-w-2xl text-sm leading-6 text-ink-gray-6">
						Compare app plans, see what is already installed, and add the apps your team needs to a site.
					</p>
				</div>
				<div class="flex flex-wrap gap-2">
					<Button :route="{ name: 'BillingOverview' }" label="Billing overview" />
					<Button :route="{ name: 'BillingSubscriptions' }" label="Subscriptions" />
					<Button :route="{ name: 'BillingInvoices' }" label="Invoices" />
					<Button :route="{ name: 'BillingPaymentMethods' }" label="Payment methods" />
				</div>
			</div>
			<div class="mt-5 flex flex-wrap gap-3">
				<div class="rounded-md bg-surface-gray-1 px-4 py-3">
					<div class="text-lg font-semibold text-ink-gray-9">{{ $resources.pricingCatalog.loading ? '…' : apps.length }}</div>
					<div class="text-xs text-ink-gray-6">available apps</div>
				</div>
				<div class="rounded-md bg-surface-gray-1 px-4 py-3">
					<div class="text-lg font-semibold text-ink-green-2">{{ freeERPNextModules.length }}</div>
					<div class="text-xs text-ink-gray-6">included ERPNext modules</div>
				</div>
				<div class="rounded-md bg-surface-gray-1 px-4 py-3">
					<div class="text-lg font-semibold text-ink-gray-9">{{ installedMarketplaceApps.length }}</div>
					<div class="text-xs text-ink-gray-6">apps on selected site</div>
				</div>
			</div>
		</section>

		<MarketplaceSiteContext
			class="mb-5"
			:sites="sites"
			:selectedSite="selectedSite"
			:installedApps="installedApps"
			:marketplaceAppNames="apps.map((app) => app.app)"
			:loading="$resources.sites.loading"
			:siteChangeDisabled="loadingSiteApps || installation?.status === 'pending'"
			@site-select="selectSite"
			@manage-site="openSiteApps"
		/>

		<MarketplaceInstallStatus
			v-if="installation"
			:installation="installation"
			:checking="checkingInstallation"
			@check="checkInstallationStatus"
			@manage="openSiteApps(selectedSite)"
		/>
		<div v-if="siteAppsLoadError" class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-gray-2 bg-surface-red-2 p-4">
			<p class="text-sm text-ink-red-3">We couldn't check which apps are available for this site.</p>
			<Button label="Try again" @click="loadSelectedSiteApps" />
		</div>

		<IncludedERPNextModules class="mb-6" />

		<div class="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
			<aside class="sticky top-28 z-10 xl:col-start-2 xl:row-start-1">
				<PricingEstimate
					:entries="selectedEntries"
					:total="selectedTotal"
					:unpricedCount="unpricedSelectionCount"
					@clear="clearSelection"
				/>
				<p class="mt-3 px-1 text-xs leading-5 text-ink-gray-5">
				Install one app at a time and follow its status here. The selected total estimates app plans only.
				</p>
			</aside>
			<MarketplaceAppCatalog
				:apps="pricingApps"
				:loading="$resources.pricingCatalog.loading"
				:error="$resources.pricingCatalog.error"
				:selectedAppNames="selectedAppNames"
				:selectedPlans="visibleSelectedPlans"
				:currentPlanNames="currentPlanNames"
				:availableAppSlugs="availableAppSlugs"
				:availabilityChecked="availabilityChecked"
				:installedAppSlugs="installedAppSlugs"
				:changeableAppSlugs="changeableAppSlugs"
				:busyAppSlugs="busyAppSlugs"
				:hasSite="Boolean(selectedSiteDoc)"
				:siteReady="siteReady"
				@reload="$resources.pricingCatalog.reload()"
				@toggle="toggleApp"
				@plan-select="selectPlan"
				@install="installApp"
				@change-plan="changeAppPlan"
				@manage-site="openSiteApps(selectedSite)"
			/>
		</div>
	</main>
</template>

<script>
import { Button } from 'frappe-ui'
import IncludedERPNextModules from '@/components/billing/IncludedERPNextModules.vue'
import MarketplaceAppCatalog from '@/components/billing/MarketplaceAppCatalog.vue'
import MarketplaceInstallStatus from '@/components/billing/MarketplaceInstallStatus.vue'
import MarketplaceSiteContext from '@/components/billing/MarketplaceSiteContext.vue'
import PricingEstimate from '@/components/billing/PricingEstimate.vue'
import marketplacePricingActions from '@/components/billing/marketplacePricingActions'
import marketplacePricingState from '@/components/billing/marketplacePricingState'

export default {
	name: 'BillingPricing',
	mixins: [marketplacePricingState, marketplacePricingActions],
	components: {
		Button,
		IncludedERPNextModules,
		MarketplaceAppCatalog,
		MarketplaceInstallStatus,
		MarketplaceSiteContext,
		PricingEstimate,
	},
}
</script>
