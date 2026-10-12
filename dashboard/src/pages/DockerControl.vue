<template>
	<div class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
		<header class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<p class="text-sm text-indigo-600">مدیریت زیرساخت</p>
				<h1 class="mt-1 text-2xl font-semibold text-gray-900">مدیریت Docker Bench</h1>
				<p class="mt-2 max-w-3xl text-sm leading-6 text-gray-600">وضعیت میزبان و چهار سایت را ببینید و عملیات مجاز را از همین پنل اجرا کنید.</p>
			</div>
			<div v-if="state.initialized && state.can_manage_host" class="flex flex-wrap gap-2">
				<select v-model="service" :disabled="busy || operationLocked" class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50" aria-label="انتخاب سرویس">
					<option v-for="item in services" :key="item" :value="item">{{ item }}</option>
				</select>
				<Button label="راه‌اندازی سرویس" :disabled="busy || operationLocked" @click="startAction({ action: 'restart_service', target: service, arguments: {} })" />
				<Button label="راه‌اندازی کل بنچ" :disabled="busy || operationLocked" @click="startAction({ action: 'restart_stack', target: null, arguments: {} })" />
			</div>
		</header>

		<div v-if="error" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{{ error }}</div>
		<div v-if="notice" class="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900" role="status" aria-live="polite">{{ notice }}</div>
		<div v-if="state.initialized && state.can_manage_host && !state.password_reset_email_ready" class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="status">ایمیل خروجی آسومی فعال نیست؛ مدیران سایت نمی‌توانند لینک بازیابی رمز دریافت کنند. برای ورود آن‌ها، ابتدا یک حساب SMTP خروجی در تنظیمات ایمیل Asumi فعال کنید.</div>
		<div v-if="loading" class="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">در حال دریافت وضعیت میزبان…</div>

		<section v-else-if="!state.initialized" class="mx-auto w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
			<h2 class="text-lg font-semibold">اتصال اولیه به میزبان</h2>
			<p class="mt-2 text-sm leading-6 text-gray-600">کلید HMAC عامل را از فایل امن روی میزبان وارد کنید. کلید فقط رمزگذاری‌شده در Press ذخیره می‌شود و دوباره نمایش داده نمی‌شود.</p>
			<label class="mt-5 block text-sm font-medium" for="agent-endpoint">نشانی خصوصی عامل</label>
			<input id="agent-endpoint" class="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-left text-sm" dir="ltr" :value="endpoint" readonly />
			<label class="mt-4 block text-sm font-medium" for="agent-key">کلید امن HMAC</label>
			<input id="agent-key" v-model="bootstrapKey" type="password" autocomplete="new-password" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-left" dir="ltr" placeholder="کلید حداقل ۳۲ نویسه‌ای" />
			<div class="mt-5 flex justify-end"><Button variant="solid" label="بررسی اتصال و ثبت چهار سایت" :loading="busy" :disabled="bootstrapKey.length < 32" @click="bootstrap" /></div>
		</section>

		<template v-else>
			<HostSummary v-if="state.can_manage_host" :host="state.host" :busy="busy" @refresh="refreshInventory" />
			<div v-if="state.can_manage_host" class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
				راه‌اندازی سرویس یا کل بنچ و انتشار برنامه روی هر پنج سایت اثر دارد: ابتدا از همه پشتیبان می‌گیریم و بعد تأیید جداگانه می‌خواهیم. این کارها ممکن است <strong>asumi.ir</strong> را موقتاً متوقف کنند؛ عملیات کارت هر سایت فقط همان سایت را تغییر می‌دهد.
			</div>
			<div v-if="state.can_manage_host" class="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
				<div class="flex-1">
					<h2 class="font-semibold">انتشار برنامه</h2>
					<p class="mt-1 text-xs text-gray-500">فقط نسخهٔ ثابت Git پذیرفته می‌شود؛ مخزن دارای تغییرات محلی قابل انتشار نیست.</p>
				</div>
				<select v-model="deployApp" :disabled="busy || operationLocked" class="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50" aria-label="برنامه برای انتشار">
					<option value="accounts">accounts</option>
					<option value="restaurant">restaurant</option>
				</select>
				<input v-model="revision" :disabled="busy || operationLocked" class="min-w-64 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50" dir="ltr" placeholder="SHA کامل ۴۰ نویسه‌ای" aria-label="نسخهٔ ثابت Git" />
				<Button label="پیش‌بررسی و انتشار" :disabled="busy || operationLocked || revision.length !== 40" @click="startAction({ action: 'deploy_app_revision', target: null, arguments: { app: deployApp, revision } })" />
			</div>
			<ManagedSites :sites="state.sites" :teams="state.teams" :can-manage-site-teams="state.can_manage_site_teams" :can-manage-admins="state.can_manage_host" :locked="busy || operationLocked" @action="startAction" @restore="requestRestore" @assign-team="saveSiteTeam" @sync-admins="syncSiteAdmins" />
			<OperationDetails :operations="state.operations" :busy="busy" @resume="resumeOperation" />
		</template>
		<ConfirmDockerOperation :open="confirmOpen" :operation="pendingOperation" :loading="busy" @close="closeConfirmation" @confirm="confirmOperation" />
	</div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import HostSummary from '@/components/docker-control/HostSummary.vue';
