<template>
	<div class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
		<header class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<p class="text-sm font-medium text-rose-700">آسومی · خرید امن برنامه‌ها</p>
				<h1 class="mt-1 text-2xl font-semibold text-gray-950">خرید و سفارش‌ها</h1>
				<p class="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
					تعرفهٔ برنامه‌های نصب‌شده روی سایتتان را ببینید، سفارش ثبت کنید و وضعیت تحویل را دنبال کنید.
				</p>
			</div>
			<Button label="بروزرسانی" :loading="loading" @click="refresh" />
		</header>

		<div v-if="notice" class="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="status">{{ notice }}</div>
		<div v-if="error" class="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-950" role="alert">{{ error }}</div>

		<section class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h2 class="text-lg font-semibold text-gray-950">تعرفه‌های قابل خرید</h2>
					<p class="mt-1 text-sm text-gray-600">فقط برنامه‌هایی نمایش داده می‌شوند که روی سایت انتخابی نصب هستند.</p>
				</div>
				<label class="min-w-64 text-sm font-medium text-gray-700">
					سایت
					<select v-model="selectedSite" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
						<option value="">انتخاب سایت</option>
						<option v-for="site in sites.data || []" :key="site.name" :value="site.name">{{ site.subdomain }}.{{ site.domain }}</option>
					</select>
				</label>
			</div>

			<div v-if="!selectedSite" class="mt-5 rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">برای دیدن تعرفه‌ها یک سایت فعال انتخاب کنید.</div>
			<div v-else-if="plans.loading" class="mt-5 rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">در حال دریافت تعرفه‌ها…</div>
			<div v-else-if="!(plans.data?.plans?.length)" class="mt-5 rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">برای برنامه‌های نصب‌شده روی این سایت، تعرفهٔ پولی ثبت نشده است.</div>
			<div v-else class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				<article v-for="plan in plans.data.plans" :key="plan.name" class="flex flex-col rounded-xl border border-gray-200 p-5">
					<div class="flex-1">
						<p class="text-xs font-medium text-rose-700">{{ plan.app_title }}</p>
						<h3 class="mt-1 text-lg font-semibold text-gray-950">{{ plan.title || 'تعرفه' }}</h3>
						<p class="mt-1 text-sm text-gray-600">دوره: {{ intervalLabel(plan.interval) }}</p>
					</div>
					<div class="mt-5 flex items-baseline gap-2">
						<strong class="text-xl font-semibold text-gray-950">{{ money(plan.price_irr) }}</strong>
						<span class="text-sm text-gray-500">ریال</span>
					</div>
					<Button class="mt-4 w-full" variant="solid" :disabled="!plans.data.checkout_enabled || busy" :loading="busyPlan === plan.name" label="ثبت سفارش و پرداخت" @click="purchase(plan)" />
				</article>
			</div>
			<p v-if="plans.data?.message" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">{{ plans.data.message }}</p>
		</section>

		<section class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between gap-3">
				<div>
					<h2 class="text-lg font-semibold text-gray-950">سفارش‌های من</h2>
					<p class="mt-1 text-sm text-gray-600">وضعیت پرداخت و تحویل هر سفارش در این بخش ثبت می‌شود.</p>
				</div>
				<span class="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">{{ orders.data?.length || 0 }} سفارش</span>
			</div>
			<div v-if="!orders.loading && !(orders.data?.length)" class="mt-5 rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">هنوز سفارشی ثبت نکرده‌اید.</div>
			<div v-else class="mt-4 divide-y divide-gray-100">
				<div v-for="order in orders.data || []" :key="order.name" class="flex flex-wrap items-center justify-between gap-4 py-4">
					<div>
						<p class="font-medium text-gray-950">{{ order.plan }} · {{ order.site }}</p>
						<p class="mt-1 text-xs text-gray-500">{{ order.name }} · {{ dateLabel(order.creation) }}<span v-if="order.service_ends_at"> · پایان دوره: {{ dateLabel(order.service_ends_at) }}</span></p>
						<p v-if="order.provisioning_error || order.payment_error" class="mt-1 text-sm text-rose-700">{{ order.provisioning_error || order.payment_error }}</p>
					</div>
					<div class="flex items-center gap-3">
						<strong class="text-sm text-gray-900">{{ money(order.amount) }} {{ order.currency }}</strong>
						<span class="rounded-full px-3 py-1 text-xs font-medium" :class="statusClass(order.status)">{{ statusLabel(order.status) }}</span>
						<a v-if="order.status === 'Pending Payment' && order.checkout_url" :href="order.checkout_url" rel="noopener noreferrer" class="text-sm font-medium text-rose-700 hover:text-rose-900">ادامه پرداخت</a>
					</div>
				</div>
			</div>
		</section>

		<section v-if="isCommerceAdmin" class="rounded-2xl border border-gray-900 bg-gray-950 p-5 text-white shadow-sm">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p class="text-sm font-medium text-rose-300">مدیریت آسومی</p>
					<h2 class="mt-1 text-lg font-semibold">تنظیمات پرداخت و تعرفه‌ها</h2>
					<p class="mt-1 max-w-3xl text-sm leading-6 text-gray-300">شناسهٔ پذیرنده محرمانه ذخیره می‌شود و هیچ‌وقت دوباره در صفحه نمایش داده نمی‌شود. پرداخت تا زمان ثبت شناسه و فعال‌سازی مدیر غیرفعال می‌ماند.</p>
				</div>
				<span class="rounded-full border border-gray-700 px-3 py-1 text-xs" :class="settings.data?.enabled && settings.data?.merchant_id_configured ? 'text-emerald-300' : 'text-amber-200'">{{ settings.data?.enabled && settings.data?.merchant_id_configured ? 'درگاه فعال' : 'درگاه غیرفعال' }}</span>
			</div>

			<div v-if="settings.data" class="mt-5 grid gap-4 md:grid-cols-2">
				<label class="flex items-center gap-3 rounded-xl border border-gray-800 p-4 text-sm"><input v-model="settingsForm.enabled" type="checkbox" class="rounded border-gray-600 text-rose-600 focus:ring-rose-500" /> فعال‌سازی checkout آسومی</label>
				<label class="flex items-center gap-3 rounded-xl border border-gray-800 p-4 text-sm"><input v-model="settingsForm.allow_marketplace_app_sales" type="checkbox" class="rounded border-gray-600 text-rose-600 focus:ring-rose-500" /> فروش تعرفهٔ برنامه‌ها</label>
				<label class="flex items-center gap-3 rounded-xl border border-gray-800 p-4 text-sm"><input v-model="settingsForm.sandbox_mode" type="checkbox" class="rounded border-gray-600 text-rose-600 focus:ring-rose-500" /> حالت آزمایشی زرین‌پال</label>
				<label class="text-sm">شناسهٔ پذیرندهٔ زرین‌پال
					<input v-model="merchantId" type="password" autocomplete="new-password" class="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder:text-gray-500" placeholder="برای حفظ مقدار فعلی خالی بگذارید" />
					<span class="mt-1 block text-xs text-gray-400">{{ settings.data.merchant_id_configured ? 'شناسه قبلاً ثبت شده است.' : 'هنوز شناسه‌ای ثبت نشده است.' }}</span>
				</label>
			</div>
			<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
				<p class="text-xs leading-5 text-gray-400">فروش سرویس میزبانی تا تکمیل بررسی ظرفیت بنچ و روند تحویل، از این صفحه غیرفعال است.</p>
				<Button variant="solid" label="ذخیره تنظیمات پرداخت" :loading="savingSettings" @click="saveSettings" />
			</div>
		</section>

		<section v-if="isCommerceAdmin" class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-lg font-semibold text-gray-950">تعرفهٔ برنامه‌های Marketplace</h2>
					<p class="mt-1 text-sm text-gray-600">برای رایگان‌ماندن، مبلغ هر ارز را صفر نگه دارید. پرداخت ریالی زرین‌پال برای مبلغ‌های پولی از ۱۰٬۰۰۰ ریال شروع می‌شود. تغییر قیمت تعرفه‌ای با مشترک فعال رد می‌شود؛ تعرفهٔ تازه بسازید.</p>
				</div>
				<Button label="دریافت فهرست" :loading="appPlans.loading" @click="appPlans.fetch()" />
			</div>
			<div v-if="appPlans.data?.length" class="mt-4 overflow-x-auto">
				<table class="w-full min-w-[880px] text-sm">
					<thead class="border-b border-gray-200 text-right text-xs text-gray-500"><tr><th class="py-3 pr-2">برنامه / تعرفه</th><th>دوره</th><th>INR</th><th>USD</th><th>IRR</th><th>وضعیت</th><th></th></tr></thead>
					<tbody class="divide-y divide-gray-100">
						<tr v-for="row in appPlans.data" :key="row.name">
							<td class="py-3 pr-2"><strong>{{ row.app_title }}</strong><input v-model="row.title" class="mt-1 block w-48 rounded-md border border-gray-300 px-2 py-1 text-xs" aria-label="نام تعرفه" /></td>
							<td><select v-model="row.interval" class="rounded-md border border-gray-300 px-2 py-1"><option value="Daily">روزانه</option><option value="Monthly">ماهانه</option><option value="Yearly">سالانه</option></select></td>
							<td><input v-model="row.price_inr" type="number" min="0" step="0.01" class="w-28 rounded-md border border-gray-300 px-2 py-1" /></td>
							<td><input v-model="row.price_usd" type="number" min="0" step="0.01" class="w-28 rounded-md border border-gray-300 px-2 py-1" /></td>
							<td><input v-model="row.price_irr" type="number" min="0" step="1" class="w-32 rounded-md border border-gray-300 px-2 py-1" /></td>
							<td><label class="flex items-center gap-2"><input v-model="row.enabled" type="checkbox" /> فعال</label></td>
							<td><Button label="ذخیره" @click="saveAppPrices(row)" /></td>
						</tr>
					</tbody>
				</table>
			</div>
			<p v-else class="mt-4 rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">تعرفه‌ای برای نمایش وجود ندارد.</p>
		</section>

		<section v-if="isCommerceAdmin" class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
			<div>
				<h2 class="text-lg font-semibold text-gray-950">تعرفه‌های میزبانی</h2>
				<p class="mt-1 text-sm leading-6 text-gray-600">روش تحویل هر پلن را انتخاب کن. مبلغ صفر یعنی رایگان؛ پرداخت ریالی پولی باید حداقل ۱۰٬۰۰۰ ریال باشد. خرید میزبانی تا آماده‌شدن ظرفیت و مسیر تحویل خودکار غیرفعال است.</p>
			</div>
			<div v-if="sitePlans.data?.length" class="mt-4 overflow-x-auto">
				<table class="w-full min-w-[1000px] text-sm">
					<thead class="border-b border-gray-200 text-right text-xs text-gray-500"><tr><th class="py-3 pr-2">تعرفه</th><th>روش تحویل</th><th>INR</th><th>USD</th><th>IRR</th><th>دوره</th><th></th></tr></thead>
					<tbody class="divide-y divide-gray-100">
						<tr v-for="row in sitePlans.data" :key="row.name">
							<td class="py-3 pr-2"><strong>{{ row.plan_title || row.name }}</strong><span class="block text-xs text-gray-500">{{ row.enabled ? 'فعال' : 'غیرفعال' }}</span></td>
							<td><select v-model="row.commerce_delivery_mode" class="min-w-44 rounded-md border border-gray-300 px-2 py-1" :aria-label="`روش تحویل ${row.plan_title || row.name}`"><option value="Upgrade Existing Site">ارتقای سایت موجود</option><option value="Create New Site">ساخت سایت جدید</option></select></td>
							<td><input v-model="row.price_inr" type="number" min="0" step="0.01" class="w-28 rounded-md border border-gray-300 px-2 py-1" /></td>
							<td><input v-model="row.price_usd" type="number" min="0" step="0.01" class="w-28 rounded-md border border-gray-300 px-2 py-1" /></td>
							<td><input v-model="row.price_irr" type="number" min="0" step="1" class="w-32 rounded-md border border-gray-300 px-2 py-1" /></td>
							<td>{{ intervalLabel(row.interval) }}</td>
							<td><Button label="ذخیره" @click="saveSitePrices(row)" /></td>
						</tr>
					</tbody>
				</table>
			</div>
			<p v-else class="mt-4 rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">فعلاً تعرفهٔ میزبانی ثبت نشده است. بعد از ایجاد Site Plan، قیمتش را در همین جدول وارد کنید. <a href="/app/site-plan" class="font-medium text-rose-700 underline">ساخت تعرفهٔ میزبانی</a></p>
		</section>

		<section v-if="isCommerceAdmin" class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-lg font-semibold text-gray-950">مدیریت سفارش‌ها</h2>
					<p class="mt-1 text-sm text-gray-600">ابتدا بازپرداخت را در پنل زرین‌پال انجام دهید و سپس شمارهٔ پیگیری را اینجا ثبت کنید. تحویل ناموفق را هم می‌توانید دوباره به صف بفرستید.</p>
				</div>
				<Button label="دریافت سفارش‌ها" :loading="adminOrders.loading" @click="adminOrders.fetch()" />
			</div>
			<div v-if="adminOrders.data?.length" class="mt-4 overflow-x-auto">
				<table class="w-full min-w-[850px] text-sm">
					<thead class="border-b border-gray-200 text-right text-xs text-gray-500"><tr><th class="py-3 pr-2">سفارش</th><th>مشتری / تیم</th><th>مبلغ</th><th>وضعیت</th><th>خطای تحویل</th><th></th></tr></thead>
					<tbody class="divide-y divide-gray-100">
						<tr v-for="order in adminOrders.data" :key="order.name">
							<td class="py-3 pr-2"><strong>{{ order.name }}</strong><span class="block text-xs text-gray-500">{{ order.plan }} · {{ order.site }}</span></td>
							<td>{{ order.customer }}<span class="block text-xs text-gray-500">{{ order.team }}</span></td>
							<td>{{ money(order.amount) }} {{ order.currency }}</td>
							<td>{{ statusLabel(order.status) }}<span v-if="order.refund_reference" class="block text-xs text-gray-500">مرجع بازپرداخت: {{ order.refund_reference }}</span></td>
							<td class="max-w-64 truncate text-rose-700">{{ order.provisioning_error || order.payment_error || '—' }}</td>
							<td class="flex items-center gap-2 py-2">
								<Button v-if="order.status === 'Provisioning Failed'" label="تلاش مجدد تحویل" :loading="retrying === order.name" @click="retry(order)" />
								<template v-if="['Paid', 'Active', 'Provisioning Failed'].includes(order.status)">
									<input v-model="refundReferences[order.name]" class="w-36 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900" placeholder="شمارهٔ پیگیری" :aria-label="`شمارهٔ بازپرداخت ${order.name}`" />
									<Button label="ثبت بازپرداخت" :disabled="!refundReferences[order.name]?.trim()" :loading="refunding === order.name" @click="recordRefund(order)" />
								</template>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p v-else class="mt-4 rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">هنوز سفارشی ثبت نشده است.</p>
		</section>
	</div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { createResource } from 'frappe-ui';
