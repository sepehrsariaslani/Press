<template>
	<div class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
		<header class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<p class="text-sm font-medium text-rose-700">آسومی · خرید امن برنامه‌ها</p>
				<h1 class="mt-1 text-2xl font-semibold text-gray-950">خرید و سفارش‌ها</h1>
				<p class="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
					برنامه‌های قابل نصب روی بنچ سایتتان را ببینید، سفارش دهید و وضعیت پرداخت و تحویل را دنبال کنید.
				</p>
			</div>
			<Button label="بروزرسانی" :loading="loading" @click="refresh" />
		</header>

		<div v-if="notice" class="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="status">{{ notice }}</div>
		<div v-if="error" class="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-950" role="alert">{{ error }}</div>

		<section v-if="serviceRequest" class="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm" aria-labelledby="asumi-service-request-title">
			<div>
				<p class="text-sm font-medium text-rose-700">درخواست خدمات آسومی</p>
				<h2 id="asumi-service-request-title" class="mt-1 text-lg font-semibold text-gray-950">بررسی {{ serviceRequest.service === 'website_design' ? 'برآورد طراحی سایت' : 'ترکیب ماژول‌های انتخابی' }}</h2>
				<p class="mt-2 text-sm leading-6 text-gray-700">این فرم فقط درخواست تماس و بررسی است؛ فاکتور، سفارش مالی یا پرداختی ایجاد نمی‌کند.</p>
			</div>
			<div v-if="serviceRequest.context" class="mt-4 whitespace-pre-line rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm leading-6 text-gray-700">{{ serviceRequest.context }}</div>
			<div v-if="serviceRequest.service === 'module_pricing' && serviceRequest.moduleIds.length" class="mt-4 rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm leading-6 text-gray-700">
				<p><strong>ماژول‌ها:</strong> {{ serviceRequest.moduleIds.map(serviceModuleTitle).join('، ') }}</p>
				<p v-if="serviceRequest.addonIds.length"><strong>افزونه‌ها:</strong> {{ serviceRequest.addonIds.map(serviceAddonTitle).join('، ') }}</p>
				<p class="mt-1 text-xs text-gray-500">مبلغ نهایی هنگام ثبت درخواست از تعرفهٔ جاری سرور محاسبه می‌شود.</p>
			</div>
			<div v-if="serviceRequestResult" class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900" role="status">درخواستت ثبت شد. شمارهٔ پیگیری: <strong>{{ serviceRequestResult.name }}</strong><span v-if="serviceRequestResult.quote"> · برآورد ماهانهٔ سرور: <strong>{{ money(serviceRequestResult.quote.total) }} تومان</strong></span> · پس از بررسی با شما تماس می‌گیریم.</div>
			<form v-else class="mt-4 grid gap-3 sm:grid-cols-2" @submit.prevent="submitServiceRequest">
				<label class="text-sm font-medium text-gray-700">نام و نام خانوادگی
					<input v-model="serviceRequestForm.full_name" required maxlength="140" autocomplete="name" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
				</label>
				<label class="text-sm font-medium text-gray-700">شماره تماس
					<input v-model="serviceRequestForm.phone" required maxlength="32" inputmode="tel" autocomplete="tel" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" placeholder="مثلاً ۰۹۱۲۱۲۳۴۵۶۷" />
				</label>
				<label class="text-sm font-medium text-gray-700 sm:col-span-2">نام کسب‌وکار (اختیاری)
					<input v-model="serviceRequestForm.company" maxlength="140" autocomplete="organization" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
				</label>
				<div class="flex flex-wrap items-center gap-3 sm:col-span-2">
					<button type="submit" :disabled="submittingServiceRequest" class="rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800 disabled:cursor-wait disabled:opacity-60">{{ submittingServiceRequest ? 'در حال ثبت…' : 'ثبت درخواست بررسی' }}</button>
					<span class="text-xs leading-5 text-gray-600">هیچ مبلغی دریافت نمی‌شود؛ نتیجه پس از بررسی برای شما اعلام خواهد شد.</span>
				</div>
			</form>
		</section>

		<section class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h2 class="text-lg font-semibold text-gray-950">{{ requestedMarketplaceAppTitle ? `خرید ${requestedMarketplaceAppTitle}` : 'تعرفه‌های قابل خرید' }}</h2>
					<p class="mt-1 text-sm text-gray-600">{{ requestedMarketplaceApp ? 'سایت را انتخاب کنید؛ فقط تعرفه‌های همین برنامه که کدشان روی بنچ آماده است نمایش داده می‌شود.' : 'برنامه‌های نصب‌شده یا آمادهٔ نصب روی بنچ سایت انتخابی نمایش داده می‌شوند.' }}</p>
				</div>
				<label class="min-w-64 text-sm font-medium text-gray-700">
					سایت
					<select v-model="selectedSite" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
						<option value="">انتخاب سایت</option>
						<option v-for="site in sites.data || []" :key="site.key" :value="site.key">{{ site.label }}{{ site.site_type === 'Docker Control Site' ? ' · سایت متصل' : '' }}</option>
					</select>
				</label>
			</div>

			<div v-if="!selectedSite" class="mt-5 rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">برای دیدن تعرفه‌ها یک سایت فعال انتخاب کنید.</div>
			<div v-else-if="plans.loading" class="mt-5 rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">در حال دریافت تعرفه‌ها…</div>
			<div v-else-if="requestedMarketplaceApp && plans.data && !visibleAppPlans.length" class="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm leading-6 text-amber-950" role="status">
				<strong>{{ requestedMarketplaceAppTitle || requestedMarketplaceApp }}</strong> روی بنچ این سایت موجود نیست یا تعرفهٔ فعالی ندارد؛ سفارش و نصب از این مسیر در دسترس نیست.
			</div>
			<div v-else-if="!(plans.data?.plans?.length)" class="mt-5 rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">برای برنامه‌های موجود روی بنچ این سایت، تعرفهٔ فعالی ثبت نشده است.</div>
			<div v-else class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				<article v-for="plan in visibleAppPlans" :key="plan.name" class="flex flex-col rounded-xl border border-gray-200 p-5">
					<div class="flex-1">
						<p class="text-xs font-medium text-rose-700">{{ plan.app_title }}</p>
						<h3 class="mt-1 text-lg font-semibold text-gray-950">{{ plan.title || 'تعرفه' }}</h3>
						<p class="mt-1 text-sm text-gray-600">دوره: {{ intervalLabel(plan.interval) }}</p>
						<p v-if="plan.installation_required" class="mt-2 text-xs leading-5 text-gray-600">با ثبت سفارش، پس از پشتیبان کامل روی {{ selectedSiteTarget?.label || 'سایت انتخابی' }} نصب می‌شود.</p>
					</div>
					<div class="mt-5 flex items-baseline gap-2">
						<strong class="text-xl font-semibold text-gray-950">{{ !plan.asumi_checkout_supported ? 'قیمت ریالی لازم است' : Number(plan.price_irr) === 0 ? 'رایگان' : money(plan.price_irr) }}</strong>
						<span v-if="plan.asumi_checkout_supported && Number(plan.price_irr) !== 0" class="text-sm text-gray-500">ریال</span>
					</div>
					<p v-if="plan.asumi_checkout_message" class="mt-2 text-xs leading-5 text-amber-800">{{ plan.asumi_checkout_message }}</p>
					<Button class="mt-4 w-full" variant="solid" :disabled="!plan.asumi_checkout_supported || (Number(plan.price_irr) === 0 ? !plans.data.free_purchase_enabled : !plans.data.checkout_enabled) || busy" :loading="busyPlan === plan.name" :label="marketplacePlanActionLabel(plan)" @click="purchase(plan)" />
				</article>
			</div>
			<p v-if="plans.data?.message" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">{{ plans.data.message }}</p>
		</section>

		<section class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-lg font-semibold text-gray-950">میزبانی سایت</h2>
					<p class="mt-1 text-sm leading-6 text-gray-600">پلن‌های آماده را بخرید. بسته به تنظیمات هر پلن، آن را روی سایت فعال شما اعمال می‌کنیم یا سایت تازه‌ای زیر دامنهٔ آسومی می‌سازیم.</p>
				</div>
				<Button label="دریافت پلن‌ها" :loading="hostingOffers.loading" @click="hostingOffers.fetch()" />
			</div>
			<div v-if="hostingOffers.loading" class="mt-5 rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">در حال بررسی پلن‌ها و ظرفیت سایت…</div>
			<div v-else-if="!(hostingOffers.data?.plans?.length)" class="mt-5 rounded-xl bg-gray-50 px-4 py-8 text-center text-sm leading-6 text-gray-600">هنوز پلن میزبانی برای خرید آماده نشده است. مدیر آسومی باید پلن، دامنهٔ ریشه و بنچ مشترک را تنظیم کند.</div>
			<div v-else class="mt-5 grid gap-4 lg:grid-cols-2">
				<article v-for="plan in hostingOffers.data.plans" :key="plan.name" class="rounded-xl border border-gray-200 p-5">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="text-xs font-medium text-rose-700">{{ plan.commerce_delivery_mode === 'Create New Site' ? 'ساخت سایت جدید' : 'ارتقای سایت موجود' }}</p>
							<h3 class="mt-1 text-lg font-semibold text-gray-950">{{ plan.plan_title || plan.name }}</h3>
							<p class="mt-1 text-sm text-gray-600">دورهٔ خدمت: {{ intervalLabel(plan.interval) }}</p>
						</div>
						<div class="shrink-0 text-left"><strong class="text-lg text-gray-950">{{ money(plan.price_irr) }}</strong><span class="mr-1 text-xs text-gray-500">ریال</span></div>
					</div>
					<label v-if="plan.commerce_delivery_mode === 'Upgrade Existing Site'" class="mt-4 block text-sm font-medium text-gray-700">
						سایت فعال
						<select v-model="hostingSiteByPlan[plan.name]" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
							<option value="">انتخاب سایت</option>
							<option v-for="site in hostingOffers.data.sites || []" :key="site.name" :value="site.name">{{ site.subdomain }}.{{ site.domain }}</option>
						</select>
					</label>
					<div v-else class="mt-4">
						<label v-if="plan.renewable_sites?.length" class="mb-3 block text-sm font-medium text-gray-700">
							تمدید سایت ساخته‌شده با همین پلن
							<select v-model="hostingRenewSiteByPlan[plan.name]" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
								<option value="">ساخت سایت جدید</option>
								<option v-for="site in plan.renewable_sites" :key="site.name" :value="site.name">{{ site.subdomain }}.{{ site.domain }}{{ site.status === 'Suspended' ? ' · تعلیق‌شده' : '' }}</option>
							</select>
						</label>
						<template v-if="!hostingRenewSiteByPlan[plan.name]">
							<label class="block text-sm font-medium text-gray-700">نام سایت جدید
								<div class="mt-1 flex items-center rounded-lg border border-gray-300 px-3 focus-within:border-rose-500">
									<input v-model="hostingSubdomains[plan.name]" maxlength="32" autocomplete="off" class="min-w-0 flex-1 border-0 px-0 py-2 text-sm focus:ring-0" placeholder="نام انگلیسی، حداقل ۵ نویسه" :aria-label="`نام سایت جدید برای ${plan.plan_title || plan.name}`" />
									<span class="shrink-0 text-xs text-gray-500">.{{ plan.domain || 'asumi.ir' }}</span>
								</div>
							</label>
							<div v-if="plan.apps?.length" class="mt-3">
								<p class="text-xs text-gray-600">برنامه‌های قابل نصب روی بنچ (اختیاری)</p>
								<div class="mt-2 flex flex-wrap gap-2">
									<label v-for="app in plan.apps" :key="app" class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700"><input type="checkbox" :checked="isHostingAppSelected(plan.name, app)" @change="toggleHostingApp(plan.name, app, $event.target.checked)" />{{ app }}</label>
								</div>
							</div>
							<p v-else class="mt-2 text-xs leading-5 text-gray-500">سایت پایه ساخته می‌شود و می‌توانید بعداً برنامه‌ها را نصب کنید.</p>
						</template>
						<p v-else class="mt-2 text-xs leading-5 text-gray-500">پس از تأیید پرداخت، همین سایت دوباره فعال می‌شود.</p>
					</div>
					<p v-if="plan.message || (plan.commerce_delivery_mode === 'Create New Site' && !plan.new_site_available && !hostingRenewSiteByPlan[plan.name])" class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{{ plan.message || 'ساخت سایت جدید آماده نیست؛ می‌توانید یکی از سایت‌های قبلی همین پلن را تمدید کنید.' }}</p>
					<p class="mt-3 text-xs leading-5 text-gray-500">پس از پایان دوره، سایت به پلن قبلی برمی‌گردد؛ سایت تازه بدون تمدید تعلیق می‌شود.</p>
					<Button class="mt-4 w-full" variant="solid" :disabled="!plan.available || (plan.commerce_delivery_mode === 'Create New Site' && !plan.new_site_available && !hostingRenewSiteByPlan[plan.name]) || busy" :loading="busyPlan === plan.name" label="ثبت سفارش و پرداخت" @click="purchaseHosting(plan)" />
				</article>
			</div>
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
						<p class="font-medium text-gray-950">{{ order.plan }}<span v-if="order.site_label"> · {{ order.site_label }}</span></p>
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
					<p v-if="settings.data" class="mt-2 max-w-3xl text-xs leading-5" :class="gatewayStatus.tone === 'warning' ? 'text-amber-200' : 'text-emerald-200'">{{ gatewayStatus.message }}</p>
				</div>
				<span class="rounded-full border border-gray-700 px-3 py-1 text-xs" :class="gatewayStatus.tone === 'success' ? 'text-emerald-300' : 'text-amber-200'">{{ gatewayStatus.label }}</span>
			</div>

			<div v-if="settings.data" class="mt-5 grid gap-4 md:grid-cols-2">
				<label class="flex items-center gap-3 rounded-xl border border-gray-800 p-4 text-sm"><input v-model="settingsForm.enabled" type="checkbox" class="rounded border-gray-600 text-rose-600 focus:ring-rose-500" /> فعال‌سازی checkout آسومی</label>
				<label class="flex items-center gap-3 rounded-xl border border-gray-800 p-4 text-sm"><input v-model="settingsForm.allow_marketplace_app_sales" type="checkbox" class="rounded border-gray-600 text-rose-600 focus:ring-rose-500" /> فروش تعرفهٔ برنامه‌ها</label>
				<label class="flex items-center gap-3 rounded-xl border border-gray-800 p-4 text-sm"><input v-model="settingsForm.allow_site_plan_sales" type="checkbox" class="rounded border-gray-600 text-rose-600 focus:ring-rose-500" /> فروش پلن میزبانی</label>
				<label class="flex items-center gap-3 rounded-xl border border-gray-800 p-4 text-sm"><input v-model="settingsForm.sandbox_mode" type="checkbox" class="rounded border-gray-600 text-rose-600 focus:ring-rose-500" /> حالت آزمایشی زرین‌پال</label>
				<label class="text-sm">حداقل فضای آزاد دیسک پس از ساخت سایت (گیگابایت)
					<input v-model.number="settingsForm.hosting_min_free_disk_gb" type="number" min="0" max="1000000" step="0.1" class="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white" />
					<span class="mt-1 block text-xs text-gray-400">صفر یعنی ظرفیت دیسک تأیید نشده و ساخت سایت غیرفعال می‌ماند.</span>
				</label>
				<label class="text-sm">حداقل حافظهٔ آزاد پس از ساخت سایت (گیگابایت)
					<input v-model.number="settingsForm.hosting_min_free_memory_gb" type="number" min="0" max="1000000" step="0.1" class="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white" />
					<span class="mt-1 block text-xs text-gray-400">صفر یعنی ظرفیت حافظه تأیید نشده و ساخت سایت غیرفعال می‌ماند.</span>
				</label>
				<label class="text-sm">شناسهٔ پذیرندهٔ زرین‌پال
					<input v-model="merchantId" type="password" autocomplete="new-password" class="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder:text-gray-500" placeholder="برای حفظ مقدار فعلی خالی بگذارید" />
					<span class="mt-1 block text-xs text-gray-400">{{ settings.data.merchant_id_configured ? 'شناسه قبلاً ثبت شده است.' : 'هنوز شناسه‌ای ثبت نشده است.' }}</span>
				</label>
			</div>
			<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
				<p class="text-xs leading-5 text-gray-400">فروش میزبانی فقط پس از آماده‌شدن دامنه، بنچ و پلن فعال می‌شود. پرداخت هر بازه جداگانه است و خودکار تمدید نمی‌شود.</p>
				<Button variant="solid" label="ذخیره تنظیمات پرداخت" :loading="savingSettings" @click="saveSettings" />
			</div>
		</section>

		<section v-if="isCommerceAdmin" class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" aria-labelledby="asumi-service-pricing-title">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p class="text-sm font-medium text-rose-700">مدیریت آسومی</p>
					<h2 id="asumi-service-pricing-title" class="mt-1 text-lg font-semibold text-gray-950">تعرفهٔ خدمات صفحهٔ آسومی</h2>
					<p class="mt-1 text-sm leading-6 text-gray-600">قیمت ماهانهٔ ۱۵ ماژول، افزونهٔ مدیریت منو و پنج بستهٔ پیشنهادی را تنظیم کنید. همهٔ مبالغ به تومان هستند؛ صفر یعنی رایگان.</p>
				</div>
				<div class="flex flex-wrap gap-2">
					<Button label="بارگذاری تعرفه‌ها" :loading="adminServicePricing.loading" @click="loadServicePricing" />
					<Button variant="solid" label="ذخیرهٔ تعرفه‌ها" :loading="savingServicePricing" :disabled="!servicePricingLoaded || savingServicePricing" @click="saveServicePricing" />
				</div>
			</div>
			<p v-if="servicePricingError" class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-900" role="alert">{{ servicePricingError }}</p>
			<p v-if="servicePricingNotice" class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-900" role="status">{{ servicePricingNotice }}</p>
			<div v-if="adminServicePricing.loading && !servicePricingLoaded" class="mt-4 rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-600" role="status">در حال دریافت تعرفه‌های ذخیره‌شده…</div>
			<div v-else-if="!servicePricingLoaded" class="mt-4 rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">برای مدیریت قیمت‌ها، تعرفه‌ها را بارگذاری کنید.</div>
			<div v-else class="mt-5 grid gap-5 lg:grid-cols-3">
				<fieldset class="rounded-xl border border-gray-200 p-4">
					<legend class="px-2 text-sm font-semibold text-gray-900">ماژول‌ها</legend>
					<div class="grid gap-3">
						<label v-for="item in ASUMI_SERVICE_PRICE_CATALOG.modules" :key="item.id" class="text-xs font-medium text-gray-700">
							{{ item.title }}
							<input v-model.number="servicePricingForm.modules[item.id]" type="number" min="0" :max="MAX_ASUMI_SERVICE_PRICE_TOMAN" step="1" inputmode="numeric" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950" :aria-label="`تعرفهٔ ماژول ${item.title} به تومان`" />
							<span v-if="servicePricingForm.modules[item.id] === 0" class="mt-1 block text-xs text-emerald-700">رایگان</span>
						</label>
					</div>
				</fieldset>
				<div class="grid content-start gap-5">
					<fieldset class="rounded-xl border border-gray-200 p-4">
						<legend class="px-2 text-sm font-semibold text-gray-900">افزونه‌ها</legend>
						<div class="grid gap-3">
							<label v-for="item in ASUMI_SERVICE_PRICE_CATALOG.addons" :key="item.id" class="text-xs font-medium text-gray-700">
								{{ item.title }}
								<input v-model.number="servicePricingForm.addons[item.id]" type="number" min="0" :max="MAX_ASUMI_SERVICE_PRICE_TOMAN" step="1" inputmode="numeric" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950" :aria-label="`تعرفهٔ افزونهٔ ${item.title} به تومان`" />
								<span v-if="servicePricingForm.addons[item.id] === 0" class="mt-1 block text-xs text-emerald-700">رایگان</span>
							</label>
						</div>
					</fieldset>
					<fieldset class="rounded-xl border border-gray-200 p-4">
						<legend class="px-2 text-sm font-semibold text-gray-900">بسته‌های پیشنهادی</legend>
						<div class="grid gap-3">
							<label v-for="item in ASUMI_SERVICE_PRICE_CATALOG.packages" :key="item.id" class="text-xs font-medium text-gray-700">
								{{ item.title }}
								<input v-model.number="servicePricingForm.packages[item.id]" type="number" min="0" :max="MAX_ASUMI_SERVICE_PRICE_TOMAN" step="1" inputmode="numeric" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950" :aria-label="`تعرفهٔ بستهٔ ${item.title} به تومان`" />
								<span v-if="servicePricingForm.packages[item.id] === 0" class="mt-1 block text-xs text-emerald-700">رایگان</span>
							</label>
						</div>
					</fieldset>
				</div>
			</div>
		</section>

		<section v-if="isCommerceAdmin" class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-lg font-semibold text-gray-950">درخواست‌های بررسی خدمات</h2>
					<p class="mt-1 text-sm leading-6 text-gray-600">برآوردهای ماژول‌ها و طراحی سایت به‌صورت سرنخ ثبت می‌شوند و هیچ‌کدام سفارش یا فاکتور نیستند.</p>
				</div>
				<Button label="دریافت درخواست‌ها" :loading="adminServiceRequests.loading" @click="adminServiceRequests.fetch()" />
			</div>
			<div v-if="adminServiceRequests.data?.length" class="mt-4 overflow-x-auto">
				<table class="w-full min-w-[900px] text-sm">
					<thead class="border-b border-gray-200 text-right text-xs text-gray-500"><tr><th class="py-3 pr-2">درخواست</th><th>نام و کسب‌وکار</th><th>راه تماس</th><th>خلاصهٔ انتخاب</th><th>وضعیت</th></tr></thead>
					<tbody class="divide-y divide-gray-100">
						<tr v-for="lead in adminServiceRequests.data" :key="lead.name" class="align-top">
							<td class="py-3 pr-2"><strong>{{ lead.name }}</strong><span class="block text-xs text-gray-500">{{ lead.product_interest?.endsWith('website_design') ? 'طراحی سایت' : 'ماژول‌ها' }} · {{ dateLabel(lead.creation) }}</span></td>
							<td>{{ lead.full_name }}<span v-if="lead.company" class="block text-xs text-gray-500">{{ lead.company }}</span></td>
							<td><a :href="`tel:${lead.phone}`" class="text-rose-700 hover:text-rose-900">{{ lead.phone }}</a><a v-if="lead.email" :href="`mailto:${lead.email}`" class="block text-xs text-gray-500">{{ lead.email }}</a></td>
							<td class="max-w-md"><details><summary class="cursor-pointer text-rose-700">نمایش جزئیات</summary><p class="mt-2 max-h-48 overflow-auto whitespace-pre-line text-xs leading-5 text-gray-600">{{ lead.message }}</p></details></td>
							<td><select :value="lead.status" class="rounded-md border border-gray-300 px-2 py-1" :aria-label="`وضعیت درخواست ${lead.name}`" @change="updateServiceRequestStatus(lead, $event.target.value)"><option value="New">جدید</option><option value="Contacted">تماس گرفته شد</option><option value="Qualified">پیگیری واجد شرایط</option><option value="Lost">بسته شد</option></select></td>
						</tr>
					</tbody>
				</table>
			</div>
			<p v-else-if="!adminServiceRequests.loading" class="mt-4 rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">هنوز درخواستی برای بررسی ثبت نشده است.</p>
		</section>

		<section v-if="isCommerceAdmin" class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-lg font-semibold text-gray-950">آمادگی فروش پلن ساخت سایت</h2>
					<p class="mt-1 text-sm leading-6 text-gray-600">وضعیت زندهٔ پرداخت، زیردامنهٔ آسومی، بنچ و ظرفیت میزبان را بررسی می‌کند.</p>
				</div>
				<div class="flex items-center gap-3">
					<span v-if="hostingReadiness.data" class="rounded-full px-3 py-1 text-xs font-medium" :class="hostingReadiness.data.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'">{{ hostingReadiness.data.ready ? 'آمادهٔ فروش' : 'فروش فعلاً غیرفعال' }}</span>
					<Button label="بررسی دوباره" :loading="hostingReadiness.loading" @click="hostingReadiness.fetch()" />
				</div>
			</div>
			<div v-if="hostingReadiness.data?.resources" class="mt-4 flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
				<span>دیسک آزاد میزبان: {{ gib(hostingReadiness.data.resources.disk_free_bytes) }} گیگابایت</span>
				<span>حافظهٔ در دسترس: {{ gib(hostingReadiness.data.resources.memory_available_bytes) }} گیگابایت</span>
				<span>ذخیرهٔ دیسک: {{ settingsForm.hosting_min_free_disk_gb || 0 }} گیگابایت</span>
				<span>ذخیرهٔ حافظه: {{ settingsForm.hosting_min_free_memory_gb || 0 }} گیگابایت</span>
			</div>
			<div v-if="hostingReadiness.data?.checks?.length" class="mt-4 grid gap-3 md:grid-cols-2">
				<article v-for="check in hostingReadiness.data.checks" :key="check.key" class="rounded-xl border px-4 py-3" :class="check.ready ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'">
					<div class="flex items-center justify-between gap-3">
						<strong class="text-sm" :class="check.ready ? 'text-emerald-900' : 'text-rose-900'">{{ check.label }}</strong>
						<span class="text-xs font-medium" :class="check.ready ? 'text-emerald-700' : 'text-rose-700'">{{ check.ready ? 'آماده' : 'نیازمند تنظیم' }}</span>
					</div>
					<p class="mt-1 text-xs leading-5 text-gray-700">{{ check.detail }}</p>
				</article>
			</div>
			<div v-else class="mt-4 rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">برای دیدن وضعیت، «بررسی دوباره» را بزنید.</div>
		</section>

		<section v-if="isCommerceAdmin" class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-lg font-semibold text-gray-950">تعرفهٔ برنامه‌های Marketplace</h2>
					<p class="mt-1 text-sm text-gray-600">برای رایگان‌ماندن، مبلغ هر ارز را صفر نگه دارید. پرداخت مستقیم آسومی فقط با قیمت ریالی حداقل ۱۰٬۰۰۰ ریال انجام می‌شود؛ تعرفهٔ تنها INR/USD در این سایت قابل خرید نیست. تغییر قیمت تعرفه‌ای با مشترک فعال رد می‌شود؛ تعرفهٔ تازه بسازید.</p>
				</div>
				<div class="flex gap-2">
					<Button label="تعرفهٔ جدید" :disabled="!marketplacePlanOptions.data?.apps?.length" @click="showCreateMarketplacePlan = !showCreateMarketplacePlan" />
					<Button label="دریافت فهرست" :loading="appPlans.loading" @click="appPlans.fetch()" />
				</div>
			</div>
			<form v-if="showCreateMarketplacePlan" class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4" @submit.prevent="createMarketplacePlan">
				<div class="grid gap-3 md:grid-cols-3">
					<label class="text-sm font-medium text-gray-700">برنامه
						<select v-model="newMarketplacePlan.app" required class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
							<option value="" disabled>برنامه را انتخاب کنید</option>
							<option v-for="app in marketplacePlanOptions.data?.apps || []" :key="app.name" :value="app.name">{{ app.title || app.name }}</option>
						</select>
					</label>
					<label class="text-sm font-medium text-gray-700">نام تعرفه
						<input v-model="newMarketplacePlan.title" required maxlength="140" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
					</label>
					<label class="text-sm font-medium text-gray-700">دوره
						<select v-model="newMarketplacePlan.interval" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option value="Daily">روزانه</option><option value="Monthly">ماهانه</option><option value="Yearly">سالانه</option></select>
					</label>
				</div>
				<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
					<p class="text-xs leading-5 text-gray-600">تعرفه با قیمت صفر و وضعیت غیرفعال ساخته می‌شود؛ پس از ساخت، قیمت‌ها را در جدول وارد و تعرفه را فعال کن. تعرفهٔ قبلی را خودکار غیرفعال نمی‌کنیم.</p>
					<div class="flex gap-2"><Button type="button" label="انصراف" @click="showCreateMarketplacePlan = false" /><Button type="submit" variant="solid" :loading="creatingMarketplacePlan" label="ساخت پیش‌نویس" /></div>
				</div>
			</form>
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
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-lg font-semibold text-gray-950">تعرفه‌های میزبانی</h2>
					<p class="mt-1 text-sm leading-6 text-gray-600">پلن را بساز، روش تحویل و ظرفیتش را تنظیم کن و بعد فعالش کن. پلن تازه غیرفعال و رایگان ساخته می‌شود؛ برای پرداخت ریالی، مبلغ حداقل ۱۰٬۰۰۰ ریال لازم است.</p>
				</div>
				<Button label="ساخت پلن میزبانی" :disabled="!sitePlanOptions.data" @click="showCreateSitePlan = !showCreateSitePlan" />
			</div>
			<form v-if="showCreateSitePlan" class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4" @submit.prevent="createSitePlan">
				<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
					<label class="text-sm font-medium text-gray-700">شناسهٔ پلن
						<input v-model="newSitePlan.name" required pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,79}" maxlength="80" autocomplete="off" placeholder="asumi_basic" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
					</label>
					<label class="text-sm font-medium text-gray-700">نام نمایشی
						<input v-model="newSitePlan.title" required maxlength="140" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
					</label>
					<label class="text-sm font-medium text-gray-700">دوره
						<select v-model="newSitePlan.interval" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option value="Monthly">ماهانه</option><option value="Annually">سالانه</option><option value="Daily">روزانه</option></select>
					</label>
					<label class="text-sm font-medium text-gray-700">روش تحویل
						<select v-model="newSitePlan.delivery_mode" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option value="Upgrade Existing Site">ارتقای سایت موجود</option><option value="Create New Site">ساخت سایت جدید</option></select>
					</label>
					<label class="text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-4">توضیحات
						<input v-model="newSitePlan.description" maxlength="140" class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
					</label>
				</div>
				<div v-if="newSitePlan.delivery_mode === 'Create New Site'" class="mt-4 grid gap-4 lg:grid-cols-2">
					<div class="rounded-lg border border-gray-200 bg-white p-3">
						<p class="text-sm font-medium text-gray-800">گروه انتشار سایت</p>
						<div v-if="sitePlanOptions.data?.release_groups?.length" class="mt-2 flex flex-wrap gap-2">
							<label v-for="group in sitePlanOptions.data.release_groups" :key="group.name" class="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs"><input type="checkbox" :checked="newSitePlan.release_groups.includes(group.name)" @change="toggleNewPlanGroup(group.name, $event.target.checked)" />{{ group.name }}</label>
						</div>
						<p v-else class="mt-2 text-xs leading-5 text-amber-800">هنوز گروه انتشار عمومی با بنچ فعال ثبت نشده است؛ این پیش‌نویس تا آماده‌شدن زیرساخت قابل فروش نمی‌شود.</p>
					</div>
					<div class="rounded-lg border border-gray-200 bg-white p-3">
						<p class="text-sm font-medium text-gray-800">برنامه‌های قابل نصب <span class="font-normal text-gray-500">(اختیاری)</span></p>
						<div v-if="newPlanApps.length" class="mt-2 flex flex-wrap gap-2">
						<label v-for="app in newPlanApps" :key="app" class="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs"><input type="checkbox" :checked="newSitePlan.allowed_apps.includes(app)" @change="toggleNewPlanApp(app, $event.target.checked)" />{{ app }}</label>
						</div>
						<p v-else class="mt-2 text-xs leading-5 text-gray-500">بعد از آماده‌شدن گروه‌های انتشار عمومی، برنامه‌های نصب‌شده اینجا نمایش داده می‌شوند.</p>
					</div>
				</div>
				<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
					<p class="text-xs leading-5 text-gray-600">اگر گروهی انتخاب نکنی، پلن روی همهٔ گروه‌های انتشار عمومی اعمال می‌شود. پلن با قیمت و سقف منابع صفر و وضعیت غیرفعال ساخته می‌شود.</p>
					<div class="flex gap-2"><Button type="button" label="انصراف" @click="showCreateSitePlan = false" /><Button type="submit" variant="solid" :loading="creatingSitePlan" label="ساخت پیش‌نویس" /></div>
				</div>
			</form>
			<div v-if="sitePlans.data?.length" class="mt-4 overflow-x-auto">
				<table class="w-full min-w-[1500px] text-sm">
					<thead class="border-b border-gray-200 text-right text-xs text-gray-500"><tr><th class="py-3 pr-2">تعرفه</th><th>فعال</th><th>روش تحویل</th><th>دوره</th><th>INR</th><th>USD</th><th>IRR</th><th>پایگاه داده (MiB)</th><th>فضا (MiB)</th><th>حافظه (MiB)</th><th>پردازنده (ساعت/روز)</th><th></th></tr></thead>
					<tbody class="divide-y divide-gray-100">
						<template v-for="row in sitePlans.data" :key="row.name">
						<tr>
							<td class="py-3 pr-2"><input v-model="row.plan_title" maxlength="140" class="mb-1 block w-36 rounded-md border border-gray-300 px-2 py-1 font-medium" /><input v-model="row.plan_description" maxlength="140" class="mb-1 block w-36 rounded-md border border-gray-300 px-2 py-1 text-xs" placeholder="توضیحات پلن" /><span class="text-xs text-gray-500">{{ row.name }}</span></td>
							<td><input v-model="row.enabled" type="checkbox" :aria-label="`فعال‌کردن ${row.plan_title || row.name}`" /></td>
							<td><select v-model="row.commerce_delivery_mode" class="min-w-44 rounded-md border border-gray-300 px-2 py-1" :aria-label="`روش تحویل ${row.plan_title || row.name}`"><option value="Upgrade Existing Site">ارتقای سایت موجود</option><option value="Create New Site">ساخت سایت جدید</option></select></td>
							<td><select v-model="row.interval" class="rounded-md border border-gray-300 px-2 py-1" :aria-label="`دورهٔ ${row.plan_title || row.name}`"><option value="Daily">روزانه</option><option value="Monthly">ماهانه</option><option value="Annually">سالانه</option></select></td>
							<td><input v-model="row.price_inr" type="number" min="0" step="0.01" class="w-28 rounded-md border border-gray-300 px-2 py-1" /></td>
							<td><input v-model="row.price_usd" type="number" min="0" step="0.01" class="w-28 rounded-md border border-gray-300 px-2 py-1" /></td>
							<td><input v-model="row.price_irr" type="number" min="0" step="1" class="w-32 rounded-md border border-gray-300 px-2 py-1" /></td>
							<td><input v-model.number="row.max_database_usage" type="number" min="0" step="1" class="w-28 rounded-md border border-gray-300 px-2 py-1" /></td>
							<td><input v-model.number="row.max_storage_usage" type="number" min="0" step="1" class="w-28 rounded-md border border-gray-300 px-2 py-1" /></td>
							<td><input v-model.number="row.memory" type="number" min="0" step="1" class="w-28 rounded-md border border-gray-300 px-2 py-1" /></td>
							<td><input v-model.number="row.cpu_time_per_day" type="number" min="0" step="0.1" class="w-28 rounded-md border border-gray-300 px-2 py-1" /></td>
							<td><Button label="ذخیره" @click="saveSitePrices(row)" /></td>
						</tr>
						<tr>
							<td colspan="12" class="pb-3">
								<details class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
									<summary class="cursor-pointer text-xs font-medium text-gray-700">تنظیم گروه‌های انتشار و برنامه‌های مجاز</summary>
									<div class="mt-3 grid gap-3 lg:grid-cols-2">
										<div class="rounded-lg border border-gray-200 bg-white p-3">
											<p class="text-xs font-medium text-gray-800">گروه‌های انتشار</p>
											<div v-if="sitePlanOptions.data?.release_groups?.length" class="mt-2 flex flex-wrap gap-2">
												<label v-for="group in sitePlanOptions.data.release_groups" :key="group.name" class="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs"><input type="checkbox" :checked="(row.release_groups || []).includes(group.name)" @change="toggleSitePlanGroup(row, group.name, $event.target.checked)" />{{ group.name }}</label>
											</div>
											<p v-else class="mt-2 text-xs leading-5 text-amber-800">گروه انتشار عمومی و بنچ فعال هنوز آماده نیست.</p>
											<p class="mt-2 text-xs text-gray-500">خالی‌گذاشتن این فهرست به معنی اجازهٔ استفاده از همهٔ گروه‌های انتشار عمومی است.</p>
										</div>
										<div class="rounded-lg border border-gray-200 bg-white p-3">
											<p class="text-xs font-medium text-gray-800">برنامه‌های مجاز</p>
											<div v-if="sitePlanApps(row).length" class="mt-2 flex flex-wrap gap-2">
												<label v-for="app in sitePlanApps(row)" :key="app" class="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs"><input type="checkbox" :checked="(row.allowed_apps || []).includes(app)" @change="toggleSitePlanApp(row, app, $event.target.checked)" />{{ app }}</label>
											</div>
											<p v-else class="mt-2 text-xs leading-5 text-gray-500">برنامه‌ای برای گروه انتخاب‌شده پیدا نشد.</p>
											<p class="mt-2 text-xs text-gray-500">خالی‌گذاشتن این فهرست اجازهٔ نصب همهٔ برنامه‌های در دسترس را می‌دهد.</p>
										</div>
									</div>
								</details>
							</td>
						</tr>
						</template>
					</tbody>
				</table>
			</div>
			<p v-else-if="!showCreateSitePlan" class="mt-4 rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">فعلاً پلن میزبانی ثبت نشده است. برای ساخت پلن از همین پنل استفاده کن.</p>
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
				<table class="w-full min-w-[1100px] text-sm">
					<thead class="border-b border-gray-200 text-right text-xs text-gray-500"><tr><th class="py-3 pr-2">سفارش</th><th>مشتری / تیم</th><th>مبلغ</th><th>وضعیت</th><th>پشتیبان / عملیات نصب</th><th>خطای تحویل</th><th></th></tr></thead>
					<tbody class="divide-y divide-gray-100">
						<tr v-for="order in adminOrders.data" :key="order.name">
							<td class="py-3 pr-2"><strong>{{ order.name }}</strong><span class="block text-xs text-gray-500">{{ order.plan }} · {{ order.docker_site || order.site || order.subdomain }}</span></td>
							<td>{{ order.customer }}<span class="block text-xs text-gray-500">{{ order.team }}</span></td>
							<td>{{ money(order.amount) }} {{ order.currency }}</td>
							<td>{{ statusLabel(order.status) }}<span v-if="order.refund_reference" class="block text-xs text-gray-500">مرجع بازپرداخت: {{ order.refund_reference }}</span></td>
							<td class="text-xs text-gray-600"><span v-if="order.install_backup" class="block">پشتیبان: {{ order.install_backup }}</span><span v-if="order.install_backup_id" class="block">پشتیبان Docker: {{ order.install_backup_id }}</span><span v-if="order.agent_job" class="block">کار نصب: {{ order.agent_job }}</span><span v-if="order.install_operation" class="block">عملیات: {{ order.install_operation }}</span></td>
							<td class="max-w-64 truncate text-rose-700">{{ order.provisioning_error || order.payment_error || '—' }}</td>
							<td class="flex items-center gap-2 py-2">
								<Button v-if="order.status === 'Provisioning Failed'" label="تلاش مجدد تحویل" :loading="retrying === order.name" @click="retry(order)" />
								<template v-if="order.provider !== 'Free' && ['Paid', 'Active', 'Provisioning Failed'].includes(order.status)">
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
import { commerceGatewayState } from '@/utils/commerceGatewayState';
import { commercePurchaseSiteParams, resolveCommercePurchaseSite } from '@/utils/commerceSites';
import { marketplacePlanActionLabel, selectMarketplacePlans } from '@/utils/marketplacePlanSelection';
import { parseAsumiServiceRequest } from '@/utils/asumiServiceRequest';
import {
	ASUMI_SERVICE_PRICE_CATALOG,
	MAX_ASUMI_SERVICE_PRICE_TOMAN,
	buildAsumiServicePricingPayload,
	emptyAsumiServicePricing,
	validateAsumiServicePricing,
} from '@/utils/asumiServicePricing';

