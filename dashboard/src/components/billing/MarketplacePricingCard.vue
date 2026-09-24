<template>
	<article
		class="flex h-full flex-col rounded-lg border bg-surface-white p-4 transition-colors"
		:class="selected ? 'border-outline-gray-5 ring-1 ring-outline-gray-5' : 'border-outline-gray-1'"
	>
		<div class="flex items-start gap-3">
			<img
				v-if="app.image"
				:src="app.image"
				:alt="''"
				class="size-10 shrink-0 rounded-md border border-outline-gray-1 object-cover"
			/>
			<div
				v-else
				class="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-gray-2 text-sm font-semibold text-ink-gray-7"
				aria-hidden="true"
			>
				{{ app.title?.slice(0, 1) || '?' }}
			</div>

			<div class="min-w-0 flex-1">
				<h3 class="truncate text-sm font-semibold text-ink-gray-9">
					{{ app.title }}
				</h3>
				<p class="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-ink-gray-6">
					{{ app.description || 'No description provided.' }}
				</p>
			</div>

			<button
				type="button"
				class="flex size-11 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-5"
				:class="selected ? 'border-ink-gray-9 bg-ink-gray-9 text-surface-white' : 'border-outline-gray-2 text-ink-gray-6 hover:bg-surface-gray-1'"
				:aria-pressed="selected"
				:aria-label="`${selected ? 'Remove' : 'Add'} ${app.title} ${selected ? 'from' : 'to'} estimate`"
				@click="$emit('toggle')"
			>
				<lucide-check v-if="selected" class="size-4" aria-hidden="true" />
				<lucide-plus v-else class="size-4" aria-hidden="true" />
			</button>
		</div>

		<div class="mt-4 flex min-h-6 flex-wrap items-center gap-1.5">
			<span
				class="rounded-full px-2 py-0.5 text-xs font-medium"
				:class="pricingBadgeClass"
			>
				{{ pricingBadge }}
			</span>
			<span
				v-if="installed"
				class="rounded-full bg-surface-green-2 px-2 py-0.5 text-xs font-medium text-ink-green-2"
			>
				Installed
			</span>
			<span
				v-for="category in app.categories?.slice(0, 2)"
				:key="category"
				class="rounded-full bg-surface-gray-1 px-2 py-0.5 text-xs text-ink-gray-7"
			>
				{{ category }}
			</span>
		</div>

		<div class="mt-4 border-t border-outline-gray-1 pt-3">
			<label
				:for="`pricing-plan-${app.name}`"
				class="mb-1.5 block text-xs font-medium text-ink-gray-7"
			>
				Pricing plan
			</label>
			<select
				:id="`pricing-plan-${app.name}`"
				class="h-11 w-full rounded-md border border-outline-gray-2 bg-surface-white px-3 text-sm text-ink-gray-9 focus:outline-none focus:ring-2 focus:ring-outline-gray-5 disabled:cursor-not-allowed disabled:bg-surface-gray-1 disabled:text-ink-gray-5"
				:disabled="!orderedPlans.length"
				:value="activePlan?.name || ''"
				@change="selectPlan($event.target.value)"
			>
				<option v-for="plan in orderedPlans" :key="plan.name" :value="plan.name">
					{{ plan.title }} · {{ priceLabel(plan) }}
				</option>
				<option v-if="!orderedPlans.length" value="">
					Pricing not listed
				</option>
			</select>

			<div v-if="activePlan?.features?.length" class="mt-3">
				<details class="group">
					<summary
						class="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-ink-gray-7 hover:text-ink-gray-9 [&::-webkit-details-marker]:hidden"
					>
						<lucide-chevron-right
							class="size-3 transition-transform group-open:rotate-90"
							aria-hidden="true"
						/>
						{{ activePlan.features.length }} plan features
					</summary>
					<ul class="mt-1 space-y-1.5 pl-5">
						<li
							v-for="feature in activePlan.features"
							:key="feature"
							class="flex gap-2 text-xs leading-5 text-ink-gray-7"
						>
							<lucide-check class="mt-1 size-3 shrink-0 text-ink-green-2" aria-hidden="true" />
							<span>{{ feature }}</span>
						</li>
					</ul>
				</details>
			</div>
			<p v-else class="mt-3 text-xs leading-5 text-ink-gray-6">
				{{ orderedPlans.length ? 'No plan features listed.' : 'Contact the app publisher for pricing.' }}
			</p>
		</div>

		<div class="mt-auto pt-4">
			<button
				type="button"
				class="min-h-11 w-full rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-5 disabled:cursor-not-allowed disabled:opacity-60"
				:class="installed ? 'border-outline-gray-2 text-ink-gray-8 hover:bg-surface-gray-1' : 'border-ink-gray-9 bg-ink-gray-9 text-surface-white hover:bg-ink-gray-8'"
				:disabled="actionDisabled || busy"
				@click="$emit(installed && canChangePlan ? 'change-plan' : installed ? 'manage-site' : 'install')"
			>
				{{ actionLabel }}
			</button>
			<p v-if="actionHint" class="mt-2 text-center text-xs leading-5 text-ink-gray-5">
				{{ actionHint }}
			</p>
		</div>
	</article>