import { session } from '@/data/session';
import { canManageAsumiCommerce } from '@/utils/commerceAccess';

const isCommerceAdmin = computed(() => canManageAsumiCommerce(session));
const selectedSite = ref('');
const merchantId = ref('');
const busyPlan = ref('');
const retrying = ref('');
const refunding = ref('');
const refundReferences = reactive({});
const savingSettings = ref(false);
const error = ref('');
const notice = ref('');
const settingsForm = reactive({ enabled: false, allow_marketplace_app_sales: false, sandbox_mode: true });

const sites = createResource({ url: 'press.saas.commerce.api.my_purchase_sites', auto: true });
const orders = createResource({ url: 'press.saas.commerce.api.my_orders', auto: true });
const plans = createResource({ url: 'press.saas.commerce.api.available_app_plans' });
const settings = createResource({
	url: 'press.saas.commerce.api.admin_settings',
	auto: isCommerceAdmin.value,
	onSuccess(data) { Object.assign(settingsForm, data); },
});
const appPlans = createResource({ url: 'press.saas.commerce.api.admin_marketplace_plans', auto: isCommerceAdmin.value });
const sitePlans = createResource({ url: 'press.saas.commerce.api.admin_site_plans', auto: isCommerceAdmin.value });
const adminOrders = createResource({ url: 'press.saas.commerce.api.admin_orders', auto: isCommerceAdmin.value });
const saveSettingsResource = createResource({ url: 'press.saas.commerce.api.save_admin_settings' });
const saveAppPriceResource = createResource({ url: 'press.saas.commerce.api.save_marketplace_plan_prices' });
const saveSitePriceResource = createResource({ url: 'press.saas.commerce.api.save_site_plan_prices' });
const retryResource = createResource({ url: 'press.saas.commerce.api.retry_provisioning' });
const refundResource = createResource({ url: 'press.saas.commerce.api.record_refund' });
const startPurchaseResource = createResource({ url: 'press.saas.commerce.api.start_marketplace_app_purchase' });

