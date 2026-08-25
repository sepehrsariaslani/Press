<script setup>
import { homeSections } from '@/content';
</script>

<template>
  <section class="page-card">
    <h1 class="section-title">مارکت پلیس Erpyar</h1>
    <p>
      این بخش برای نمایش افزونه های سازگار با Press طراحی شده تا شرکت ها بتوانند قابلیت های موردنیاز خود را
      سریع تر به سرویس های عملیاتی اضافه کنند.
    </p>

    <div class="grid grid-3" style="margin-top: 12px">
      <article v-for="app in homeSections.marketplace" :key="app.title" class="item">
        <span class="badge">آماده نصب روی Press</span>
        <h3>{{ app.title }}</h3>
        <small style="color: var(--erpyar-muted)">{{ app.category }}</small>
        <p>{{ app.description }}</p>
      </article>
    </div>
  </section>
</template>
