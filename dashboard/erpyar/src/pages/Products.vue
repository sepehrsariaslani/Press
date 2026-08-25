<script setup>
import { homeSections } from '@/content';
</script>

<template>
  <section class="page-card">
    <h1 class="section-title">محصولات ارپ یار</h1>
    <p>
      راهکارهای ارپ یار برای تیم هایی طراحی شده که به دنبال یک هسته یکپارچه، فرآیندهای قابل اندازه گیری و
      زیرساخت پایدار برای رشد هستند.
    </p>

    <div class="grid grid-2" style="margin-top: 12px">
      <RouterLink v-for="product in homeSections.products" :key="product.title" :to="product.to" class="item">
        <h3>{{ product.title }}</h3>
        <p>{{ product.description }}</p>
        <span class="btn-link">بررسی جزئیات</span>
      </RouterLink>
    </div>
  </section>
</template>