const loading = computed(() => sites.loading || orders.loading);
const busy = computed(() => Boolean(busyPlan.value));

watch(selectedSite, async (site) => {
	if (!site) return;
	error.value = '';
	try { await plans.fetch({ site }); } catch (failure) { showError(failure); }
});

async function purchase(plan) {
	if (!selectedSite.value || busy.value) return;
	error.value = '';
	busyPlan.value = plan.name;
	try {
		const result = await startPurchaseResource.submit({ plan: plan.name, site: selectedSite.value });
		const checkout = result?.checkout_url || result?.message?.checkout_url;
		if (!checkout || !checkout.startsWith('https://')) throw new Error('نشانی امن پرداخت از سرور دریافت نشد.');
		window.location.assign(checkout);
	} catch (failure) { showError(failure); } finally { busyPlan.value = ''; }
}

async function saveSettings() {
	error.value = '';
	savingSettings.value = true;
	try {
		const result = await saveSettingsResource.submit({ ...settingsForm, merchant_id: merchantId.value || undefined });
		merchantId.value = '';
		await settings.fetch();
		notice.value = 'تنظیمات درگاه ذخیره شد. پرداخت فقط با شناسهٔ معتبر پذیرنده قابل استفاده است.';
	} catch (failure) { showError(failure); } finally { savingSettings.value = false; }
}


