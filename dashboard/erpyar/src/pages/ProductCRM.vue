<script setup>
import { productHighlights } from '@/content';
</script>

<template>
  <section class="page-card">
    <h1 class="section-title">CRM</h1>
    <p>
      CRM ارپ یار برای تیم هایی ساخته شده که می خواهند تعامل با مشتری را از حد یادداشت های پراکنده خارج کنند
      و یک تصویر دقیق از وضعیت فروش و خدمات داشته باشند.
    </p>

    <div class="item" style="margin-top: 12px">
      <h3>قابلیت های کلیدی</h3>
      <ul class="list">
        <li v-for="item in productHighlights.crm" :key="item">{{ item }}</li>
      </ul>
    </div>

    <div class="hero-actions" style="margin-top: 14px">
      <RouterLink class="btn btn-primary" to="/demo">درخواست دمو CRM</RouterLink>
      <RouterLink class="btn btn-outline" to="/products">بازگشت به محصولات</RouterLink>
    </div>
  </section>
</template>
