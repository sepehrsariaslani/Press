<template>
	<div class="space-y-4 py-5">
		<div class="flex flex-wrap items-center gap-3">
			<input
				v-model="search"
				placeholder="جستجو در برنامه، سایت یا پلن..."
				class="h-8 w-full rounded border border-gray-200 px-3 text-sm focus:border-gray-400 focus:outline-none md:w-80"
			/>
			<select
				v-model="status"
				class="h-8 rounded border border-gray-200 px-2 text-sm focus:border-gray-400 focus:outline-none"
			>
				<option value="">همه وضعیت‌ها</option>
				<option value="active">فعال</option>
				<option value="inactive">غیرفعال</option>
			</select>
		</div>

		<div v-if="$resources.subscriptions.loading" class="rounded border p-6 text-sm text-gray-600">
			در حال بارگذاری اشتراک‌ها...
		</div>
		<div v-else-if="!filteredSubscriptions.length" class="rounded border p-6 text-sm text-gray-600">
			اشتراکی یافت نشد.
		</div>
		<div v-else class="overflow-auto rounded border">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr class="text-right text-xs font-medium uppercase tracking-wider text-gray-600">
						<th class="px-4 py-3">برنامه</th>
						<th class="px-4 py-3">سایت</th>
						<th class="px-4 py-3">پلن</th>
						<th class="px-4 py-3">بازه</th>
						<th class="px-4 py-3">وضعیت</th>
						<th class="px-4 py-3">مبلغ</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100 bg-white text-sm">
					<tr v-for="subscription in filteredSubscriptions" :key="subscription.name">
						<td class="px-4 py-3 font-medium text-gray-900">
							<router-link
								class="hover:underline"
								:to="{
									name: 'Marketplace App Detail',
									params: { name: subscription.document_name },
								}"
							>
								{{ appTitles[subscription.document_name] || subscription.document_name }}
							</router-link>
						</td>
						<td class="px-4 py-3 text-gray-700">{{ subscription.site || '-' }}</td>
						<td class="px-4 py-3 text-gray-700">{{ planTitles[subscription.plan] || subscription.plan || '-' }}</td>
						<td class="px-4 py-3 text-gray-700">{{ toPersianInterval(subscription.interval) }}</td>
						<td class="px-4 py-3">
							<Badge :label="subscription.enabled ? 'فعال' : 'غیرفعال'" />
						</td>
						<td class="px-4 py-3 text-gray-700">
							{{ $format.userCurrency(planPrices[subscription.plan] || 0) }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script>
import { getTeam } from '../../data/team';

export default {
	name: 'SellerSubscriptions',
	setup() {
		const $team = getTeam();
		return { $team };
	},
	data() {
		return {
			search: '',
			status: '',
		};
	},
	resources: {
		subscriptions() {
			return {
				url: 'press.api.client.get_list',
				auto: true,
				params: {
					doctype: 'Subscription',
					fields: [
						'name',
						'document_name',
						'plan',
						'interval',
						'enabled',
						'site',
						'creation',
					],
					filters: {
						document_type: 'Marketplace App',
					},
					order_by: 'creation desc',
					limit: 1000,
				},
				initialData: [],
			};
		},
		apps() {
			return {
				url: 'press.api.client.get_list',
				auto: true,
				params: {
					doctype: 'Marketplace App',
					fields: ['name', 'title'],
					limit: 500,
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
					fields: ['name', 'title', 'price_inr', 'price_usd'],
					limit: 1000,
				},
				initialData: [],
			};
		},
	},
	computed: {
		appTitles() {
			const out = {};
			for (const app of this.$resources.apps.data || []) {
				out[app.name] = app.title || app.name;
			}
			return out;
		},
		planTitles() {
			const out = {};
			for (const plan of this.$resources.plans.data || []) {
				out[plan.name] = plan.title || plan.name;
			}
			return out;
		},
		planPrices() {
			const out = {};
			const key = this.$team?.doc?.currency === 'INR' ? 'price_inr' : 'price_usd';
			for (const plan of this.$resources.plans.data || []) {
				out[plan.name] = Number(plan[key] || 0);
			}
			return out;
		},
		filteredSubscriptions() {
			const query = this.search.trim().toLowerCase();
			return (this.$resources.subscriptions.data || []).filter((subscription) => {
				if (this.status === 'active' && !subscription.enabled) return false;
				if (this.status === 'inactive' && subscription.enabled) return false;

				if (!query) return true;
				const appTitle = this.appTitles[subscription.document_name] || '';
				const planTitle = this.planTitles[subscription.plan] || '';
				return `${appTitle} ${planTitle} ${subscription.site || ''}`
					.toLowerCase()
					.includes(query);
			});
		},
	},
	methods: {
		toPersianInterval(interval) {
			if (interval === 'Yearly' || interval === 'Annually') return 'سالانه';
			if (interval === 'Monthly') return 'ماهانه';
			if (interval === 'Daily') return 'روزانه';
			if (interval === 'Hourly') return 'ساعتی';
			return interval || '-';
		},
	},
};
</script>