const isCommerceAdmin = computed(() => canManageAsumiCommerce(session));
const serviceRequest = ref(parseAsumiServiceRequest(window.location.search));
const marketplaceQuery = new URLSearchParams(window.location.search);
const requestedMarketplaceApp = ref((marketplaceQuery.get('asumi_app') || '').trim());
const requestedMarketplaceAppTitle = ref((marketplaceQuery.get('asumi_app_title') || '').trim());
const serviceRequestForm = reactive({ full_name: '', phone: '', company: '' });
const serviceRequestResult = ref(null);
const submittingServiceRequest = ref(false);
const selectedSite = ref('');
const selectedSiteTarget = computed(() => resolveCommercePurchaseSite(sites.data, selectedSite.value));
const visibleAppPlans = computed(() => selectMarketplacePlans(plans.data?.plans, requestedMarketplaceApp.value));
const merchantId = ref('');
const busyPlan = ref('');
const hostingSiteByPlan = reactive({});
const hostingRenewSiteByPlan = reactive({});
const hostingSubdomains = reactive({});
const hostingAppsByPlan = reactive({});
const retrying = ref('');
const refunding = ref('');
const refundReferences = reactive({});
const savingSettings = ref(false);
const showCreateSitePlan = ref(false);
const creatingSitePlan = ref(false);
const showCreateMarketplacePlan = ref(false);
const creatingMarketplacePlan = ref(false);
const error = ref('');
const notice = ref('');
const newSitePlan = reactive({ name: '', title: '', description: '', interval: 'Monthly', delivery_mode: 'Upgrade Existing Site', release_groups: [], allowed_apps: [] });
const newMarketplacePlan = reactive({ app: '', title: '', interval: 'Monthly' });
const settingsForm = reactive({ enabled: false, allow_marketplace_app_sales: false, allow_site_plan_sales: false, sandbox_mode: true, hosting_min_free_disk_gb: 0, hosting_min_free_memory_gb: 0 });
const servicePricingForm = reactive(emptyAsumiServicePricing());
const servicePricingLoaded = ref(false);
const savingServicePricing = ref(false);
const servicePricingError = ref('');
const servicePricingNotice = ref('');

