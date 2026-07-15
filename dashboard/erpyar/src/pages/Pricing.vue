<script setup>
import { ref, onMounted } from 'vue';
import { fetchErpyarCatalog } from '@/api';
import { pricingPlans as staticPricingPlans } from '@/content';

// Import modular reusable components
import SectionHeader from '@/components/SectionHeader.vue';

const pricingPlans = ref(staticPricingPlans);

onMounted(async () => {
  try {
    const apiCatalog = await fetchErpyarCatalog();
    if (apiCatalog && apiCatalog.length > 0) {
      const baseItem = apiCatalog.find(p => p.product_id === 'base' || !p.is_addon);
      const addons = apiCatalog.filter(p => p.product_id !== 'base' && p.is_addon);
      
      const plans = [];
      if (baseItem) {
        plans.push({
          name: baseItem.product_name,
          price: baseItem.price.toLocaleString('fa-IR') + ' تومان',
          period: baseItem.period,
          items: baseItem.features || [],
          featured: true
        });
      }
      for (const addon of addons) {
        plans.push({
          name: addon.product_name,
          price: addon.price.toLocaleString('fa-IR') + ' تومان',
          period: addon.period,
          items: addon.features || [],
          featured: false
        });
      }
      pricingPlans.value = plans;
    }
  } catch (error) {
    console.warn('Unable to load dynamic pricing catalog:', error);
  }
});
</script>

<template>
  <section class="page-card pricing-page-container">
    <SectionHeader 
      badge="تعرفه‌ها و ماژول‌ها"
      title="سیستم قیمت‌گذاری شفاف و ماژولار ارپ‌یار"
      subtitle="شما همیشه با پلتفرم پایه شروع می‌کنید و سپس هر ماژول یا افزونه‌ای که نیاز دارید را به سیستم خود اضافه می‌کنید. هیچ هزینه پنهانی وجود ندارد."
    />

    <div class="grid grid-3" style="margin-top: 24px">
      <article
        v-for="plan in pricingPlans"
        :key="plan.name"
        class="item glass-card pricing-card"
        :class="{ 'plan-featured': plan.featured }"
      >
        <div class="card-glow" :style="plan.featured ? 'opacity: 0.15' : 'opacity: 0'"></div>
        
        <span v-if="plan.featured" class="badge">پلتفرم پایه (الزامی)</span>
        <span v-else class="badge">ماژول ابری اختیاری</span>
        
        <h3 style="margin-top: 14px; font-size: 18px; font-weight: 800;">{{ plan.name }}</h3>
        <h4 style="margin-top: 6px; font-size: 20px; color: var(--erpyar-primary-light); font-weight: 900;">
          {{ plan.price }} <span class="period-text">/ {{ plan.period }}</span>
        </h4>
        
        <ul class="list" style="margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
          <li v-for="feature in plan.items" :key="feature" class="feature-li">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="feat-check"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>{{ feature }}</span>
          </li>
        </ul>
      </article>
    </div>

    <!-- Final Interactive Link Call To Action -->
    <div class="page-card text-center action-box" style="margin-top: 30px; background: rgba(255,255,255,0.01); border-color: var(--erpyar-border);">
      <h3 style="margin: 0; font-size: 18px; font-weight: 800;">می‌خواهید ترکیب ماژول‌های دلخواه خود را بسازید؟</h3>
      <p style="font-size: 13.5px; margin: 8px 0 20px; color: var(--erpyar-text-secondary);">با استفاده از ماشین‌حساب پویای صفحه اصلی، ترکیب افزونه‌های دلخواه خود را بسازید و دوره تست ۱۴ روزه خود را آغاز کنید.</p>
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <RouterLink class="btn btn-primary" to="/">ورود به ماشین‌حساب قیمت در صفحه اصلی</RouterLink>
        <RouterLink class="btn btn-outline" to="/demo">ثبت سفارش تست رایگان (۱۴ روزه)</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pricing-page-container {
  background: radial-gradient(circle at 0% 100%, rgba(195, 155, 98, 0.05), transparent 50%), var(--erpyar-bg-surface);
}

.text-center {
  text-align: center;
}

.pricing-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.pricing-card.plan-featured {
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
  z-index: 0;
}

.pricing-card * {
  z-index: 1;
}

.period-text {
  font-size: 12px;
  color: var(--erpyar-text-muted);
  font-weight: 500;
}

.feature-li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--erpyar-text-secondary);
}

.feat-check {
  color: var(--erpyar-primary);
  flex-shrink: 0;
}

.action-box {
  position: relative;
}

.action-box::before {
  display: none; /* remove page card gradient line for secondary container */
}
</style>
