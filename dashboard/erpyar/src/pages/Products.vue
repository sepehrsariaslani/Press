<script setup>
import { homeSections } from '@/content';
</script>

<template>
  <section class="page-card">
    <h1 class="section-title">محصولات و ماژول‌های ابری ارپ‌یار</h1>
    <p>
      راهکارهای ارپ‌یار برای سازمان‌هایی طراحی شده که به دنبال یک هسته مالی یکپارچه، فرآیندهای قابل اندازه‌گیری و زیرساخت پایدار برای رشد ابری هستند.
    </p>

    <div class="grid grid-2" style="margin-top: 20px">
      <template v-for="product in homeSections.products" :key="product.title">
        <!-- Clickable products (like ERPNext, CRM) with real detail pages -->
        <RouterLink v-if="product.to" :to="product.to" class="item clickable-product-card">
          <div class="card-title-row">
            <h3>{{ product.title }}</h3>
            <span class="badge-price">{{ product.price }}</span>
          </div>
          <p>{{ product.description }}</p>
          <span class="btn-link-action">بررسی جزئیات ماژول ←</span>
        </RouterLink>

        <!-- Non-clickable products (like Base Platform, Restaurant, Coffeeyar) with inline pricing/details -->
        <div v-else class="item static-product-card">
          <div class="card-title-row">
            <h3>{{ product.title }}</h3>
            <span class="badge-price static-price">{{ product.price }}</span>
          </div>
          <p>{{ product.description }}</p>
          <span class="btn-static-info">مستقر بر پلتفرم پایه ابری</span>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.badge-price {
  font-size: 12px;
  font-weight: 700;
  background: rgba(59, 130, 246, 0.1);
  color: var(--erpyar-secondary);
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.static-price {
  background: rgba(18, 184, 134, 0.1);
  color: var(--erpyar-primary-dark);
}

.clickable-product-card {
  transition: all 0.25s ease;
  cursor: pointer;
  border-color: var(--erpyar-border);
}

.clickable-product-card:hover {
  border-color: var(--erpyar-secondary);
  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.05);
  transform: translateY(-2px);
}

.static-product-card {
  border-color: var(--erpyar-border);
  background: #f8fafc;
}

.btn-link-action {
  color: var(--erpyar-secondary);
  font-size: 13px;
  font-weight: 700;
  margin-top: 10px;
}

.btn-static-info {
  color: var(--erpyar-muted);
  font-size: 12px;
  font-weight: 600;
  margin-top: 10px;
}
</style>