const sites = createResource({ url: 'press.saas.commerce.api.my_purchase_sites', auto: true });
const orders = createResource({ url: 'press.saas.commerce.api.my_orders', auto: true });
const hostingOffers = createResource({
	url: 'press.saas.commerce.api.available_site_plan_offers',
	auto: true,
	onSuccess(data) {
		for (const plan of data.plans || []) {
			if (plan.commerce_delivery_mode === 'Upgrade Existing Site' && !hostingSiteByPlan[plan.name] && data.sites?.length === 1) {
				hostingSiteByPlan[plan.name] = data.sites[0].name;
			}
		}
	},
});
const plans = createResource({ url: 'press.saas.commerce.api.available_app_plans' });
const settings = createResource({
	url: 'press.saas.commerce.api.admin_settings',
	auto: isCommerceAdmin.value,
	onSuccess(data) { Object.assign(settingsForm, data); },
});
const adminServicePricing = createResource({
	url: 'press.saas.commerce.api.admin_service_pricing',
	auto: isCommerceAdmin.value,
	onSuccess(data) { applyServicePricing(data); },
	onError(failure) { servicePricingError.value = failure?.messages?.[0] || failure?.message || 'بارگذاری تعرفه‌های آسومی ناموفق بود.'; },
});
const gatewayStatus = computed(() => commerceGatewayState(settings.data));
const hostingReadiness = createResource({ url: 'press.saas.commerce.api.admin_hosting_readiness', auto: isCommerceAdmin.value });
const appPlans = createResource({ url: 'press.saas.commerce.api.admin_marketplace_plans', auto: isCommerceAdmin.value });
const marketplacePlanOptions = createResource({ url: 'press.saas.commerce.api.admin_marketplace_plan_options', auto: isCommerceAdmin.value });
const sitePlans = createResource({ url: 'press.saas.commerce.api.admin_site_plans', auto: isCommerceAdmin.value });
const sitePlanOptions = createResource({ url: 'press.saas.commerce.api.admin_site_plan_options', auto: isCommerceAdmin.value });
const adminOrders = createResource({ url: 'press.saas.commerce.api.admin_orders', auto: isCommerceAdmin.value });
const adminServiceRequests = createResource({ url: 'press.saas.commerce.api.admin_service_requests', auto: isCommerceAdmin.value });
const saveSettingsResource = createResource({ url: 'press.saas.commerce.api.save_admin_settings' });
const saveAppPriceResource = createResource({ url: 'press.saas.commerce.api.save_marketplace_plan_prices' });
const saveSitePriceResource = createResource({ url: 'press.saas.commerce.api.save_site_plan_prices' });
const createSitePlanResource = createResource({ url: 'press.saas.commerce.api.create_site_plan' });
const createMarketplacePlanResource = createResource({ url: 'press.saas.commerce.api.create_marketplace_plan_draft' });
const retryResource = createResource({ url: 'press.saas.commerce.api.retry_provisioning' });
const refundResource = createResource({ url: 'press.saas.commerce.api.record_refund' });
const startPurchaseResource = createResource({ url: 'press.saas.commerce.api.start_marketplace_app_purchase' });
const startHostingPurchaseResource = createResource({ url: 'press.saas.commerce.api.start_site_plan_purchase' });
const submitServiceRequestResource = createResource({ url: 'press.saas.commerce.api.submit_service_request' });
const saveServicePricingResource = createResource({ url: 'press.saas.commerce.api.save_admin_service_pricing' });
const updateServiceRequestStatusResource = createResource({ url: 'press.saas.commerce.api.update_service_request_status' });

