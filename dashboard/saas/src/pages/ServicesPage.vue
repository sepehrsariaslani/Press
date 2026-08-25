<script setup>
const services = [
  {
    title: 'راه اندازی اختصاصی اپ',
    text: 'برای هر مشتری بر اساس اپ های انتخابی سایت ساخته می شود و تنظیمات اولیه خودکار انجام می گیرد.',
  },
  {
    title: 'مانیتورینگ و وضعیت سرویس',
    text: 'وضعیت uptime، مصرف منابع و هشدارها داخل پنل قابل مشاهده است.',
  },
  {
    title: 'پشتیبان گیری و بازیابی',
    text: 'بر اساس پلن، بکاپ های زمان بندی شده و نقطه بازیابی ارائه می شود.',
  },
  {
    title: 'مشاوره ظرفیت',
    text: 'قبل از خرید و هنگام رشد، پیشنهاد ارتقای مناسب CPU/RAM به مشتری اعلام می شود.',
  },
  {
    title: 'صورتحساب شفاف',
    text: 'تمام جزئیات پرداخت در دو بخش اپلیکیشن و زیرساخت با تاریخ های جلالی نمایش داده می شود.',
  },
  {
    title: 'کنترل دسترسی تیمی',
    text: 'برای مشتری های سازمانی سطح دسترسی مدیر مالی، مدیر فنی و اپراتور قابل تعریف است.',
  },
];
</script>

<template>
  <section class="card">
    <h1 class="section-title">خدمات</h1>
    <p class="section-subtitle">مدلی که پیاده شده شبیه SaaS enterprise است: فروش اپ + مدیریت منابع + عملیات.</p>
    <div class="grid-3" style="margin-top: 12px">
      <article class="panel" v-for="item in services" :key="item.title">
        <h3>{{ item.title }}</h3>
        <p>{{ item.text }}</p>
      </article>
    </div>
  </section>
</template>
