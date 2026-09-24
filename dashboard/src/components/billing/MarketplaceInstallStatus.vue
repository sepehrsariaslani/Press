<template>
	<section
		class="mb-5 rounded-lg border p-4"
		:class="tone"
		role="status"
		aria-live="polite"
	>
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-start gap-3">
				<Spinner v-if="installation.status === 'pending'" class="mt-0.5" />
				<lucide-check-circle-2
					v-else-if="installation.status === 'success'"
					class="mt-0.5 size-5 text-ink-green-2"
					aria-hidden="true"
				/>
				<lucide-alert-triangle
					v-else
					class="mt-0.5 size-5 text-ink-amber-3"
					aria-hidden="true"
				/>
				<div>
					<p class="text-sm font-semibold text-ink-gray-9">{{ title }}</p>
					<p class="mt-1 text-xs leading-5 text-ink-gray-6">{{ message }}</p>
				</div>
			</div>
			<div class="flex gap-2 sm:shrink-0">
				<Button
					v-if="installation.status !== 'success'"
					label="Check status"
					:loading="checking"
					@click="$emit('check')"
				/>
				<Button v-else label="Manage site apps" @click="$emit('manage')" />
			</div>
		</div>
	</section>
</template>

<script>
import { Button, Spinner } from 'frappe-ui'

export default {
	name: 'MarketplaceInstallStatus',
	components: { Button, Spinner },
	props: {
		installation: { type: Object, required: true },
		checking: { type: Boolean, default: false },
	},
	emits: ['check', 'manage'],
	computed: {
		tone() {
			if (this.installation.status === 'success') return 'border-outline-green-2 bg-surface-green-1'
			if (this.installation.status === 'attention') return 'border-outline-amber-2 bg-surface-amber-1'
			return 'border-outline-blue-2 bg-surface-blue-1'
		},
		title() {
			if (this.installation.status === 'success') return `${this.installation.title} is installed`
			if (this.installation.status === 'attention') return `We couldn't confirm ${this.installation.title}`
			return `Installing ${this.installation.title}`
		},
		message() {
			if (this.installation.status === 'success') return 'The app is ready on your selected site.'
			if (this.installation.status === 'attention') return 'Check the app status on your site, then retry if it is still missing.'
			return 'This can take a few minutes. You can keep comparing apps while we check the result.'
		},
	},
}
</script>
