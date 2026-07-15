<script setup>
const customerSegments = [
  { name: 'خرده فروشی و فروشگاه آنلاین', note: 'نیاز به کمپین سریع و مدیریت چند اپ همزمان' },
  { name: 'شرکت های خدماتی', note: 'تمرکز روی CRM، تیکتینگ و گزارش SLA' },
  { name: 'سازمان های متوسط و بزرگ', note: 'نیاز به امنیت، بکاپ و صورتحساب دقیق دوره ای' },
  { name: 'تیم های محصول', note: 'محیط دمو + مسیر تبدیل سریع به پرداختی' },
];
</script>

<template>
  <section class="card">
    <h1 class="section-title">مشتریان</h1>
    <p class="section-subtitle">این بخش برای نمایش مطالعه موردی، لوگو مشتری ها و نرخ موفقیت پیاده سازی آماده است.</p>

    <div class="grid-2" style="margin-top: 12px">
      <article class="panel" v-for="segment in customerSegments" :key="segment.name">
        <h3>{{ segment.name }}</h3>
        <p>{{ segment.note }}</p>
      </article>
    </div>
  </section>
</template>
