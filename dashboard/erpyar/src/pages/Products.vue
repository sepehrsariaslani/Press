<script setup>
import { ref, onMounted } from 'vue';
import { fetchErpyarCatalog } from '@/api';
import { homeSections as staticHomeSections } from '@/content';

// Import modular reusable components
import SectionHeader from '@/components/SectionHeader.vue';
import ProductModuleCard from '@/components/ProductModuleCard.vue';

const products = ref(staticHomeSections.products);

onMounted(async () => {
  try {
    const apiCatalog = await fetchErpyarCatalog();
    if (apiCatalog && apiCatalog.length > 0) {
      const list = [];
      const baseItem = apiCatalog.find(p => p.product_id === 'base' || !p.is_addon);
      const addons = apiCatalog.filter(p => p.product_id !== 'base' && p.is_addon);
      
      if (baseItem) {
        list.push({
          id: 'base',
          name: baseItem.product_name,
          description: baseItem.description,
          price: baseItem.price,
          priceFormatted: baseItem.price.toLocaleString('fa-IR'),
          features: baseItem.features || [],
          is_addon: false,
          to: null
        });
      }
      for (const addon of addons) {
        list.push({
          id: addon.product_id,
          name: addon.product_name,
          description: addon.description,
          price: addon.price,
          priceFormatted: addon.price.toLocaleString('fa-IR'),
          features: addon.features || [],
          is_addon: true,
          to: addon.product_id === 'erpnext' || addon.product_id === 'crm' ? `/products/${addon.product_id}` : null
        });
      }
      products.value = list;
    }
  } catch (error) {
    console.warn('Unable to load dynamic products catalog:', error);
  }
});
</script>

<template>
  <section class="page-card products-page-container">
    <SectionHeader 
      badge="محصولات و ماژول‌ها"
      title="سبد کامل راهکارهای سازمانی ارپ‌یار"
      subtitle="هسته مرکزی ابری خود را تهیه کنید و از میان ماژول‌های حسابداری، زنجیره تامین، ارتباط با مشتری و صندوق‌های اختصاصی، مناسب‌ترین ستاپ را برای رشد سازمان خود برگزینید."
    />

    <div class="products-grid" style="margin-top: 24px">
      <!-- Rendering each product/module as a premium ProductModuleCard -->
      <div v-for="product in products" :key="product.name" class="product-item-wrapper">
        <ProductModuleCard 
          :addon="product"
          :active="!product.is_addon"
          :is-selectable="false"
        />
        
        <!-- Hover details footer link if clickable details page exists -->
        <div v-if="product.to" class="details-link-overlay">
          <RouterLink :to="product.to" class="btn btn-outline btn-sm">
            <span>مشاهده معرفی تخصصی ماژول</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="icon-arrow"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </RouterLink>
        </div>
        <div v-else class="details-static-badge">
          <span>مستقر به صورت کاملاً مدیریت‌شده روی پلتفرم پایه</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.products-page-container {
  background: radial-gradient(circle at 100% 100%, rgba(195, 155, 98, 0.05), transparent 50%), var(--erpyar-bg-surface);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

@media (max-width: 980px) {
  .products-grid {
    grid-template-columns: 1fr;
  }
}

.product-item-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

.details-link-overlay {
  display: flex;
  justify-content: flex-end;
  padding-left: 10px;
}

.details-link-overlay span {
  font-weight: 700;
}

.details-static-badge {
  font-size: 11.5px;
  color: var(--erpyar-text-muted);
  padding-right: 12px;
  font-weight: 600;
}

.icon-arrow {
  margin-right: 4px;
  transition: transform 0.2s ease;
}

.btn-sm:hover .icon-arrow {
  transform: translateX(-3px);
}

.btn-sm {
  padding: 8px 16px;
  font-size: 12.5px;
}
</style>
