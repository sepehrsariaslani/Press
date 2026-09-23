<template>
	<div>
		<div
			class="mx-auto max-w-2xl rounded-lg border-0 px-2 py-8 sm:border sm:p-8 space-y-8 mt-10"
		>
			<div class="prose prose-sm max-w-none">
				<h1 class="text-2xl font-semibold">سرورها</h1>
				<p class="text-p-base">
					با سرورها در Frappe Cloud منابع پردازشی اختصاصی برای سایت‌های خود
					دارید. سرورها به‌صورت جفت (اپلیکیشن + دیتابیس) هستند و می‌توانید
					هر تعداد سایت و بنچ که بخواهید اجرا کنید.
				</p>
			</div>
			<div class="space-y-3">
				<h2 class="text-sm font-semibold tracking-wide text-gray-700">
					ویژگی‌ها
				</h2>
				<ul class="space-y-2">
					<li v-for="f in features" :key="f" class="flex items-center gap-2">
						<GreenCheckIcon class="h-4 w-4 shrink-0" />
						<span class="text-sm text-gray-700">{{ f }}</span>
					</li>
				</ul>
				<div>
					<Link
						href="https://docs.frappe.io/cloud/servers/servers-introduction"
						target="_blank"
						class="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
						>بیشتر بخوانید ←</Link
					>
				</div>
				<div v-if="!onboardingComplete" class="pt-2">
					<p class="text-sm text-gray-700">
						برای استفاده از سرورها ابتدا راه‌اندازی اولیه را کامل کنید.
					</p>
					<Button
						:route="{ name: 'Welcome' }"
						label="ادامه راه‌اندازی"
						class="mt-3"
					/>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import Link from '@/components/Link.vue';

export default {
	name: 'EnableServers',
	components: { Link },
	data() {
		return {
			features: [
				'سایت و بنچ نامحدود (بدون هزینه اضافه)',
				'بنچ‌های ایزوله به‌عنوان محیط جداگانه',
				'گارانتی محصول Frappe برای ۵ سایت منتخب',
				'افزایش پلن عمودی با یک کلیک',
				'هشدار مصرف منابع',
				'امکانات نصب، بروزرسانی، بکاپ، مانیتور و توسعه اپ',
			],
		};
	},
	computed: {
		serversEnabled() {
			return Boolean(this.$team?.doc?.servers_enabled);
		},
		onboardingComplete() {
			return Boolean(this.$team.doc.onboarding?.complete);
		},
	},
	mounted() {
		if (this.onboardingComplete && this.$team.doc.servers_enabled) {
			this.$router.push({ name: 'Server List' });
		}
	},
};
</script>
