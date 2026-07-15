<script setup>
import ProductModuleCard from './ProductModuleCard.vue';

defineProps({
  baseProduct: {
    type: Object,
    required: true
  },
  publicAddons: {
    type: Array,
    required: true
  },
  selectedAddons: {
    type: Array,
    required: true
  }
});

defineEmits(['toggleAddon']);

const formatPrice = (value) => {
  return value.toLocaleString('fa-IR') + ' تومان';
};
</script>

<template>
  <div class="pricing-composer-options">
    
    <!-- Base Platform Card (Always Active) -->
    <div class="base-product-card-interactive active">
      <div class="selection-indicator">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="text-black"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span class="badge-required">پلتفرم الزامی</span>
          <span class="addon-price">{{ formatPrice(baseProduct.price) }} / ماه</span>
        </div>
        <h3>{{ baseProduct.name }}</h3>
        <p>{{ baseProduct.description }}</p>
        <ul class="features-bullets">
          <li v-for="feat in baseProduct.features.slice(0, 4)" :key="feat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="bullet-check"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>{{ feat }}</span>
          </li>
        </ul>
      </div>
    </div>

    <h3 class="group-title">افزونه‌ها و ماژول‌های ابری اختیاری:</h3>

    <!-- Interactive Add-ons List -->
    <div class="addons-interactive-list">
      <ProductModuleCard 
        v-for="addon in publicAddons" 
        :key="addon.id" 
        :addon="addon"
        :active="selectedAddons.includes(addon.id)"
        :is-selectable="true"
        @toggle="$emit('toggleAddon', addon.id)"
      />
    </div>

  </div>
</template>

<style scoped>
.pricing-composer-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.base-product-card-interactive {
  border: 1px solid var(--erpyar-primary);
  background: var(--erpyar-bg-translucent);
  backdrop-filter: blur(12px);
  border-radius: var(--erpyar-radius-lg);
  padding: 24px;
  display: flex;
  gap: 16px;
  position: relative;
  box-shadow: var(--erpyar-glow-shadow);
}

.selection-indicator {
  width: 26px;
  height: 26px;
  background: var(--erpyar-primary);
  border-radius: 999px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.text-black {
  color: #07080b;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.badge-required {
  background: rgba(195, 155, 98, 0.1);
  color: var(--erpyar-primary);
  border: 1px solid rgba(195, 155, 98, 0.2);
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
}

.addon-price {
  font-size: 15px;
  font-weight: 800;
  color: var(--erpyar-primary-light);
}

.base-product-card-interactive h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--erpyar-text-primary);
}

.base-product-card-interactive p {
  margin: 0;
  font-size: 13.5px;
  color: var(--erpyar-text-secondary);
  line-height: 1.7;
}

.features-bullets {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  border-top: 1px solid rgba(195, 155, 98, 0.08);
  padding-top: 14px;
}

@media (max-width: 640px) {
  .features-bullets {
    grid-template-columns: 1fr;
  }
}

.features-bullets li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--erpyar-text-secondary);
}

.bullet-check {
  color: var(--erpyar-primary);
  flex-shrink: 0;
}

.group-title {
  font-size: 15.5px;
  margin: 12px 0 4px;
  color: var(--erpyar-text-primary);
  font-weight: 800;
  letter-spacing: -0.5px;
}

.addons-interactive-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
