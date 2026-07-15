<script setup>
defineProps({
  addon: {
    type: Object,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  },
  isSelectable: {
    type: Boolean,
    default: false
  }
});

defineEmits(['toggle']);
</script>

<template>
  <div 
    class="product-module-card"
    :class="{ 'active': active, 'selectable': isSelectable }"
    @click="isSelectable && $emit('toggle', addon.id)"
  >
    <div class="card-glow" :style="active ? 'opacity: 0.15' : 'opacity: 0'"></div>
    
    <div v-if="isSelectable" class="checkbox-indicator">
      <div class="custom-checkbox" :class="{ 'checked': active }">
        <svg v-if="active" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
    </div>

    <div class="card-body">
      <div class="card-header">
        <div class="title-block">
          <h3>{{ addon.name }}</h3>
          <span class="price-formatted">+ {{ addon.priceFormatted }} تومان / ماه</span>
        </div>
      </div>
      <p class="card-desc">{{ addon.description }}</p>
      
      <!-- Bullet Features list -->
      <ul v-if="addon.features && addon.features.length > 0" class="card-features">
        <li v-for="feat in addon.features" :key="feat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="feat-check"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>{{ feat }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.product-module-card {
  border: 1px solid var(--erpyar-border-light);
  border-radius: var(--erpyar-radius-lg);
  background: rgba(14, 15, 21, 0.75);
  backdrop-filter: blur(12px);
  padding: 24px;
  display: flex;
  gap: 16px;
  position: relative;
  overflow: hidden;
  box-shadow: var(--erpyar-shadow-subtle);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.product-module-card.selectable {
  cursor: pointer;
}

.product-module-card.selectable:hover {
  border-color: rgba(195, 155, 98, 0.3);
  transform: translateY(-2px);
  box-shadow: var(--erpyar-shadow-premium);
}

.product-module-card.active {
  border-color: var(--erpyar-primary);
  box-shadow: var(--erpyar-glow-shadow);
}

.card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 100% 0%, var(--erpyar-primary) 0%, transparent 60%);
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 0;
}

.checkbox-indicator {
  display: flex;
  align-items: flex-start;
  flex-shrink: 0;
  z-index: 1;
}

.custom-checkbox {
  width: 22px;
  height: 22px;
  border: 2px solid var(--erpyar-border-light);
  border-radius: 6px;
  display: grid;
  place-items: center;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.02);
}

.custom-checkbox.checked {
  border-color: var(--erpyar-primary);
  background: var(--erpyar-primary);
  color: #07080b;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  z-index: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.title-block h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: var(--erpyar-text-primary);
}

.price-formatted {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--erpyar-primary);
  display: block;
  margin-top: 4px;
}

.card-desc {
  font-size: 13px;
  color: var(--erpyar-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.card-features {
  margin-top: 8px;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  border-top: 1px solid rgba(195, 155, 98, 0.08);
  padding-top: 14px;
}

@media (max-width: 640px) {
  .card-features {
    grid-template-columns: 1fr;
  }
}

.card-features li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--erpyar-text-secondary);
}

.feat-check {
  color: var(--erpyar-primary);
  flex-shrink: 0;
}
</style>
