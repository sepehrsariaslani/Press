<script setup>
defineProps({
  primaryText: {
    type: String,
    required: true
  },
  secondaryText: {
    type: String,
    default: ''
  },
  secondaryTo: {
    type: String,
    default: '/demo'
  }
});

defineEmits(['primaryClick']);
</script>

<template>
  <div class="cta-cluster">
    <button class="btn btn-primary btn-lg" @click="$emit('primaryClick')">
      <span>{{ primaryText }}</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon-arrow"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
    </button>
    <RouterLink v-if="secondaryText" class="btn btn-outline btn-lg" :to="secondaryTo">
      {{ secondaryText }}
    </RouterLink>
  </div>
</template>

<style scoped>
.cta-cluster {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.btn-lg {
  padding: 12px 24px;
  font-size: 15px;
}

.icon-arrow {
  margin-right: 4px;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover .icon-arrow {
  transform: translateX(-4px);
}
</style>