const loading = computed(() => sites.loading || orders.loading || hostingOffers.loading);
const busy = computed(() => Boolean(busyPlan.value));
const newPlanApps = computed(() => {
	const groups = sitePlanOptions.data?.release_groups || [];
	return sharedSiteApps(groups.filter(group => !newSitePlan.release_groups.length || newSitePlan.release_groups.includes(group.name)));
});

watch(selectedSite, async (site) => {
	if (!site) return;
	error.value = '';
	const target = selectedSiteTarget.value;
	if (!target) return;
	try { await plans.fetch({ site: target.name, site_type: target.site_type }); } catch (failure) { showError(failure); }
});

async function submitServiceRequest() {
	if (!serviceRequest.value || submittingServiceRequest.value) return;
	error.value = '';
	submittingServiceRequest.value = true;
	try {
		const payload = {
			service: serviceRequest.value.service,
			full_name: serviceRequestForm.full_name.trim(),
			phone: serviceRequestForm.phone.trim(),
			company: serviceRequestForm.company.trim(),
		};
		if (serviceRequest.value.service === 'module_pricing') {
			payload.module_ids = JSON.stringify(serviceRequest.value.moduleIds);
			payload.addon_ids = JSON.stringify(serviceRequest.value.addonIds);
		} else {
			payload.context = serviceRequest.value.context;
		}
		const result = await submitServiceRequestResource.submit(payload);
		serviceRequestResult.value = result?.message || result;
		const nextUrl = new URL(window.location.href);
		for (const key of ['asumi_service_request', 'service', 'context', 'modules', 'addons']) nextUrl.searchParams.delete(key);
		window.history.replaceState(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
	} catch (failure) { showError(failure); } finally { submittingServiceRequest.value = false; }
}

function applyServicePricing(value) {
	try {
		const pricing = validateAsumiServicePricing(value?.message || value);
		Object.assign(servicePricingForm, pricing);
		servicePricingLoaded.value = true;
		servicePricingError.value = '';
	} catch (failure) {
		servicePricingLoaded.value = false;
		servicePricingError.value = failure?.message || 'تعرفهٔ دریافتی از سرور معتبر نیست.';
	}
}

async function loadServicePricing() {
	servicePricingError.value = '';
	servicePricingNotice.value = '';
	try {
		const result = await adminServicePricing.fetch();
		if (!servicePricingLoaded.value && result) applyServicePricing(result);
	} catch (failure) {
		servicePricingError.value = failure?.messages?.[0] || failure?.message || 'بارگذاری تعرفه‌های آسومی ناموفق بود.';
	}
}

async function saveServicePricing() {
	if (!servicePricingLoaded.value || savingServicePricing.value) return;
	servicePricingError.value = '';
	servicePricingNotice.value = '';
	savingServicePricing.value = true;
	try {
		const result = await saveServicePricingResource.submit(buildAsumiServicePricingPayload(servicePricingForm));
		applyServicePricing(result?.message || result);
		if (servicePricingLoaded.value) servicePricingNotice.value = 'تعرفه‌های جدید ذخیره شد و از این پس در صفحهٔ تعرفهٔ آسومی استفاده می‌شود.';
	} catch (failure) {
		servicePricingError.value = failure?.messages?.[0] || failure?.message || 'ذخیرهٔ تعرفه‌های آسومی ناموفق بود.';
	} finally {
		savingServicePricing.value = false;
	}
}

function serviceModuleTitle(id) {
	return ASUMI_SERVICE_PRICE_CATALOG.modules.find(item => item.id === id)?.title || id;
}

function serviceAddonTitle(id) {
	return ASUMI_SERVICE_PRICE_CATALOG.addons.find(item => item.id === id)?.title || id;
}

async function updateServiceRequestStatus(lead, status) {
	error.value = '';
	try {
		const result = await updateServiceRequestStatusResource.submit({ name: lead.name, status });
		lead.status = result?.status || result?.message?.status || status;
	} catch (failure) { showError(failure); await adminServiceRequests.fetch(); }
}

async function purchase(plan) {
	const target = selectedSiteTarget.value;
	if (!target || busy.value) return;
	error.value = '';
	busyPlan.value = plan.name;
	try {
		const result = await startPurchaseResource.submit({ plan: plan.name, ...commercePurchaseSiteParams(target) });
		if (result?.free || result?.message?.free) {
			await Promise.all([orders.fetch(), plans.fetch({ site: target.name, site_type: target.site_type })]);
			notice.value = result?.already_active || result?.message?.already_active
				? 'این تعرفهٔ رایگان از قبل روی سایت فعال است.'
				: 'درخواست رایگان ثبت شد و فعال‌سازی آن در حال انجام است.';
			return;
		}
		const checkout = result?.checkout_url || result?.message?.checkout_url;
		if (!checkout || !checkout.startsWith('https://')) throw new Error('نشانی امن پرداخت از سرور دریافت نشد.');
		window.location.assign(checkout);
	} catch (failure) { showError(failure); } finally { busyPlan.value = ''; }
}

async function purchaseHosting(plan) {
	if (busy.value || !plan.available) return;
	error.value = '';
	busyPlan.value = plan.name;
	try {
		const params = { plan: plan.name };
		if (plan.commerce_delivery_mode === 'Upgrade Existing Site') {
			params.site = hostingSiteByPlan[plan.name];
			if (!params.site) throw new Error('ابتدا سایت فعال را انتخاب کنید.');
		} else {
			if (hostingRenewSiteByPlan[plan.name]) {
				params.site = hostingRenewSiteByPlan[plan.name];
			} else {
				params.subdomain = (hostingSubdomains[plan.name] || '').trim();
				params.apps = hostingAppsByPlan[plan.name] || [];
				if (!params.subdomain) throw new Error('نام زیردامنهٔ سایت جدید را وارد کنید.');
			}
		}
		const result = await startHostingPurchaseResource.submit(params);
		const checkout = result?.checkout_url || result?.message?.checkout_url;
		if (!checkout || !checkout.startsWith('https://')) throw new Error('نشانی امن پرداخت از سرور دریافت نشد.');
		window.location.assign(checkout);
	} catch (failure) { showError(failure); } finally { busyPlan.value = ''; }
}

function isHostingAppSelected(plan, app) {
	return (hostingAppsByPlan[plan] || []).includes(app);
}

function toggleHostingApp(plan, app, checked) {
	const selected = new Set(hostingAppsByPlan[plan] || []);
	if (checked) selected.add(app);
	else selected.delete(app);
	hostingAppsByPlan[plan] = [...selected];
}

async function saveSettings() {
	error.value = '';
	savingSettings.value = true;
	try {
		await saveSettingsResource.submit({ ...settingsForm, merchant_id: merchantId.value || undefined });
		merchantId.value = '';
		await Promise.all([settings.fetch(), hostingReadiness.fetch()]);
		notice.value = 'تنظیمات درگاه و ذخیرهٔ ظرفیت میزبان ذخیره شد. پرداخت فقط با شناسهٔ معتبر پذیرنده در حالت تولید قابل استفاده است.';
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

async function createMarketplacePlan() {
	error.value = '';
	creatingMarketplacePlan.value = true;
	try {
		await createMarketplacePlanResource.submit({ ...newMarketplacePlan, title: newMarketplacePlan.title.trim() });
		await appPlans.fetch();
		Object.assign(newMarketplacePlan, { app: '', title: '', interval: 'Monthly' });
		showCreateMarketplacePlan.value = false;
		notice.value = 'پیش‌نویس تعرفه ساخته شد. قیمت‌ها را در جدول تنظیم کن و پس از آماده‌شدن فروش آن را فعال کن.';
	} catch (failure) { showError(failure); } finally { creatingMarketplacePlan.value = false; }
}

async function saveSitePrices(row) {
	error.value = '';
	try {
		await saveSitePriceResource.submit({
			plan: row.name, plan_title: row.plan_title, plan_description: row.plan_description, price_inr: row.price_inr, price_usd: row.price_usd,
			price_irr: row.price_irr, delivery_mode: row.commerce_delivery_mode, interval: row.interval,
			enabled: row.enabled, max_database_usage: row.max_database_usage, max_storage_usage: row.max_storage_usage,
			memory: row.memory, cpu_time_per_day: row.cpu_time_per_day,
			release_groups: row.release_groups || [], allowed_apps: row.allowed_apps || [],
		});
		await sitePlans.fetch();
		notice.value = 'تنظیمات تعرفهٔ میزبانی ذخیره شد.';
	} catch (failure) { showError(failure); }
}

function sitePlanApps(row) {
	const groups = sitePlanOptions.data?.release_groups || [];
	const selectedGroups = row.release_groups || [];
	return sharedSiteApps(groups.filter(group => !selectedGroups.length || selectedGroups.includes(group.name)));
}

function sharedSiteApps(groups) {
	const appSets = groups.map(group => new Set(group.apps || []));
	if (!appSets.length) return [];
	return [...appSets[0]].filter(app => app !== 'frappe' && appSets.every(apps => apps.has(app))).sort();
}

function toggleSitePlanGroup(row, group, checked) {
	const selected = new Set(row.release_groups || []);
	if (checked) selected.add(group);
	else selected.delete(group);
	row.release_groups = [...selected];
	const eligible = new Set(sitePlanApps(row));
	row.allowed_apps = (row.allowed_apps || []).filter(app => eligible.has(app));
}

function toggleSitePlanApp(row, app, checked) {
	const selected = new Set(row.allowed_apps || []);
	if (checked) selected.add(app);
	else selected.delete(app);
	row.allowed_apps = [...selected];
}

function toggleNewPlanGroup(group, checked) {
	const selected = new Set(newSitePlan.release_groups);
	if (checked) selected.add(group);
	else selected.delete(group);
	newSitePlan.release_groups = [...selected];
	const eligible = new Set(newPlanApps.value);
	newSitePlan.allowed_apps = newSitePlan.allowed_apps.filter(app => eligible.has(app));
}

function toggleNewPlanApp(app, checked) {
	const selected = new Set(newSitePlan.allowed_apps);
	if (checked) selected.add(app);
	else selected.delete(app);
	newSitePlan.allowed_apps = [...selected];
}

async function createSitePlan() {
	error.value = '';
	creatingSitePlan.value = true;
	try {
		await createSitePlanResource.submit({
			name: newSitePlan.name.trim(), title: newSitePlan.title.trim(), description: newSitePlan.description.trim(),
			interval: newSitePlan.interval, delivery_mode: newSitePlan.delivery_mode,
			release_groups: newSitePlan.release_groups, allowed_apps: newSitePlan.allowed_apps,
		});
		await Promise.all([sitePlans.fetch(), sitePlanOptions.fetch(), hostingReadiness.fetch()]);
		Object.assign(newSitePlan, { name: '', title: '', description: '', interval: 'Monthly', delivery_mode: 'Upgrade Existing Site', release_groups: [], allowed_apps: [] });
		showCreateSitePlan.value = false;
		notice.value = 'پیش‌نویس پلن ساخته شد. قیمت و سقف منابع را تنظیم کن و بعد پلن را فعال کن.';
	} catch (failure) { showError(failure); } finally { creatingSitePlan.value = false; }
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
		const calls = [sites.fetch(), orders.fetch(), hostingOffers.fetch()];
		if (isCommerceAdmin.value) calls.push(settings.fetch(), adminServicePricing.fetch(), hostingReadiness.fetch(), appPlans.fetch(), marketplacePlanOptions.fetch(), sitePlans.fetch(), sitePlanOptions.fetch(), adminOrders.fetch(), adminServiceRequests.fetch());
		if (selectedSiteTarget.value) calls.push(plans.fetch({ site: selectedSiteTarget.value.name, site_type: selectedSiteTarget.value.site_type }));
		await Promise.all(calls);
	} catch (failure) { showError(failure); }
}

function showError(failure) {
	error.value = failure?.messages?.[0] || failure?.message || 'عملیات ناموفق بود.';
}
function money(value) { return new Intl.NumberFormat('fa-IR').format(Number(value || 0)); }
function gib(value) { return Number.isFinite(Number(value)) ? new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(Number(value) / 1024 ** 3) : '—'; }
function dateLabel(value) { return value ? new Date(value).toLocaleString('fa-IR') : '—'; }
function intervalLabel(value) { return ({ Daily: 'روزانه', Monthly: 'ماهانه', Yearly: 'سالانه', Annually: 'سالانه' })[value] || '—'; }
function statusLabel(value) { return ({ 'Pending Payment': 'در انتظار پرداخت', Paid: 'پرداخت شد', Provisioning: 'در حال تحویل', Active: 'فعال', Expired: 'پایان‌یافته', 'Provisioning Failed': 'خطای تحویل', 'Payment Failed': 'پرداخت ناموفق', Cancelled: 'لغو شد', Refunded: 'بازپرداخت شد' })[value] || value; }
function statusClass(value) { return ({ Active: 'bg-emerald-100 text-emerald-800', Paid: 'bg-blue-100 text-blue-800', Provisioning: 'bg-amber-100 text-amber-800', 'Provisioning Failed': 'bg-rose-100 text-rose-800', 'Payment Failed': 'bg-rose-100 text-rose-800', Refunded: 'bg-gray-100 text-gray-700', Expired: 'bg-gray-100 text-gray-700', Cancelled: 'bg-gray-100 text-gray-700' })[value] || 'bg-amber-100 text-amber-800'; }
</script>
