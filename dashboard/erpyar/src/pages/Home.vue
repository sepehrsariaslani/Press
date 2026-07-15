<script setup>
import { homeSections } from '@/content';
</script>

<template>
  <section class="page-card hero">
    <h1>راهکارهای Frappe و ERPNext برای کسب وکارهای ایرانی</h1>
    <p>
      ارپ یار بستری برای معرفی، فروش، استقرار و مدیریت اپلیکیشن های مبتنی بر Frappe در کنار زیرساخت Press است.
      هدف ما ارائه تجربه ای قابل اعتماد، قابل توسعه و کاملا متناسب با نیازهای عملیاتی سازمان های ایرانی است.
    </p>
    <div class="hero-actions">
      <RouterLink class="btn btn-primary" to="/demo">درخواست دمو</RouterLink>
      <RouterLink class="btn btn-outline" to="/products">مشاهده محصولات</RouterLink>
    </div>
  </section>

  <section class="page-card">
    <h2 class="section-title">اعتماد و پایداری در عملیات</h2>
    <div class="grid grid-3" style="margin-top: 12px">
      <article v-for="stat in homeSections.trustStats" :key="stat.label" class="item">
        <span class="badge">{{ stat.label }}</span>
        <h3>{{ stat.value }}</h3>
        <p>{{ stat.description }}</p>
      </article>
    </div>
  </section>

  <section class="page-card">
    <h2 class="section-title">سبد راهکارها</h2>
    <div class="grid grid-2" style="margin-top: 12px">
      <article v-for="product in homeSections.products" :key="product.title" class="item">
        <h3>{{ product.title }}</h3>
        <p>{{ product.description }}</p>
        <RouterLink class="btn-link" :to="product.to">مشاهده بیشتر</RouterLink>
      </article>
    </div>
  </section>

  <section class="page-card">
    <h2 class="section-title">پیش نمایش مارکت پلیس</h2>
    <div class="grid grid-3" style="margin-top: 12px">
      <article v-for="app in homeSections.marketplace" :key="app.title" class="item">
        <span class="badge">آماده نصب روی Press</span>
        <h3>{{ app.title }}</h3>
        <small style="color: var(--erpyar-muted)">{{ app.category }}</small>
        <p>{{ app.description }}</p>
      </article>
    </div>
  </section>

  <section class="page-card">
    <h2 class="section-title">سوالات متداول</h2>
    <div class="grid" style="margin-top: 12px">
      <article v-for="faq in homeSections.faqs" :key="faq.q" class="item">
        <h4>{{ faq.q }}</h4>
        <p>{{ faq.a }}</p>
      </article>
    </div>
  </section>

  <section class="page-card hero">
    <h2 class="section-title">آماده شروع پروژه هستید؟</h2>
    <p>
      برای دریافت نقشه راه استقرار، جلسه کوتاه نیازسنجی رزرو کنید تا بر اساس اندازه تیم و اهداف کسب وکار،
      مسیر مناسب شما را پیشنهاد دهیم.
    </p>
    <div class="hero-actions">
      <RouterLink class="btn btn-primary" to="/demo">رزرو جلسه دمو</RouterLink>
      <RouterLink class="btn btn-outline" to="/contact">تماس با تیم ارپ یار</RouterLink>
    </div>
  </section>
</template>
