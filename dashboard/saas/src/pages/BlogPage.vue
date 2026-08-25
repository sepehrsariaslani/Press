<script setup>
import { formatJalali } from '@/utils/jalali';

const posts = [
  {
    title: 'چطور حداقل منابع هر اپ را درست تعریف کنیم؟',
    excerpt: 'راهنمای تعیین min و recommended برای جلوگیری از کندی سرویس در شروع کار.',
    date: formatJalali('2026-04-10'),
  },
  {
    title: 'مدل قیمت گذاری ماهانه/سالانه در SaaS خصوصی',
    excerpt: 'تجربه تفکیک هزینه اپ و زیرساخت برای کاهش چالش تیم مالی.',
    date: formatJalali('2026-03-22'),
  },
  {
    title: 'طراحی مسیر تبدیل دمو به مشتری پولی',
    excerpt: 'CTA، زمان بندی هشدار انقضا و جلوگیری از سوءاستفاده از Trial.',
    date: formatJalali('2026-02-14'),
  },
];
</script>

<template>
  <section class="card">
    <h1 class="section-title">بلاگ</h1>
    <p class="section-subtitle">محتوای آموزشی و تجاری برای جذب مشتری های باکیفیت.</p>

    <div class="grid-3" style="margin-top: 12px">
      <article class="panel" v-for="post in posts" :key="post.title">
        <h3>{{ post.title }}</h3>
        <p style="margin-bottom: 8px">{{ post.excerpt }}</p>
        <small style="color: var(--muted)">تاریخ انتشار: {{ post.date }}</small>
      </article>
    </div>
  </section>
</template>