import ManagedSites from '@/components/docker-control/ManagedSites.vue';
import OperationDetails from '@/components/docker-control/OperationDetails.vue';
import ConfirmDockerOperation from '@/components/docker-control/ConfirmDockerOperation.vue';
import { callDockerControl, fetchDockerControl } from '@/data/dockerControl';

const endpoint = 'http://172.18.0.1:8769';
const state = reactive({ initialized: false, host: null, sites: [], operations: [], teams: [], can_manage_host: false, can_manage_site_teams: false, password_reset_email_ready: false });
const loading = ref(true);
const busy = ref(false);
const error = ref('');
const notice = ref('');
const bootstrapKey = ref('');
const service = ref('backend');
const deployApp = ref('accounts');
const revision = ref('');
const pendingOperation = ref({});
const confirmationToken = ref('');
const confirmOpen = ref(false);
let pollTimer;
const services = ['backend', 'websocket', 'queue-short', 'queue-long', 'scheduler', 'db', 'redis-cache', 'redis-queue'];
const operationLocked = computed(() => state.operations.some((item) => ['Preparing Backup', 'Awaiting Confirmation', 'Queued', 'Running'].includes(item.status)));

onMounted(loadDashboard);
onUnmounted(() => clearInterval(pollTimer));

async function loadDashboard() {
	loading.value = true;
	error.value = '';
	try {
		const data = await fetchDockerControl('get_dashboard_data');
		Object.assign(state, data);
		const active = state.operations.find((item) => ['Preparing Backup', 'Queued', 'Running'].includes(item.status));
		if (active) startPolling(active.name);
	} catch (failure) {
		error.value = failure?.messages?.[0] || failure?.message || 'دریافت اطلاعات پنل ناموفق بود.';
	} finally {
		loading.value = false;
	}
}

async function bootstrap() {
	busy.value = true;
	error.value = '';
	try {
		const data = await callDockerControl('bootstrap_agent', { endpoint, hmac_key: bootstrapKey.value });
		bootstrapKey.value = '';
		Object.assign(state, { initialized: true, ...data });
	} catch (failure) {
		error.value = failure?.messages?.[0] || failure?.message || 'ثبت عامل میزبان ناموفق بود.';
	} finally {
		busy.value = false;
	}
}

async function refreshInventory() {
	busy.value = true;
	error.value = '';
	try {
		const data = await callDockerControl('refresh_inventory');
		Object.assign(state, { initialized: true, ...data });
	} catch (failure) {
		error.value = failure?.messages?.[0] || failure?.message || 'دریافت موجودی ناموفق بود.';
	} finally {
		busy.value = false;
	}
}

async function saveSiteTeam({ domain, team }) {
	if (busy.value || !state.can_manage_site_teams) return;
	busy.value = true;
	error.value = '';
	try {
		const data = await callDockerControl('save_site_team', { domain, team });
		Object.assign(state, data);
	} catch (failure) {
		error.value = failure?.messages?.[0] || failure?.message || 'ذخیرهٔ تیم سایت ناموفق بود.';
	} finally {
		busy.value = false;
	}
}

async function syncSiteAdmins(domain) {
	if (busy.value || !state.can_manage_host || !state.sites.some((site) => site.domain === domain)) return;
	busy.value = true;
	error.value = '';
	notice.value = '';
	try {
		const result = await callDockerControl('sync_site_admins', { domain });
		notice.value = `همگام‌سازی ${domain} انجام شد؛ ${result.total} مدیر فعال، ${result.added} دسترسی تازه و ${result.removed} دسترسی لغوشده.`;
		await loadDashboard();
	} catch (failure) {
		error.value = failure?.messages?.[0] || failure?.message || 'همگام‌سازی مدیران سایت ناموفق بود؛ دسترسی‌های قبلی حفظ شدند.';
	} finally {
		busy.value = false;
	}
}

