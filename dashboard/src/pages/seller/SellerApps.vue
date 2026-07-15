<template>
	<div class="space-y-4 py-5">
		<div
			v-if="privateSourceOnly"
			class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
		>
			<div class="font-medium">ثبت برنامه از مسیر لوکال سرور</div>
			<p class="mt-1 leading-6">
				برای اضافه/آپدیت برنامه بدون گیت‌هاب، اسکریپت
				<code>tools/register_local_marketplace_app.sh</code>
				را در پروژه
				<code>apps/press/dashboard</code>
				اجرا کنید.
			</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<Button size="sm" variant="outline" @click="copyRegisterCommand">
					کپی دستور نمونه
				</Button>
			</div>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="relative w-full md:w-96">
				<input
					v-model="search"
					placeholder="جستجو بر اساس نام برنامه..."
					class="h-8 w-full rounded border border-gray-200 px-3 text-sm focus:border-gray-400 focus:outline-none"
				/>
			</div>
			<Button variant="solid" @click="openNewAppDialog">
				{{ privateSourceOnly ? 'ثبت برنامه از سرور' : 'ثبت برنامه جدید' }}
			</Button>
		</div>

		<div v-if="$resources.apps.loading" class="rounded border p-6 text-sm text-gray-600">
			در حال بارگذاری برنامه‌ها...
		</div>
		<div v-else-if="!filteredApps.length" class="rounded border p-6 text-sm text-gray-600">
			برنامه‌ای پیدا نشد.
		</div>
		<div v-else class="grid gap-3 lg:grid-cols-2">
			<div
				v-for="app in filteredApps"
				:key="app.name"
				class="rounded-lg border p-4"
			>
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-3">
						<img
							v-if="app.image"
							:src="app.image"
							:alt="app.title"
							class="h-10 w-10 rounded-md border object-cover"
						/>
						<div v-else class="grid h-10 w-10 place-items-center rounded-md border bg-gray-100 text-sm font-semibold text-gray-700">
							{{ (app.title || app.name || '?').slice(0, 1).toUpperCase() }}
						</div>
						<div>
							<div class="text-base font-medium text-gray-900">
								{{ app.title || app.name }}
							</div>
							<div class="mt-1 line-clamp-2 text-sm text-gray-600">
								{{ app.description || 'توضیحی برای این برنامه ثبت نشده است.' }}
							</div>
						</div>
					</div>
					<Badge :label="app.status" />
				</div>
				<div class="mt-4 flex flex-wrap gap-2">
					<Button
						size="sm"
						variant="subtle"
						:route="{ name: 'Marketplace App Detail Listing', params: { name: app.name } }"
					>
						ویرایش معرفی
					</Button>
					<Button
						size="sm"
						variant="subtle"
						:route="{ name: 'Marketplace App Detail Pricing', params: { name: app.name } }"
					>
						مدیریت تعرفه
					</Button>
					<Button
						size="sm"
						variant="subtle"
						:route="{ name: 'Marketplace App Detail Versions', params: { name: app.name } }"
					>
						نسخه‌ها
					</Button>
					<Button
						v-if="app.status === 'Published'"
						size="sm"
						variant="subtle"
						@click="openMarketplacePage(app.name)"
					>
						نمایش عمومی
					</Button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { defineAsyncComponent, h } from 'vue';
import { toast } from 'vue-sonner';
import { privateSourceOnly } from '../../data/security';
import { renderDialog } from '../../utils/components';

export default {
	name: 'SellerApps',
	data() {
		return {
			search: '',
			privateSourceOnly,
		};
	},
	resources: {
		apps() {
			return {
				url: 'press.api.client.get_list',
				auto: true,
				params: {
					doctype: 'Marketplace App',
					fields: ['name', 'title', 'status', 'description', 'image', 'modified'],
					order_by: 'modified desc',
					limit: 500,
				},
				initialData: [],
			};
		},
	},
	computed: {
		filteredApps() {
			const query = this.search.trim().toLowerCase();
			const apps = this.$resources.apps.data || [];
			if (!query) return apps;
			return apps.filter((app) =>
				`${app.title || ''} ${app.name || ''}`.toLowerCase().includes(query),
			);
		},
	},
	methods: {
		openNewAppDialog() {
			if (this.privateSourceOnly) {
				toast.info(
					'افزودن برنامه از گیت‌هاب غیرفعال است. لطفا برنامه را از سمت سرور اضافه کنید.',
				);
				return;
			}
			const NewMarketplaceAppDialog = defineAsyncComponent(
				() => import('../../components/marketplace/NewMarketplaceAppDialog.vue'),
			);
			renderDialog(h(NewMarketplaceAppDialog));
		},
		copyRegisterCommand() {
			const team = this.$team?.doc?.name || 'TEAM_NAME';
			const command = `tools/register_local_marketplace_app.sh --site den --team ${team} --app your_app --title "Your App" --path "/Users/sepehr/Downloads/frappe-bench/apps/your_app" --version "Version 15" --branch develop --monthly-usd 15 --yearly-usd 150 --show-onboarding 1`;
			navigator.clipboard
				.writeText(command)
				.then(() => toast.success('دستور در کلیپ‌بورد کپی شد'))
				.catch(() => toast.error('کپی دستور ناموفق بود'));
		},
		openMarketplacePage(app) {
			window.open(`${window.location.origin}/marketplace/apps/${app}`, '_blank');
		},
	},
};
</script>
