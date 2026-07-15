<script setup>
import { productHighlights } from '@/content';
</script>

<template>
  <section class="page-card">
    <h1 class="section-title">میزبانی و استقرار روی Press</h1>
    <p>
      زیرساخت Press برای تیم هایی مناسب است که پایداری و سرعت انتشار برایشان حیاتی است. این خدمت از مرحله
      استقرار تا عملیات روزانه، با رویکرد کنترل شده و قابل مانیتورینگ ارائه می شود.
    </p>

    <div class="item" style="margin-top: 12px">
      <h3>قابلیت های کلیدی</h3>
      <ul class="list">
        <li v-for="item in productHighlights.hosting" :key="item">{{ item }}</li>
      </ul>
    </div>

    <div class="hero-actions" style="margin-top: 14px">
      <RouterLink class="btn btn-primary" to="/demo">درخواست جلسه فنی</RouterLink>
      <RouterLink class="btn btn-outline" to="/products">بازگشت به محصولات</RouterLink>
    </div>
  </section>
</template>
