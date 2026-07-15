<script setup>
import { formatJalali } from '@/utils/jalali';

const today = formatJalali(new Date());
</script>

<template>
  <section class="card">
    <h1 class="section-title">مدیریت دمو و Trial</h1>
    <p class="section-subtitle">امروز: {{ today }}</p>

    <div class="grid-3" style="margin-top: 12px">
      <article class="panel">
        <h3>قانون مدت</h3>
        <p>برای هر اپ می توانید دمو ۳، ۷ یا ۱۴ روزه تعیین کنید.</p>
      </article>
      <article class="panel">
        <h3>کنترل سوءاستفاده</h3>
        <p>هر تیم/شماره/شناسه پرداخت فقط یک دمو می گیرد.</p>
      </article>
      <article class="panel">
        <h3>تبدیل خودکار</h3>
        <p>پایان دمو به صفحه انتخاب پلن و پرداخت هدایت می شود.</p>
      </article>
    </div>
  </section>
</template>
