<template>
	<Header class="sticky top-0 z-10 bg-white">
		<div class="flex items-center space-x-2">
			<Breadcrumbs :items="[{ label: 'پنل فروشنده', route: '/seller' }]" />
		</div>
	</Header>
	<div class="px-5">
		<TabsWithRouter :tabs="tabs">
			<template #tab-item="{ tab }">
				<router-link
					:to="{ name: tab.routeName }"
					class="flex items-center gap-1.5 whitespace-nowrap py-2.5 text-base text-ink-gray-5 duration-300 ease-in-out hover:text-ink-gray-9 data-[state=active]:text-ink-gray-9"
				>
					<component :is="tab.icon" class="h-4 w-4" />
					{{ tab.label }}
				</router-link>
			</template>
			<template #tab-content>
				<router-view />
			</template>
		</TabsWithRouter>
	</div>
</template>

<script setup>
import { Breadcrumbs } from 'frappe-ui';
import Header from '../components/Header.vue';
import TabsWithRouter from '../components/TabsWithRouter.vue';

const tabs = [
	{
		label: 'نمای کلی',
		icon: LucideLayoutDashboard,
		routeName: 'SellerOverview',
	},
	{
		label: 'برنامه‌ها',
		icon: LucideStore,
		routeName: 'SellerApps',
	},
	{
		label: 'اشتراک‌ها',
		icon: LucideWalletCards,
		routeName: 'SellerSubscriptions',
	},
];
</script>