</template>

<script>
export default {
	name: 'MarketplacePricingCard',
	props: {
		app: { type: Object, required: true },
		selected: { type: Boolean, default: false },
		selectedPlan: { type: Object, default: null },
		currentPlanName: { type: String, default: '' },
		installed: { type: Boolean, default: false },
		canChangePlan: { type: Boolean, default: false },
		availableOnSite: { type: Boolean, default: false },
		availabilityChecked: { type: Boolean, default: false },
		siteReady: { type: Boolean, default: false },
		hasSite: { type: Boolean, default: false },
		busy: { type: Boolean, default: false },
	},
	emits: ['toggle', 'plan-select', 'install', 'change-plan', 'manage-site'],
	computed: {
		ownedApp() {
			return this.app.team === this.$team?.doc?.name
		},
		actionLabel() {
			if (this.busy) return 'Starting…'
			if (this.installed && this.canChangePlan) return 'Change plan'
			if (this.installed) return 'Manage on this site'
			if (!this.hasSite) return 'Create site and install'
			if (!this.siteReady) return 'Site setup in progress'
			if (!this.availabilityChecked) return 'Checking availability…'
			if (!this.availableOnSite) return 'Not available for this site'
			return 'Install on selected site'
		},
		actionDisabled() {
			if (this.installed) return false
			if (!this.hasSite) return !this.orderedPlans.length && !this.ownedApp
			if (!this.siteReady) return true
			if (!this.availabilityChecked || !this.availableOnSite) return true
			return !this.orderedPlans.length && !this.ownedApp
		},
		actionHint() {
			if (this.hasSite && this.siteReady && this.availabilityChecked && !this.availableOnSite) {
				return 'Choose another site to install this app.'
			}
			if (this.hasSite && this.siteReady && !this.availabilityChecked) {
				return 'Checking whether this app can be installed on the selected site.'
			}
			if (!this.orderedPlans.length && !this.ownedApp) return 'Ask the publisher for a price before installing.'
			return ''
		},
		priceField() {
			return this.$team?.doc?.currency === 'INR' ? 'price_inr' : 'price_usd'
		},
		orderedPlans() {
			return [...(this.app.plans || [])].sort((a, b) => {
				const firstPrice = this.priceAmount(a)
				const secondPrice = this.priceAmount(b)
				return (
					(Number.isFinite(firstPrice) ? firstPrice : Infinity) -
					(Number.isFinite(secondPrice) ? secondPrice : Infinity)
				)
			})
		},
		activePlan() {
			return (
				this.orderedPlans.find((plan) => plan.name === this.selectedPlan?.name) ||
				this.orderedPlans.find((plan) => plan.name === this.currentPlanName) ||
				this.orderedPlans[0]
			)
		},
		pricingBadge() {
			if (!this.orderedPlans.length) return 'Price not listed'
			const prices = this.orderedPlans
				.map((plan) => this.priceAmount(plan))
				.filter(Number.isFinite)
			const hasFreePlan = prices.includes(0)
			const hasPaidPlan = prices.some((price) => price > 0)
			if (!hasFreePlan && !hasPaidPlan) return 'Price not listed'
			if (hasFreePlan && hasPaidPlan) return 'Free and paid plans'
			return hasPaidPlan ? 'Paid plans' : 'Free'
		},
		pricingBadgeClass() {
			if (this.pricingBadge === 'Free') return 'bg-surface-green-2 text-ink-green-2'
			if (this.pricingBadge === 'Price not listed') return 'bg-surface-gray-2 text-ink-gray-6'
			return 'bg-surface-blue-2 text-ink-blue-2'
		},
	},
	methods: {
		priceAmount(plan) {
			const value = plan[this.priceField]
			if (value === null || value === undefined || value === '') return NaN
			return Number(value)
		},
		priceLabel(plan) {
			const amount = this.priceAmount(plan)
			if (!Number.isFinite(amount)) return 'Price not listed'
			if (amount === 0) return 'Free'
			return `${this.$format.userCurrency(amount, 0)}/month`
		},
		selectPlan(planName) {
			const plan = this.orderedPlans.find((option) => option.name === planName)
			if (plan) this.$emit('plan-select', plan)
		},
	},
}
</script>
