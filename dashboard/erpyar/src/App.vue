<script setup>
import { mainMenu } from './content';
</script>

<template>
  <div class="site-shell">
    <header class="site-header glass-card">
      <RouterLink class="brand" to="/">
        <span class="brand-mark">ای</span>
        <span>
          <strong>ارپ یار</strong>
          <small>راهکارهای Frappe و ERPNext</small>
        </span>
      </RouterLink>

      <nav class="site-nav" aria-label="منوی اصلی">
        <RouterLink v-for="item in mainMenu" :key="item.to" :to="item.to">{{ item.label }}</RouterLink>
      </nav>

      <div class="site-actions">
        <RouterLink class="btn btn-outline" to="/products">مشاهده محصولات</RouterLink>
        <RouterLink class="btn btn-primary" to="/demo">درخواست دمو</RouterLink>
      </div>
    </header>

    <main class="site-main">
      <RouterView />
    </main>

    <footer class="site-footer glass-card">
      <div>
        <strong>ارپ یار</strong>
        <p>
          بستری برای معرفی، فروش، استقرار و مدیریت اپلیکیشن های مبتنی بر Frappe در کنار زیرساخت Press.
        </p>
      </div>
      <div class="footer-links">
        <RouterLink to="/products">محصولات</RouterLink>
        <RouterLink to="/marketplace">مارکت پلیس</RouterLink>
        <RouterLink to="/docs">مستندات</RouterLink>
        <RouterLink to="/contact">تماس</RouterLink>
      </div>
    </footer>
  </div>
</template>
