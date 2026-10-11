<template>
	<div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="$emit('close')">
		<section class="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
			<div class="flex items-start justify-between gap-4">
				<div>
					<h2 id="confirm-title" class="text-lg font-semibold">بررسی و تأیید عملیات</h2>
					<p class="mt-1 text-sm text-gray-600">{{ label(operation.action) }}<span v-if="operation.target"> · {{ operation.target }}</span></p>
				</div>
				<button class="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="بستن" @click="$emit('close')">×</button>
			</div>
			<div class="mt-5 space-y-4 text-sm">
				<div v-if="operation.arguments?.app" class="rounded-lg bg-gray-50 p-3">
					<p>برنامه: <strong>{{ operation.arguments.app }}</strong></p>
					<p class="mt-1 break-all">نسخهٔ ثابت: <code dir="ltr">{{ operation.arguments.revision }}</code></p>
				</div>
				<div v-if="operation.action === 'restore_site'" class="rounded-lg bg-gray-50 p-3">
					<p>نسخهٔ انتخاب‌شده برای بازیابی</p>
					<p class="mt-1 break-all"><code dir="ltr">{{ operation.arguments.backup_id }}</code></p>
				</div>
				<div v-if="['set_maintenance', 'set_scheduler'].includes(operation.action)" class="rounded-lg bg-gray-50 p-3">
					{{ operation.action === 'set_maintenance' ? 'حالت تعمیر' : 'زمان‌بند' }}:
					<strong>{{ operation.arguments.enabled ? 'روشن' : 'خاموش' }}</strong>
				</div>
				<div v-if="operation.action === 'restart_service'" class="rounded-lg bg-gray-50 p-3">سرویس: <strong>{{ operation.target }}</strong></div>
				<div v-if="operation.arguments?.services?.length || operation.arguments?.restart_services?.length" class="rounded-lg bg-gray-50 p-3">
					<p class="font-semibold">سرویس‌هایی که تغییر می‌کنند</p>
					<p class="mt-1 text-gray-600">{{ (operation.arguments.services || operation.arguments.restart_services).join('، ') }}</p>
				</div>
				<div v-if="operation.backup_sites?.length">
					<p class="font-semibold">ابتدا از این سایت‌ها پشتیبان گرفته شد</p>
					<p class="mt-1 text-gray-600">{{ operation.backup_sites.join('، ') }}</p>
				</div>
				<div v-if="operation.migration_sites?.length">
					<p class="font-semibold">سایت‌هایی که مهاجرت می‌شوند</p>
					<p class="mt-1 text-gray-600">{{ operation.migration_sites.join('، ') }}</p>
				</div>
				<div v-if="operation.impact_sites?.length" class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950">
					<p class="font-semibold">سایت‌های متأثر از این عملیات</p>
					<p class="mt-1">{{ operation.impact_sites.join('، ') }}</p>
					<p v-if="operation.impact_sites.includes('asumi.ir')" class="mt-2 font-semibold">asumi.ir هم درگیر وقفه یا تغییر این عملیات می‌شود.</p>
				</div>
				<div v-if="operation.result?.backups?.length">
					<p class="font-semibold">پشتیبان‌های آماده</p>
					<p v-for="backup in operation.result.backups" :key="backup.site" class="mt-1 break-all text-gray-600">{{ backup.site }} · {{ backup.backup_id }}</p>
				</div>
				<p v-if="operation.action.startsWith('restart') || operation.action === 'deploy_app_revision'" class="text-amber-800">در زمان اجرا، درخواست‌های سایت‌های مشترک ممکن است موقتاً قطع شوند.</p>
				<p v-if="operation.confirmation_expires_at" class="text-xs text-gray-500">مهلت تأیید: {{ operation.confirmation_expires_at }}</p>
			</div>
			<div class="mt-6 flex justify-end gap-2">
				<Button label="بازگشت" @click="$emit('close')" />
				<Button variant="solid" theme="red" :loading="loading" label="تأیید و اجرا" @click="$emit('confirm')" />
			</div>
		</section>
	</div>
</template>

<script setup>
defineProps({ open: Boolean, loading: Boolean, operation: { type: Object, default: () => ({}) } });
defineEmits(['close', 'confirm']);

function label(action) {
	return ({
		set_maintenance: 'تغییر وضعیت تعمیر', clear_cache: 'پاک‌کردن کش', set_scheduler: 'تغییر زمان‌بند',
		migrate_site: 'مهاجرت سایت', restore_site: 'بازیابی سایت', restart_service: 'راه‌اندازی سرویس',
		restart_stack: 'راه‌اندازی کل بنچ', deploy_app_revision: 'انتشار نسخهٔ برنامه',
	})[action] || action;
}
</script>
