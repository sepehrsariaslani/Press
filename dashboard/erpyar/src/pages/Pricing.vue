<script setup>
import { pricingPlans } from '@/content';
</script>

<template>
  <section class="page-card">
    <h1 class="section-title">تعرفه‌ها و ماژول‌های ابری ارپ‌یار</h1>
    <p>
      شما همواره با تهیه پلتفرم پایه ارپ‌یار شروع می‌کنید و بر اساس نیاز کسب‌وکار خود، هر یک از افزونه‌های تخصصی را به صورت ماهانه به اشتراک خود اضافه یا حذف می‌نمایید. هزینه نهایی شفاف بوده و مستقیماً متناسب با ماژول‌های انتخابی شماست.
    </p>

    <div class="grid grid-3" style="margin-top: 20px">
      <article
        v-for="plan in pricingPlans"
        :key="plan.name"
        class="item"
        :class="{ 'plan-featured': plan.featured }"
      >
        <span v-if="plan.featured" class="badge">پیشنهاد ویژه (الزامی)</span>
        <span v-else class="badge">افزونه اختیاری</span>
        <h3>{{ plan.name }}</h3>
        <h4 style="margin-top: 6px; font-size: 18px; color: var(--erpyar-primary-dark)">{{ plan.price }}</h4>
        <small style="color: var(--erpyar-muted)">{{ plan.period }}</small>
        <ul class="list" style="margin-top: 10px;">
          <li v-for="feature in plan.items" :key="feature" style="font-size: 12.5px;">{{ feature }}</li>
        </ul>
      </article>
    </div>

    <!-- Final Interactive Link Call To Action -->
    <div class="page-card text-center" style="margin-top: 24px; background: #f8fafc; border-color: var(--erpyar-border);">
      <h3 style="margin: 0; font-size: 18px;">می‌خواهید قیمت نهایی را برآورد کنید؟</h3>
      <p style="font-size: 14px; margin: 8px 0 16px;">با استفاده از ماشین‌حساب پویای صفحه اصلی، ترکیب افزونه‌های دلخواه خود را بسازید و دوره تست ۱۴ روزه خود را آغاز کنید.</p>
      <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        <RouterLink class="btn btn-primary" to="/">ورود به ماشین‌حساب قیمت در صفحه اصلی</RouterLink>
        <RouterLink class="btn btn-outline" to="/demo">ثبت سفارش تست رایگان (۱۴ روزه)</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.text-center {
  text-align: center;
}
</style>
