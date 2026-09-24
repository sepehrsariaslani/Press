<template>
	<section class="rounded-lg border border-outline-gray-1 bg-surface-white p-5">
		<div class="flex items-start gap-3">
			<div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-green-2 text-ink-green-2">
				<lucide-check class="size-4" aria-hidden="true" />
			</div>
			<div>
				<h2 class="text-base font-semibold text-ink-gray-9">
					Included ERPNext modules
				</h2>
				<p class="mt-1 text-sm text-ink-gray-6">
					When ERPNext is installed, these standard modules have no separate
					app-plan charge.
				</p>
			</div>
		</div>

		<div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
			<div
				v-for="module in includedERPNextModules"
				:key="module.name"
				class="rounded-md bg-surface-gray-1 px-3 py-2.5"
			>
				<div class="flex items-center justify-between gap-2">
					<span class="text-sm font-medium text-ink-gray-9">{{ module.name }}</span>
					<span class="text-xs font-medium text-ink-green-2">Included</span>
				</div>
				<p class="mt-1 text-xs leading-5 text-ink-gray-6">
					{{ module.description }}
				</p>
			</div>
		</div>
	</section>
</template>

<script setup>
import { includedERPNextModules } from '@/data/pricing'
</script>
