<script setup>
import { formatJalali } from '@/utils/jalali';

const periodStart = formatJalali('2026-03-20');
const periodEnd = formatJalali('2026-04-19');
</script>

<template>
  <section class="card">
    <h1 class="section-title">صورتحساب</h1>
    <p class="section-subtitle">دوره جاری: {{ periodStart }} تا {{ periodEnd }}</p>

    <div class="grid-3" style="margin-top: 12px">
      <article class="panel">
        <h3>هزینه اپ</h3>
        <p>اشتراک هر اپ بر اساس پلن انتخابی.</p>
      </article>
      <article class="panel">
        <h3>هزینه زیرساخت</h3>
        <p>CPU / RAM / Storage بر مبنای مصرف واقعی.</p>
      </article>
      <article class="panel">
        <h3>تعدیل ها</h3>
        <p>تخفیف، مالیات و overage به صورت شفاف.</p>
      </article>
    </div>
  </section>
</template>
