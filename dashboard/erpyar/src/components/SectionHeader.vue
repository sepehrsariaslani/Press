<script setup>
defineProps({
  badge: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  align: {
    type: String,
    default: 'center' /* 'center' or 'right' (RTL) */
  }
});
</script>

<template>
  <div class="section-header" :class="`align-${align}`">
    <span v-if="badge" class="badge-premium">{{ badge }}</span>
    <h2 class="section-title">
      {{ title }}
    </h2>
    <div class="divider-line"></div>
    <p v-if="subtitle" class="section-subtitle">{{ subtitle }}</p>
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  z-index: 10;
  margin-bottom: 24px;
}

.align-center {
  align-items: center;
  text-align: center;
}

.align-right {
  align-items: flex-start;
  text-align: right;
}

.badge-premium {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--erpyar-primary);
  background: rgba(195, 155, 98, 0.08);
  border: 1px solid rgba(195, 155, 98, 0.2);
  padding: 5px 14px;
  border-radius: 999px;
  text-transform: uppercase;
}

.section-title {
  font-size: clamp(22px, 3.2vw, 32px);
  font-weight: 900;
  color: var(--erpyar-text-primary);
  line-height: 1.35;
  margin: 0;
  letter-spacing: -0.5px;
}

.divider-line {
  width: 50px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--erpyar-primary), transparent);
}

.align-right .divider-line {
  background: linear-gradient(90deg, var(--erpyar-primary), transparent);
  width: 60px;
}

.section-subtitle {
  font-size: clamp(13.5px, 1.5vw, 15px);
  color: var(--erpyar-text-secondary);
  line-height: 1.8;
  max-width: 60ch;
  margin: 0;
}
</style>
