<template>
	<section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold">تاریخچهٔ عملیات</h2>
			<span class="text-xs text-gray-500">{{ operations.length }} مورد اخیر</span>
		</div>
		<div v-if="!operations.length" class="py-8 text-center text-sm text-gray-500">هنوز عملیاتی ثبت نشده است.</div>
		<div v-else class="mt-4 divide-y divide-gray-100">
			<article v-for="operation in operations" :key="operation.name" class="py-3 first:pt-0">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p class="font-medium text-gray-900">{{ label(operation.action) }} <span v-if="operation.target" class="text-gray-500">· {{ operation.target }}</span></p>
						<p class="mt-1 text-xs text-gray-500">{{ operation.actor }} · {{ operation.creation }}</p>
					</div>
					<span class="rounded-full px-2.5 py-1 text-xs" :class="statusClass(operation.status)">{{ statusLabel(operation.status) }}</span>
				</div>
				<p v-if="operation.progress" class="mt-2 text-sm text-gray-600">{{ operation.progress }}</p>
				<Button v-if="operation.status === 'Awaiting Confirmation'" size="sm" class="mt-2" :disabled="busy" label="بازبینی و ادامه" @click="$emit('resume', operation.name)" />
				<pre v-if="operation.result?.logs" class="mt-2 max-h-52 overflow-auto rounded-lg bg-gray-950 p-3 text-left text-xs text-gray-100" dir="ltr">{{ operation.result.logs }}</pre>
				<p v-if="operation.result?.error" class="mt-2 text-sm text-rose-700">{{ operation.result.error }}</p>
				<p v-if="operation.result?.backups?.length" class="mt-2 break-all text-xs text-gray-600">شناسهٔ پشتیبان: {{ operation.result.backups.map((item) => `${item.site}: ${item.backup_id}`).join(' · ') }}</p>
				<div v-if="operation.impact_sites?.includes('asumi.ir')" class="mt-2 text-xs font-medium text-amber-800">اثر مشترک این عملیات شامل asumi.ir بوده است.</div>
			</article>
		</div>
	</section>
</template>

<script setup>
defineProps({ operations: { type: Array, default: () => [] }, busy: Boolean });
defineEmits(['resume']);

function label(action) {
	return ({
		backup_site: 'پشتیبان‌گیری سایت',
		restore_site: 'بازیابی سایت',
		set_maintenance: 'وضعیت تعمیر',
		clear_cache: 'پاک‌کردن کش',
		set_scheduler: 'وضعیت زمان‌بند',
		migrate_site: 'مهاجرت سایت',
		read_site_logs: 'دریافت لاگ سایت',
		restart_service: 'راه‌اندازی دوبارهٔ سرویس',
		restart_stack: 'راه‌اندازی دوبارهٔ بنچ',
		deploy_app_revision: 'انتشار نسخهٔ برنامه',
		install_marketplace_app: 'نصب برنامهٔ Marketplace',
	})[action] || action;
}

function statusLabel(status) {
	return ({
		'Preparing Backup': 'در حال پشتیبان‌گیری',
		'Awaiting Confirmation': 'در انتظار تأیید',
		Queued: 'در صف',
		Running: 'در حال اجرا',
		Success: 'موفق',
		Failure: 'ناموفق',
	})[status] || status;
}

function statusClass(status) {
	if (status === 'Success') return 'bg-emerald-50 text-emerald-700';
	if (status === 'Failure') return 'bg-rose-50 text-rose-700';
	return 'bg-amber-50 text-amber-800';
}
</script>