async function saveAppPrices(row) {
	error.value = '';
	try {
		await saveAppPriceResource.submit({ plan: row.name, title: row.title || '', enabled: row.enabled, interval: row.interval, price_inr: row.price_inr, price_usd: row.price_usd, price_irr: row.price_irr });
		await Promise.all([appPlans.fetch(), plans.data?.site ? plans.fetch({ site: plans.data.site }) : Promise.resolve()]);
		notice.value = 'قیمت تعرفهٔ برنامه ذخیره شد.';
	} catch (failure) { showError(failure); }
}

async function saveSitePrices(row) {
	error.value = '';
	try {
		await saveSitePriceResource.submit({ plan: row.name, price_inr: row.price_inr, price_usd: row.price_usd, price_irr: row.price_irr, delivery_mode: row.commerce_delivery_mode });
		await sitePlans.fetch();
		notice.value = 'قیمت تعرفهٔ میزبانی ذخیره شد.';
	} catch (failure) { showError(failure); }
}

async function retry(order) {
	retrying.value = order.name;
	error.value = '';
	try {
		await retryResource.submit({ order: order.name });
		await Promise.all([adminOrders.fetch(), orders.fetch()]);
		notice.value = 'تلاش مجدد تحویل به صف پردازش فرستاده شد.';
	} catch (failure) { showError(failure); } finally { retrying.value = ''; }
}

