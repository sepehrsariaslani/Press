<script setup>
import { productHighlights } from '@/content';
</script>

<template>
  <section class="page-card">
    <h1 class="section-title">ERPNext</h1>
    <p>
      ERPNext هسته عملیاتی سازمان شما را یکپارچه می کند؛ از مالی و فروش تا خرید، انبار و پروژه.
      با این راهکار، داده های پراکنده به جریان تصمیم سازی تبدیل می شوند.
    </p>

    <div class="item" style="margin-top: 12px">
      <h3>قابلیت های کلیدی</h3>
      <ul class="list">
        <li v-for="item in productHighlights.erpnext" :key="item">{{ item }}</li>
      </ul>
    </div>

    <div class="hero-actions" style="margin-top: 14px">
      <RouterLink class="btn btn-primary" to="/demo">درخواست دمو ERPNext</RouterLink>
      <RouterLink class="btn btn-outline" to="/products">بازگشت به محصولات</RouterLink>
    </div>
  </section>
</template>
