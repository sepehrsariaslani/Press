<template>
	<div class="asumi-brand">
		<span class="asumi-brand__identity">
			<img
				class="asumi-brand__mark"
				:src="'/assets/press/asumi_site/asumi-mark.svg'"
				alt=""
				aria-hidden="true"
			/>
			<span class="asumi-brand__wordmark">ASUMI</span>
		</span>
		<span v-if="$slots.meta" class="asumi-brand__product">
			<slot name="meta" />
		</span>
	</div>
</template>
