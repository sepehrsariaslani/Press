<template>
	<section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<p class="text-xs text-gray-500">میزبان Docker</p>
				<h2 class="mt-1 text-lg font-semibold text-gray-900">
					{{ host?.name || 'den-v16-docker' }}
				</h2>
				<p class="mt-1 text-sm text-gray-600">
					وضعیت عامل:
					<span :class="host?.status === 'Connected' ? 'text-emerald-700' : 'text-rose-700'">
						{{ host?.status === 'Connected' ? 'متصل' : 'قطع' }}
					</span>
					<span v-if="host?.agent_version" class="text-gray-500"> · نسخه {{ host.agent_version }}</span>
				</p>
			</div>
			<Button :loading="busy" label="بروزرسانی موجودی" @click="$emit('refresh')" />
		</div>
		<div v-if="host?.resources" class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<div class="rounded-lg bg-gray-50 p-3">
				<p class="text-xs text-gray-500">پردازنده</p>
				<p class="mt-1 font-medium">{{ host.resources.cpu_count || '—' }} هسته</p>
			</div>
			<div class="rounded-lg bg-gray-50 p-3">
				<p class="text-xs text-gray-500">حافظهٔ در دسترس</p>
				<p class="mt-1 font-medium">{{ bytes(host.resources.memory_available_bytes) }} / {{ bytes(host.resources.memory_total_bytes) }}</p>
			</div>
			<div class="rounded-lg bg-gray-50 p-3">
				<p class="text-xs text-gray-500">فضای آزاد دیسک</p>
				<p class="mt-1 font-medium">{{ bytes(host.resources.disk_free_bytes) }} / {{ bytes(host.resources.disk_total_bytes) }}</p>
			</div>
			<div class="rounded-lg bg-gray-50 p-3">
				<p class="text-xs text-gray-500">آخرین دریافت موجودی</p>
				<p class="mt-1 font-medium">{{ host.last_inventory_at || 'هنوز دریافت نشده' }}</p>
			</div>
		</div>
		<div v-if="host?.services?.length" class="mt-5">
			<h3 class="mb-2 text-sm font-semibold">سرویس‌های Compose</h3>
			<div class="flex flex-wrap gap-2">
				<span v-for="service in host.services" :key="service.service" class="rounded-full border px-3 py-1 text-xs" :class="service.state === 'running' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'">
					{{ service.service }}: {{ service.status }}
				</span>
			</div>
		</div>
	</section>
</template>

<script setup>
defineProps({ host: { type: Object, default: null }, busy: Boolean });
defineEmits(['refresh']);

function bytes(value) {
	if (value == null) return '—';
	const units = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت', 'ترابایت'];
	let size = Number(value);
	let index = 0;
	while (size >= 1024 && index < units.length - 1) {
		size /= 1024;
		index += 1;
	}
	return `${size.toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}
</script>
