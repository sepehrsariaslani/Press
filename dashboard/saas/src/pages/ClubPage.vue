<script setup>
const benefits = [
  'امتیاز وفاداری بر اساس مدت اشتراک و حجم خرید',
  'کوپن تمدید سالانه برای مشتری های خوش حساب',
  'سطح بندی نقره ای / طلایی / پلاتینیوم برای خدمات ویژه',
  'دسترسی زودتر به اپ های جدید و نسخه های بتا',
];
</script>

<template>
  <section class="card">
    <h1 class="section-title">باشگاه مشتریان</h1>
    <p class="section-subtitle">
      می توانید دقیقا مثل سرویس های حرفه ای، مکانیزم حفظ مشتری را فعال کنید تا نرخ تمدید ماهانه و سالانه بالا برود.
    </p>

    <div class="grid-2" style="margin-top: 12px">
      <article class="panel">
        <h3>مزیت ها</h3>
        <ul>
          <li v-for="item in benefits" :key="item">{{ item }}</li>
        </ul>
      </article>

      <article class="panel">
        <h3>سناریوی پیشنهادی</h3>
        <p>
          مشتری پس از ۳ ماه استفاده فعال، اعتبار هدیه می گیرد؛ پس از ۶ ماه، تخفیف تمدید سالانه دریافت می کند.
          این اعتبار می تواند برای خرید اپ جدید یا افزایش منابع استفاده شود.
        </p>
      </article>
    </div>
  </section>
</template>
