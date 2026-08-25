<script setup>
import { pricingPlans } from '@/content';
</script>

<template>
  <section class="page-card">
    <h1 class="section-title">تعرفه ها</h1>
    <p>
      پلن ها در این فاز به صورت نمونه ارائه می شوند تا چارچوب تصمیم گیری اولیه برای تیم های متقاضی مشخص باشد.
      تعرفه نهایی پس از نیازسنجی و بررسی حجم عملیات اعلام می شود.
    </p>

    <div class="grid grid-3" style="margin-top: 12px">
      <article
        v-for="plan in pricingPlans"
        :key="plan.name"
        class="item"
        :class="{ 'plan-featured': plan.featured }"
      >
        <span v-if="plan.featured" class="badge">پیشنهاد ویژه</span>
        <h3>{{ plan.name }}</h3>
        <h4>{{ plan.price }}</h4>
        <small style="color: var(--erpyar-muted)">{{ plan.period }}</small>
        <ul class="list">
          <li v-for="feature in plan.items" :key="feature">{{ feature }}</li>
        </ul>
      </article>
    </div>
  </section>
</template>
