<template>
	<section>
		<div class="mb-3 flex items-center justify-between gap-3">
			<div>
				<h2 class="text-lg font-semibold">سایت‌های مدیریت‌شده</h2>
				<p class="mt-1 text-sm text-gray-500">فقط چهار سایت مشتری در این فهرست قرار دارند.</p>
			</div>
		</div>
		<div class="grid gap-4 xl:grid-cols-2">
			<article v-for="site in sites" :key="site.domain" class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
					<h3 class="text-base font-semibold text-gray-900">{{ site.domain }}</h3>
					<p class="mt-1 text-xs text-gray-500">آخرین موجودی: {{ site.last_inventory_at || '—' }}</p>
					</div>
					<span class="rounded-full px-2.5 py-1 text-xs" :class="site.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'">{{ site.enabled ? 'فعال' : 'غیرفعال' }}</span>
				</div>
				<div v-if="canManageSiteTeams" class="mt-4">
					<label :for="`team-${site.domain}`" class="block text-sm font-medium text-gray-700">تیم دارای دسترسی سایت</label>
					<select :id="`team-${site.domain}`" v-model="selectedTeams[site.domain]" :disabled="locked" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50">
						<option value="">بدون تیم</option>
						<option v-for="team in teams" :key="team.name" :value="team.name">{{ team.name }}</option>
					</select>
					<p class="mt-1 text-xs font-normal text-gray-500">مالک یا مدیر این تیم در آسومی می‌تواند عملیات همین سایت را اجرا کند.</p>
					<Button class="mt-2" size="sm" :disabled="locked || selectedTeams[site.domain] === (site.team || '')" label="ذخیرهٔ دسترسی تیم" @click="saveTeam(site)" />
				</div>
				<p v-else class="mt-2 text-xs text-gray-500">تیم دسترسی: {{ site.team || 'تیمی به این سایت متصل نشده' }}</p>
				<div class="mt-4 flex flex-wrap gap-2">
					<span v-for="app in site.apps" :key="app.app" class="rounded-md bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700">
						{{ app.app }} <span class="text-gray-400">{{ app.version }}</span>
					</span>
					<span v-if="!site.apps?.length" class="text-sm text-gray-500">اطلاعات برنامه‌ها موجود نیست.</span>
				</div>
				<div class="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
					<Button size="sm" :disabled="locked" label="پشتیبان‌گیری" @click="emitAction('backup_site', site.domain)" />
					<Button size="sm" :disabled="locked" label="پاک‌کردن کش" @click="emitAction('clear_cache', site.domain)" />
					<Button size="sm" :disabled="locked" label="مهاجرت سایت" @click="emitAction('migrate_site', site.domain)" />
					<Button size="sm" :disabled="locked" label="روشن‌کردن تعمیر" @click="emitAction('set_maintenance', site.domain, { enabled: true })" />
					<Button size="sm" :disabled="locked" label="خاموش‌کردن تعمیر" @click="emitAction('set_maintenance', site.domain, { enabled: false })" />
					<Button size="sm" :disabled="locked" label="فعال‌کردن زمان‌بند" @click="emitAction('set_scheduler', site.domain, { enabled: true })" />
					<Button size="sm" :disabled="locked" label="غیرفعال‌کردن زمان‌بند" @click="emitAction('set_scheduler', site.domain, { enabled: false })" />
					<Button size="sm" :disabled="locked" label="مشاهدهٔ لاگ" @click="emitAction('read_site_logs', site.domain)" />
					<Button size="sm" :disabled="locked" label="بازیابی از پشتیبان" @click="emit('restore', site.domain)" />
				</div>
			</article>
		</div>
	</section>
</template>

<script setup>
import { reactive, watch } from 'vue';

const props = defineProps({ sites: { type: Array, default: () => [] }, teams: { type: Array, default: () => [] }, canManageSiteTeams: Boolean, locked: Boolean });
const emit = defineEmits(['action', 'restore', 'assign-team']);
const selectedTeams = reactive({});

watch(() => props.sites, (sites) => {
	for (const site of sites) selectedTeams[site.domain] = site.team || '';
}, { immediate: true, deep: true });

function emitAction(action, target, arguments_ = {}) {
	if (props.sites.some((site) => site.domain === target)) emit('action', { action, target, arguments: arguments_ });
}

function saveTeam(site) {
	if (!props.sites.some((item) => item.domain === site.domain)) return;
	const team = selectedTeams[site.domain] || '';
	const accessDescription = team ? `مالک و مدیران تیم «${team}»` : 'هیچ تیمی';
	if (window.confirm(`دسترسی عملیات مدیریتی سایت ${site.domain} به ${accessDescription} تغییر کند؟`)) {
		emit('assign-team', { domain: site.domain, team });
	}
}
</script>
