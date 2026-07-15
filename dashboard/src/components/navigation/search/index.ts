import { computed } from 'vue';
import { getTeam } from '@/data/team';
import { session } from '@/data/session';
import { integrations } from './integrations';

export const index = computed(() => {
	const team = getTeam();

	const groups = {
		تنظیمات: {
			items: [
				{ name: 'پروفایل', route: '/settings/profile', icon: LucideUser },
				{ name: 'تیم', route: '/settings/team', icon: LucideUsers },
				{ name: 'توسعه‌دهنده', route: '/settings/developer', icon: LucideCode },
				{
					name: 'نقش‌ها',
					route: '/settings/permissions/roles',
					icon: LucideLock,
				},
			],
		},

		وضعیت: {
			items: [
				{
					name: 'اختلالات جاری',
					route: '/status/ongoing-incidents',
					icon: LucideTriangleAlert,
				},
				{
					name: 'تاریخچه اختلالات',
					route: '/status/incident-history',
					icon: LucideArchive,
				},
			],
		},

		'ابزار توسعه': {
			condition: team.doc?.onboarding?.complete && !team.doc?.is_saas_user,
			items: [
				{
					name: 'تحلیل دیتابیس',
					route: '/database-analyzer',
					icon: LucideActivity,
				},
				{
					name: 'محیط SQL',
					route: '/sql-playground',
					icon: LucideDatabaseZap,
				},
				{
					name: 'مرور Binlog',
					route: '/binlog-browser',
					icon: LucideFileSearch,
					condition: team.doc?.is_binlog_indexer_enabled ?? false,
				},
			],
		},

		صورتحساب: {
			condition: team.doc?.is_desk_user || session.hasBillingAccess,
			items: [
				{ name: 'نمای کلی', route: '/billing', icon: LucideWalletCards },
				{
					name: 'پیش‌بینی',
					route: '/billing/forecast',
					icon: LucideTrendingUpDown,
				},
				{
					name: 'فاکتورها',
					route: '/billing/invoices',
					icon: LucideReceiptText,
				},
				{ name: 'موجودی‌ها', route: '/billing/balances', icon: LucideWeight },
				{
					name: 'روش‌های پرداخت',
					route: '/billing/payment-methods',
					icon: LucideCreditCard,
				},
				{
					name: 'تسویه‌های مارکت‌پلیس',
					route: '/billing/payouts',
					icon: LucideStore,
					condition: team.doc?.is_desk_user,
				},
				{
					name: 'فاکتورهای Mpesa',
					route: '/billing/mpesa-invoices',
					icon: LucideReceiptText,
					condition: team.doc?.is_desk_user,
				},
				{
					name: 'پرداخت خودکار UPI',
					route: '/billing/upi-autopay',
					icon: LucideWalletCards,
					condition: team.doc?.is_desk_user,
				},
			],
		},

		'مدیریت شریک': {
			condition: team.doc?.is_desk_user,
			items: [
				{
					name: 'لیست شرکا',
					route: '/settings/partner-admin/partner-list',
					icon: LucideShield,
				},
				{
					name: 'لیست گواهینامه‌ها',
					route: '/settings/partner-admin/certificate-list',
					icon: LucideShield,
				},
				{
					name: 'سرنخ‌های ادمین',
					route: '/settings/partner-admin/partner-admin-lead-list',
					icon: LucideShield,
				},
				{
					name: 'منابع ادمین',
					route: '/settings/partner-admin/admin-resources',
					icon: LucideShield,
				},
				{
					name: 'ممیزی‌های ادمین',
					route: '/settings/partner-admin/admin-audits',
					icon: LucideShield,
				},
			],
		},

		همکاری: {
			condition: Boolean(team.doc?.erpnext_partner),
			items: [
				{ name: 'نمای کلی', route: '/partners/overview', icon: LucideGlobe },
				{
					name: 'جزئیات وب‌سایت',
					route: '/partners/website-details',
					icon: LucideGlobe,
				},
				{ name: 'مشتریان', route: '/partners/customers', icon: LucideGlobe },
				{ name: 'سرنخ‌ها', route: '/partners/partner-leads', icon: LucideGlobe },
				{
					name: 'گواهینامه‌ها',
					route: '/partners/certificates',
					icon: LucideGlobe,
				},
				{ name: 'منابع', route: '/partners/resources', icon: LucideGlobe },
				{
					name: 'مشارکت‌ها',
					route: '/partners/contributions',
					icon: LucideGlobe,
				},
				{ name: 'ممیزی‌ها', route: '/partners/audits', icon: LucideGlobe },
				{
					name: 'تنظیم پرداخت محلی',
					route: '/partners/local-payment-setup',
					icon: LucideGlobe,
				},
				{
					name: 'تسویه',
					route: '/partners/payment-payout',
					icon: LucideGlobe,
				},
				{
					name: 'داشبورد',
					route: '/partners/partner-dashboard',
					icon: LucideGlobe,
				},
			],
		},
		اقدامات: {
			items: [
				{
					name: 'درخواست دسترسی',
					icon: LucideKey,
					click: () => {
						document
							.querySelector('button[aria-label="Notifications btn"]')
							.click();
						setTimeout(() => {
							const tab = document.querySelectorAll(
								'.PopoverContent [role="tab"]',
							)[1];
							tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
						}, 0);
					},
				},
			],
		},
	};

	for (const [key, value] of Object.entries(integrations)) {
		groups[key] = {
			...value,
			items: value.items.filter((item) => item.condition ?? true),
		};
	}

	return Object.fromEntries(
		Object.entries(groups)
			.filter(([_, section]) => section.condition ?? true)
			.map(([name, section]) => [
				name,
				{
					...section,
					items: section.items.filter((item) => item.condition ?? true),
				},
			]),
	);
});
