<template>
	<div class="space-y-5 py-5">
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-lg border p-4">
				<div class="text-sm text-gray-600">کل برنامه‌ها</div>
				<div class="mt-2 text-2xl font-semibold text-gray-900">
					{{ apps.length }}
				</div>
			</div>
			<div class="rounded-lg border p-4">
				<div class="text-sm text-gray-600">برنامه‌های منتشر شده</div>
				<div class="mt-2 text-2xl font-semibold text-gray-900">
					{{ publishedApps }}
				</div>
			</div>
			<div class="rounded-lg border p-4">
				<div class="text-sm text-gray-600">اشتراک‌های فعال</div>
				<div class="mt-2 text-2xl font-semibold text-gray-900">
					{{ activeSubscriptions }}
				</div>
			</div>
			<div class="rounded-lg border p-4">
				<div class="text-sm text-gray-600">درآمد تخمینی ماهانه</div>
				<div class="mt-2 text-2xl font-semibold text-gray-900">
					{{ $format.userCurrency(mrrEstimate) }}
				</div>
				<div class="mt-1 text-xs text-gray-500">
					درآمد سالانه تخمینی: {{ $format.userCurrency(arrEstimate) }}
				</div>
			</div>
		</div>

		<div class="grid gap-4 md:grid-cols-2">
			<div class="rounded-lg border p-4">
				<div class="mb-4 flex items-center justify-between">
					<div class="text-base font-medium">برنامه‌های اخیر</div>
					<Button variant="subtle" :route="{ name: 'SellerApps' }">
						مشاهده همه
					</Button>
				</div>
				<div v-if="$resources.apps.loading" class="py-6 text-sm text-gray-600">
					در حال بارگذاری...
				</div>
				<div v-else-if="!apps.length" class="py-6 text-sm text-gray-600">
					هنوز برنامه‌ای اضافه نشده است.
				</div>
				<div v-else class="space-y-2">
					<router-link
						v-for="app in recentApps"
						:key="app.name"
						class="flex items-center justify-between rounded border px-3 py-2 hover:bg-gray-50"
						:to="{ name: 'Marketplace App Detail Listing', params: { name: app.name } }"
					>
						<div class="text-sm font-medium text-gray-900">
							{{ app.title || app.name }}
						</div>
						<Badge :label="app.status" />
					</router-link>
				</div>
			</div>

			<div class="rounded-lg border p-4">
				<div class="mb-4 text-base font-medium">اقدام سریع</div>
				<div class="space-y-2">
					<Button class="w-full justify-start" :route="{ name: 'SellerApps' }">
						مدیریت برنامه‌ها و انتشار
					</Button>
					<Button
						class="w-full justify-start"
						variant="subtle"
						:route="{ name: 'SellerSubscriptions' }"
					>
						بررسی اشتراک‌های مشتری
					</Button>
					<Button
						class="w-full justify-start"
						variant="subtle"
						:route="{ name: 'Marketplace App List' }"
					>
						ورود به نمای کامل Marketplace
					</Button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { getTeam } from '../../data/team';

export default {
	name: 'SellerOverview',
	setup() {
		const $team = getTeam();
		return { $team };
	},
	resources: {
		apps() {
			return {
				url: 'press.api.client.get_list',
				auto: true,
				params: {
					doctype: 'Marketplace App',
					fields: ['name', 'title', 'status', 'modified'],
					order_by: 'modified desc',
					limit: 200,
				},
				initialData: [],
			};
		},
		plans() {
			return {
				url: 'press.api.client.get_list',
				auto: true,
				params: {
					doctype: 'Marketplace App Plan',
					fields: ['name', 'price_inr', 'price_usd'],
					limit: 500,
				},
				initialData: [],
			};
		},
		subscriptions() {
			return {
				url: 'press.api.client.get_list',
				auto: true,
				params: {
					doctype: 'Subscription',
					fields: ['name', 'enabled', 'plan', 'interval'],
					filters: {
						document_type: 'Marketplace App',
					},
					limit: 1000,
				},
				initialData: [],
			};
		},
	},
	computed: {
		apps() {
			return this.$resources.apps.data || [];
		},
		recentApps() {
			return this.apps.slice(0, 6);
		},
		publishedApps() {
			return this.apps.filter((app) => app.status === 'Published').length;
		},
		activeSubscriptions() {
			return (this.$resources.subscriptions.data || []).filter((s) => s.enabled).length;
		},
		planPrices() {
			const prices = {};
			const currency = this.$team?.doc?.currency === 'INR' ? 'price_inr' : 'price_usd';
			for (const plan of this.$resources.plans.data || []) {
				prices[plan.name] = Number(plan[currency] || 0);
			}
			return prices;
		},
		mrrEstimate() {
			let total = 0;
			for (const subscription of this.$resources.subscriptions.data || []) {
				if (!subscription.enabled) continue;
				const planPrice = this.planPrices[subscription.plan] || 0;
				if (subscription.interval === 'Yearly' || subscription.interval === 'Annually') {
					total += planPrice / 12;
				} else if (subscription.interval === 'Daily') {
					total += planPrice * 30;
				} else {
					total += planPrice;
				}
			}
			return total;
		},
		arrEstimate() {
			return this.mrrEstimate * 12;
		},
	},
};
</script>
