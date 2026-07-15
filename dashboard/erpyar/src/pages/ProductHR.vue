<script setup>
import { productHighlights } from '@/content';
</script>

<template>
  <section class="page-card">
    <h1 class="section-title">منابع انسانی</h1>
    <p>
      راهکار منابع انسانی ارپ یار به شما کمک می کند فرآیندهای پرسنلی را ساده، شفاف و قابل پیگیری کنید؛
      از درخواست های روزمره تا ارزیابی عملکرد و توسعه سرمایه انسانی.
    </p>

    <div class="item" style="margin-top: 12px">
      <h3>قابلیت های کلیدی</h3>
      <ul class="list">
        <li v-for="item in productHighlights.hr" :key="item">{{ item }}</li>
      </ul>
    </div>

    <div class="hero-actions" style="margin-top: 14px">
      <RouterLink class="btn btn-primary" to="/demo">درخواست دمو منابع انسانی</RouterLink>
      <RouterLink class="btn btn-outline" to="/products">بازگشت به محصولات</RouterLink>
    </div>
  </section>
</template>