async function recordRefund(order) {
	const refundReference = refundReferences[order.name]?.trim();
	if (!refundReference || !window.confirm('تأیید می‌کنی که مبلغ این سفارش قبلاً در پنل زرین‌پال بازگردانده شده است؟')) return;
	refunding.value = order.name;
	error.value = '';
	try {
		await refundResource.submit({ order: order.name, refund_reference: refundReference });
		delete refundReferences[order.name];
		await Promise.all([adminOrders.fetch(), orders.fetch()]);
		notice.value = 'بازپرداخت انجام‌شده در سابقهٔ سفارش ثبت شد.';
	} catch (failure) { showError(failure); } finally { refunding.value = ''; }
}

async function refresh() {
	error.value = '';
	try {
		const calls = [sites.fetch(), orders.fetch()];
		if (isCommerceAdmin.value) calls.push(settings.fetch(), appPlans.fetch(), sitePlans.fetch(), adminOrders.fetch());
		if (selectedSite.value) calls.push(plans.fetch({ site: selectedSite.value }));
		await Promise.all(calls);
	} catch (failure) { showError(failure); }
}

function showError(failure) {
	error.value = failure?.messages?.[0] || failure?.message || 'عملیات ناموفق بود.';
}
function money(value) { return new Intl.NumberFormat('fa-IR').format(Number(value || 0)); }
function dateLabel(value) { return value ? new Date(value).toLocaleString('fa-IR') : '—'; }
function intervalLabel(value) { return ({ Daily: 'روزانه', Monthly: 'ماهانه', Yearly: 'سالانه', Annually: 'سالانه' })[value] || '—'; }
function statusLabel(value) { return ({ 'Pending Payment': 'در انتظار پرداخت', Paid: 'پرداخت شد', Provisioning: 'در حال تحویل', Active: 'فعال', Expired: 'پایان‌یافته', 'Provisioning Failed': 'خطای تحویل', 'Payment Failed': 'پرداخت ناموفق', Cancelled: 'لغو شد', Refunded: 'بازپرداخت شد' })[value] || value; }
function statusClass(value) { return ({ Active: 'bg-emerald-100 text-emerald-800', Paid: 'bg-blue-100 text-blue-800', Provisioning: 'bg-amber-100 text-amber-800', 'Provisioning Failed': 'bg-rose-100 text-rose-800', 'Payment Failed': 'bg-rose-100 text-rose-800', Refunded: 'bg-gray-100 text-gray-700', Expired: 'bg-gray-100 text-gray-700', Cancelled: 'bg-gray-100 text-gray-700' })[value] || 'bg-amber-100 text-amber-800'; }
</script>
