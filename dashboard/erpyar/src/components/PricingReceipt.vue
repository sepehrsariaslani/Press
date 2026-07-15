<script setup>
import { computed } from 'vue';

const props = defineProps({
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
  },
  ctaText: {
    type: String,
    default: 'شروع دوره تست رایگان ۱۴ روزه'
  }
});

defineEmits(['checkoutClick']);

const totalPrice = computed(() => {
  const addonsCost = props.publicAddons
    .filter(addon => props.selectedAddons.includes(addon.id))
    .reduce((sum, addon) => sum + addon.price, 0);
  return props.baseProduct.price + addonsCost;
});

const formatPrice = (value) => {
  return value.toLocaleString('fa-IR') + ' تومان';
};
</script>

<template>
  <div class="pricing-receipt glass-card">
    <h3 class="receipt-title">پیش‌فاکتور اشتراک ابری</h3>
    
    <div class="receipt-items">
      <!-- Base product row -->
      <div class="receipt-row">
        <span class="item-name">{{ baseProduct.name }}</span>
        <span class="item-value">{{ formatPrice(baseProduct.price) }}</span>
      </div>
      
      <!-- Selected Addons list -->
      <div v-if="selectedAddons.length > 0" class="receipt-addons-divider">افزونه‌های انتخابی</div>
      
      <div v-for="addonId in selectedAddons" :key="addonId" class="receipt-row addon-row">
        <span class="item-name">
          <span class="plus">+</span> {{ publicAddons.find(a => a.id === addonId)?.name || addonId }}
        </span>
        <span class="item-value">
          {{ formatPrice(publicAddons.find(a => a.id === addonId)?.price || 0) }}
        </span>
      </div>
    </div>

    <div class="receipt-total-block">
      <div class="receipt-row total-row">
        <span class="total-label">مجموع اشتراک ماهانه پس از تست</span>
        <span class="total-amount">{{ formatPrice(totalPrice) }}</span>
      </div>
      <p class="trial-text-info">
        فاکتور نهایی پس از اتمام دوره آزمایشی صادر خواهد شد. هم‌اکنون می‌توانید بدون نیاز به پرداخت، به مدت <strong>۱۴ روز</strong> به صورت آزمایشی استفاده کنید.
      </p>
    </div>

    <button class="btn btn-primary btn-block btn-xl" @click="$emit('checkoutClick')">
      <span>{{ ctaText }}</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon-arrow"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
    </button>

    <div class="guarantee-badge">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="guarantee-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
      <span>۱۴ روز تست رایگان کامل + ۷ روز مهلت تنفس</span>
    </div>
  </div>
</template>

<style scoped>
.pricing-receipt {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
  overflow: hidden;
}

.pricing-receipt::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--erpyar-primary), transparent);
}

.receipt-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  padding-bottom: 12px;
  border-bottom: 2px dashed var(--erpyar-border);
  color: var(--erpyar-text-primary);
  text-align: center;
}

.receipt-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.receipt-row {
  display: flex;
  justify-content: space-between;
  font-size: 13.5px;
  color: var(--erpyar-text-primary);
}

.receipt-row .item-name {
  font-weight: 600;
}

.receipt-row .item-value {
  font-weight: 700;
}

.receipt-addons-divider {
  font-size: 11px;
  font-weight: 800;
  color: var(--erpyar-text-secondary);
  margin-top: 10px;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.addon-row {
  font-size: 13px;
  color: var(--erpyar-text-secondary);
}

.addon-row .plus {
  color: var(--erpyar-primary);
  font-weight: 800;
  margin-left: 2px;
}

.receipt-total-block {
  padding-top: 16px;
  border-top: 1px solid var(--erpyar-border-light);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.total-row {
  font-size: 14px;
  font-weight: 800;
  color: var(--erpyar-text-primary);
}

.total-row .total-amount {
  font-size: 18px;
  font-weight: 900;
  color: var(--erpyar-primary-light);
  text-shadow: 0 0 10px rgba(195, 155, 98, 0.2);
}

.trial-text-info {
  font-size: 12px;
  color: var(--erpyar-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.btn-xl {
  padding: 14px 20px;
  font-weight: 800;
}

.btn-block {
  width: 100%;
}

.icon-arrow {
  margin-right: 8px;
  transition: transform 0.2s ease;
}

.btn-primary:hover .icon-arrow {
  transform: translateX(-4px);
}

.guarantee-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--erpyar-text-secondary);
}

.guarantee-icon {
  color: var(--erpyar-primary);
}
</style>
