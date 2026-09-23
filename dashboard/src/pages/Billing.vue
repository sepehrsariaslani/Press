<template>
	<div class="sticky top-0 z-10 shrink-0">
		<Header>
			<FBreadcrumbs
				:items="[{ label: 'صورتحساب', route: { name: 'Billing' } }]"
			/>
		</Header>
		<TabsWithRouter
			v-if="$team?.doc?.is_desk_user || $session.hasBillingAccess"
			:tabs="tabs"
		/>
		<div
			v-else
			class="mx-auto mt-60 w-fit rounded border border-dashed px-12 py-8 text-center text-gray-600"
		>
			<lucide-alert-triangle class="mx-auto mb-4 h-6 w-6 text-red-600" />
			<ErrorMessage message="شما اجازه دسترسی به صفحه صورتحساب را ندارید" />
		</div>
	</div>
</template>
<script>
import { Tabs, Breadcrumbs } from 'frappe-ui';
import Header from '../components/Header.vue';
import TabsWithRouter from '../components/TabsWithRouter.vue';

export default {
	name: 'Billing',
	components: {
		Header,
		FBreadcrumbs: Breadcrumbs,
		FTabs: Tabs,
		TabsWithRouter,
	},
	data() {
		return {
			currentTab: 0,
		};
	},
	computed: {
		tabs() {
			const baseTabs = [
				{ label: 'نمای کلی', route: { name: 'BillingOverview' } },
				{ label: 'پیش‌بینی', route: { name: 'BillingForecast' } },
				{ label: 'فاکتورها', route: { name: 'BillingInvoices' } },
				{ label: 'موجودی‌ها', route: { name: 'BillingBalances' } },
				{ label: 'روش‌های پرداخت', route: { name: 'BillingPaymentMethods' } },
				{
					label: 'تسویه‌های مارکت‌پلیس',
					route: { name: 'BillingMarketplacePayouts' },
				},
			];

			// Add UPI Autopay tab for INR teams
			if (
				this.$team?.doc?.currency === 'INR' &&
				this.$team?.doc?.upi_autopay_enabled
			) {
				baseTabs.splice(5, 0, {
					label: 'پرداخت خودکار UPI',
					route: { name: 'BillingUPIAutopay' },
				});
			}

			return baseTabs;
		},
	},
};
</script>