function requestRestore(domain) {
	const backupId = window.prompt(`شناسهٔ پشتیبان ثبت‌شده برای ${domain} را وارد کنید:`);
	if (backupId) startAction({ action: 'restore_site', target: domain, arguments: { backup_id: backupId.trim() } });
}

async function startAction(request) {
	if (busy.value || operationLocked.value) return;
	busy.value = true;
	error.value = '';
	try {
		const result = await callDockerControl('prepare_operation', request);
		state.operations.unshift({
			name: result.operation, action: result.action, target: result.target, status: result.status,
			actor: 'شما', impact_sites: result.impact_sites, backup_sites: result.backup_sites,
			migration_sites: result.migration_sites, arguments: result.arguments, progress: result.progress,
			result: result.result, creation: new Date().toLocaleString('fa-IR'),
		});
		if (result.status === 'Awaiting Confirmation') openConfirmation(result, result.confirmation_token);
		else startPolling(result.operation);
	} catch (failure) {
		error.value = failure?.messages?.[0] || failure?.message || 'آماده‌سازی عملیات ناموفق بود.';
	} finally {
		busy.value = false;
	}
}

function openConfirmation(operation, token) {
	const safeOperation = { ...operation };
	delete safeOperation.confirmation_token;
	pendingOperation.value = safeOperation;
	confirmationToken.value = token || operation.confirmation_token || '';
	confirmOpen.value = true;
}

function closeConfirmation() {
	confirmOpen.value = false;
	confirmationToken.value = '';
}

function startPolling(operationName) {
	clearInterval(pollTimer);
	pollTimer = setInterval(async () => {
		try {
			let operation = await fetchDockerControl('get_operation', { operation: operationName });
			updateOperation(operation);
			if (operation.status === 'Awaiting Confirmation') {
				operation = await fetchDockerControl('get_operation', { operation: operationName, issue_confirmation_token: 1 });
				updateOperation(operation);
				clearInterval(pollTimer);
				openConfirmation(operation, operation.confirmation_token);
			} else if (['Success', 'Failure'].includes(operation.status)) {
				clearInterval(pollTimer);
				await loadDashboard();
			}
		} catch (failure) {
			clearInterval(pollTimer);
			error.value = failure?.messages?.[0] || failure?.message || 'دریافت وضعیت عملیات ناموفق بود.';
		}
	}, 2500);
}

async function resumeOperation(operationName) {
	busy.value = true;
	error.value = '';
	try {
		const operation = await fetchDockerControl('get_operation', {
			operation: operationName,
			issue_confirmation_token: 1,
		});
		updateOperation(operation);
		openConfirmation(operation, operation.confirmation_token);
	} catch (failure) {
		error.value = failure?.messages?.[0] || failure?.message || 'بازیابی پیش‌نمایش تأیید ناموفق بود.';
	} finally {
		busy.value = false;
	}
}

function updateOperation(operation) {
	const safeOperation = { ...operation };
	delete safeOperation.confirmation_token;
	const index = state.operations.findIndex((item) => item.name === safeOperation.operation);
	if (index !== -1) state.operations[index] = { ...state.operations[index], ...safeOperation, name: safeOperation.operation };
}

async function confirmOperation() {
	if (!pendingOperation.value?.operation || !confirmationToken.value) return;
	busy.value = true;
	error.value = '';
	try {
		const operation = pendingOperation.value;
		const expected_preview = {
			action: operation.action, target: operation.target || null,
			arguments: operation.arguments || {}, impact_sites: operation.impact_sites || [],
			backup_sites: operation.backup_sites || [], migration_sites: operation.migration_sites || [],
		};
		await callDockerControl('confirm_operation', {
			operation: operation.operation, confirmation_token: confirmationToken.value, expected_preview,
		});
		closeConfirmation();
		startPolling(operation.operation);
	} catch (failure) {
		error.value = failure?.messages?.[0] || failure?.message || 'تأیید عملیات ناموفق بود.';
	} finally {
		busy.value = false;
	}
}
</script>
