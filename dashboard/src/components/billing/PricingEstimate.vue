<template>
	<section class="rounded-lg border border-outline-gray-1 bg-surface-white p-5">
		<div class="flex items-start justify-between gap-2">
			<div>
				<h2 class="text-base font-semibold text-ink-gray-9">Your estimate</h2>
				<p class="mt-1 text-xs text-ink-gray-6">
					{{ entries.length }} selected
				</p>
			</div>
			<button
				v-if="entries.length"
				type="button"
				class="min-h-11 px-2 text-xs font-medium text-ink-gray-6 underline decoration-outline-gray-3 underline-offset-4 hover:text-ink-gray-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-5"
				@click="$emit('clear')"
			>
				Clear
			</button>
		</div>

		<div
			v-if="entries.length"
			class="mt-4 max-h-48 divide-y divide-outline-gray-1 overflow-y-auto"
		>
			<div
				v-for="entry in entries"
				:key="entry.app.name"
				class="flex items-start justify-between gap-3 py-3 first:pt-0"
			>
				<div class="min-w-0">
					<p class="truncate text-sm font-medium text-ink-gray-9">
						{{ entry.app.title }}
					</p>
					<p class="mt-0.5 text-xs text-ink-gray-6">
						{{ entry.plan?.title || 'Pricing not listed' }}
					</p>
				</div>
				<span class="shrink-0 text-xs font-medium text-ink-gray-8">
					{{ entry.plan ? planPriceLabel(entry.plan) : '—' }}
				</span>
			</div>
		</div>

		<div v-else class="mt-4 rounded-md bg-surface-gray-1 px-4 py-4 text-center">
			<lucide-mouse-pointer-2
				class="mx-auto size-5 text-ink-gray-5"
				aria-hidden="true"
			/>
			<p class="mt-2 text-sm font-medium text-ink-gray-8">Choose apps to compare</p>
			<p class="mt-1 text-xs leading-5 text-ink-gray-6">
				Select an app and plan to see the combined monthly estimate.
			</p>
		</div>

		<div class="mt-4 border-t border-outline-gray-1 pt-4">
			<div class="flex items-baseline justify-between gap-3">
				<span class="text-sm font-medium text-ink-gray-7">App plans / month</span>
				<span class="text-xl font-semibold text-ink-gray-9">
					{{ $format.userCurrency(total, 0) }}
				</span>
			</div>
			<p class="mt-3 text-xs leading-5 text-ink-gray-6">
				Estimate covers app plans only. Site hosting and the site plan are charged
				separately.
			</p>
			<p v-if="unpricedCount" class="mt-2 text-xs font-medium text-ink-amber-3">
				{{ unpricedCount }} selected
				{{ unpricedCount === 1 ? 'app has' : 'apps have' }} no published price.
			</p>
		</div>
	</section>

	<div
		class="fixed inset-x-0 bottom-0 z-30 border-t border-outline-gray-1 bg-surface-white px-5 py-3 shadow-lg xl:hidden"
		aria-live="polite"
	>
		<div class="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
			<span class="text-xs text-ink-gray-6">{{ entries.length }} selected</span>
			<div class="text-right">
				<p class="text-xs text-ink-gray-6">App plans / month</p>
				<p class="text-base font-semibold text-ink-gray-9">
					{{ $format.userCurrency(total, 0) }}
				</p>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'PricingEstimate',
	props: {
		entries: { type: Array, default: () => [] },
		total: { type: Number, default: 0 },
		unpricedCount: { type: Number, default: 0 },
	},
	emits: ['clear'],
	computed: {
		priceField() {
			return this.$team?.doc?.currency === 'INR' ? 'price_inr' : 'price_usd'
		},
	},
	methods: {
		planPriceLabel(plan) {
			const value = plan[this.priceField]
			if (value === null || value === undefined || value === '') {
				return 'Price unavailable'
			}
			const price = Number(value)
			if (!Number.isFinite(price)) return 'Price unavailable'
			return price === 0 ? 'Free' : `${this.$format.userCurrency(price, 0)}/mo`
		},
	},
}
</script>
