<template>
	<section class="min-w-0">
		<div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
			<div class="relative min-w-0 flex-1">
				<TextInput
					v-model="searchQuery"
					type="search"
					size="lg"
					placeholder="Search apps and descriptions"
					aria-label="Search published apps"
					class="w-full"
				>
					<template #prefix>
						<lucide-search class="size-4 text-ink-gray-5" aria-hidden="true" />
					</template>
				</TextInput>
			</div>
			<label class="sr-only" for="app-category-filter">Filter by category</label>
			<select
				id="app-category-filter"
				v-model="selectedCategory"
				class="h-11 rounded-md border border-outline-gray-2 bg-surface-white px-3 text-sm text-ink-gray-8 focus:outline-none focus:ring-2 focus:ring-outline-gray-5"
			>
				<option value="">All categories</option>
				<option v-for="category in categories" :key="category" :value="category">
					{{ category }}
				</option>
			</select>
		</div>

		<div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by pricing type">
			<button
				v-for="filter in pricingFilters"
				:key="filter.value"
				type="button"
				class="min-h-11 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-5"
				:class="pricingFilter === filter.value ? 'border-ink-gray-9 bg-ink-gray-9 text-surface-white' : 'border-outline-gray-2 bg-surface-white text-ink-gray-7 hover:bg-surface-gray-1'"
				:aria-pressed="pricingFilter === filter.value"
				@click="pricingFilter = filter.value"
			>
				{{ filter.label }}
			</button>
		</div>

		<div v-if="loading" class="grid gap-3 md:grid-cols-2" role="status" aria-label="Loading app pricing">
			<div
				v-for="placeholder in 6"
				:key="placeholder"
				class="h-72 animate-pulse rounded-lg border border-outline-gray-1 bg-surface-gray-1"
			/>
		</div>
		<div v-else-if="error" class="rounded-lg border border-outline-gray-2 bg-surface-red-2 p-5">
			<p class="text-sm font-medium text-ink-red-3">We couldn't load app pricing.</p>
			<Button class="mt-3" label="Try again" @click="$emit('reload')" />
		</div>
		<div v-else-if="!apps.length" class="rounded-lg border border-dashed border-outline-gray-2 p-10 text-center">
			<p class="text-sm font-medium text-ink-gray-8">No published Marketplace apps are available.</p>
		</div>
		<div v-else-if="filteredApps.length" class="grid gap-3 md:grid-cols-2">
			<MarketplacePricingCard
				v-for="app in filteredApps"
				:key="app.name"
				:app="app"
				:selected="selectedAppNames.includes(app.name)"
				:selectedPlan="selectedPlans[app.name]"
				:currentPlanName="currentPlanNames[app.app]"
				:installed="installedAppSlugs.includes(app.app)"
				:canChangePlan="changeableAppSlugs.includes(app.app)"
				:availableOnSite="availableAppSlugs.includes(app.app)"
				:availabilityChecked="availabilityChecked"
				:hasSite="hasSite"
				:siteReady="siteReady"
				:busy="busyAppSlugs.includes(app.app)"
				@toggle="$emit('toggle', app)"
				@plan-select="$emit('plan-select', app, $event)"
				@install="$emit('install', app)"
				@change-plan="$emit('change-plan', app)"
				@manage-site="$emit('manage-site', app)"
			/>
		</div>
		<div v-else class="rounded-lg border border-dashed border-outline-gray-2 p-10 text-center">
			<lucide-search-x class="mx-auto size-6 text-ink-gray-5" aria-hidden="true" />
			<p class="mt-3 text-sm font-medium text-ink-gray-8">No apps match these filters</p>
			<p class="mt-1 text-xs text-ink-gray-6">Try another search or clear the category and pricing filters.</p>
		</div>
	</section>
</template>

<script>
import { Button, TextInput } from 'frappe-ui'
import MarketplacePricingCard from './MarketplacePricingCard.vue'

export default {
	name: 'MarketplaceAppCatalog',
	components: { Button, MarketplacePricingCard, TextInput },
	props: {
		apps: { type: Array, default: () => [] },
		loading: { type: Boolean, default: false },
		error: { type: [Boolean, Object, String], default: false },
		selectedAppNames: { type: Array, default: () => [] },
		selectedPlans: { type: Object, default: () => ({}) },
		currentPlanNames: { type: Object, default: () => ({}) },
		installedAppSlugs: { type: Array, default: () => [] },
		changeableAppSlugs: { type: Array, default: () => [] },
		busyAppSlugs: { type: Array, default: () => [] },
		availableAppSlugs: { type: Array, default: () => [] },
		availabilityChecked: { type: Boolean, default: false },
		hasSite: { type: Boolean, default: false },
		siteReady: { type: Boolean, default: false },
	},
	emits: ['reload', 'toggle', 'plan-select', 'install', 'change-plan', 'manage-site'],
	data() {
		return {
			searchQuery: '',
			selectedCategory: '',
			pricingFilter: 'all',
			pricingFilters: [
				{ label: 'All pricing', value: 'all' },
				{ label: 'Free', value: 'free' },
				{ label: 'Paid', value: 'paid' },
				{ label: 'No price listed', value: 'unlisted' },
			],
		}
	},
	computed: {
		categories() {
			return [...new Set(this.apps.flatMap((app) => app.categories || []))].sort()
		},
		filteredApps() {
			const search = this.searchQuery.trim().toLowerCase()
			return this.apps.filter((app) => {
				const matchesSearch =
					!search ||
					`${app.title} ${app.name} ${app.description || ''}`
						.toLowerCase()
						.includes(search)
				const matchesCategory =
					!this.selectedCategory || (app.categories || []).includes(this.selectedCategory)
				return matchesSearch && matchesCategory && this.matchesPricingFilter(app)
			})
		},
		priceField() {
			return this.$team?.doc?.currency === 'INR' ? 'price_inr' : 'price_usd'
		},
	},
	methods: {
		matchesPricingFilter(app) {
			const plans = app.plans || []
			if (this.pricingFilter === 'all') return true
			if (this.pricingFilter === 'unlisted') return !plans.some((plan) => Number.isFinite(this.priceAmount(plan)))
			const hasFreePlan = plans.some((plan) => this.priceAmount(plan) === 0)
			const hasPaidPlan = plans.some((plan) => this.priceAmount(plan) > 0)
			return this.pricingFilter === 'free' ? hasFreePlan : hasPaidPlan
		},
		priceAmount(plan) {
			const value = plan[this.priceField]
			if (value === null || value === undefined || value === '') return NaN
			return Number(value)
		},
	},
}
</script>
