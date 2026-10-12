<template>
	<div class="asumi-brand">
		<span class="asumi-brand__wordmark">ASUMI</span>
		<span v-if="$slots.meta" class="asumi-brand__product">
			<slot name="meta" />
		</span>
	</div>
</template>
