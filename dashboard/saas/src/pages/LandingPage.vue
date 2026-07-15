<script setup>
const offerings = [
  {
    title: 'بازارچه اپ اختصاصی',
    text: 'اپ های خودتان را از مسیر دلخواه اضافه می کنید، نسخه می دهید و بدون نمایش سورس به مشتری ارائه می کنید.',
  },
  {
    title: 'پیشنهاد هوشمند منابع',
    text: 'بعد از انتخاب اپ ها، سیستم حداقل و مقدار پیشنهادی RAM/CPU را محاسبه می کند تا خرید اشتباه اتفاق نیفتد.',
  },
  {
    title: 'صورت حساب دو بخشی',
    text: 'هزینه اپ و زیرساخت جدا می شود؛ مشتری دقیقا می بیند چه چیزی را برای چه زمانی پرداخت کرده است.',
  },
  {
    title: 'دموی زمان دار',
    text: 'برای هر اپ دموی محدود فعال می شود و پس از انقضا با یک مسیر شفاف به اشتراک پولی تبدیل خواهد شد.',
  },
];

const metrics = [
  { value: '۷ مسیر', label: 'قیف خرید و پرداخت' },
  { value: '۱۲ صفحه', label: 'ساختار کامل فرانت' },
  { value: '۱۰۰٪ فارسی', label: 'برچسب ها و ناوبری' },
  { value: 'تقویم جلالی', label: 'برای رزرو و دمو' },
];
</script>

<template>
  <section class="card hero">
    <p class="eyebrow">طراحی الهام گرفته از SmartX + مدل کسب و کار SaaS شما</p>
    <h1>مشتری می آید، اپ انتخاب می کند، منابع می گیرد و اشتراک ماهانه یا سالانه می خرد</h1>
    <p>
      این نسخه داخل Press پیاده شده تا همه چیز یکپارچه بماند: کاتالوگ اپ ها، قوانین افزایش منابع،
      دموهای محدود، و صورتحسابی که هم برای تیم مالی و هم برای مشتری خوانا باشد.
    </p>
    <div class="hero-actions">
      <RouterLink to="/apps" class="btn">مشاهده کاتالوگ اپ</RouterLink>
      <RouterLink to="/pricing" class="btn btn--ghost">بررسی قیمت ها</RouterLink>
      <RouterLink to="/reserve" class="btn btn--ghost">رزرو دموی سریع</RouterLink>
    </div>
  </section>

  <section class="card">
    <h2 class="section-title">چیزی که دقیقا برای پلن شما ساخته شده</h2>
    <p class="section-subtitle">ساختار صفحات و لینک ها به سبک سایت های B2B مدرن چیده شده، اما محتوا کاملا برای مدل SaaS شماست.</p>
    <div class="grid-4" style="margin-top: 12px">
      <article class="stat" v-for="item in metrics" :key="item.label">
        <strong>{{ item.value }}</strong>
        <span>{{ item.label }}</span>
      </article>
    </div>
  </section>

  <section class="card">
    <h2 class="section-title">ماژول های کلیدی</h2>
    <div class="grid-2" style="margin-top: 12px">
      <article class="panel" v-for="item in offerings" :key="item.title">
        <h3>{{ item.title }}</h3>
        <p>{{ item.text }}</p>
      </article>
    </div>
  </section>

  <section class="card">
    <h2 class="section-title">مسیر سریع مشتری</h2>
    <div class="timeline">
      <article class="timeline-item">
        <h4>۱) انتخاب اپ در بازارچه</h4>
        <p>کاربر اپ مورد نیازش را انتخاب می کند و حداقل منابع همان لحظه نمایش داده می شود.</p>
      </article>
      <article class="timeline-item">
        <h4>۲) دریافت پیشنهاد CPU / RAM</h4>
        <p>برای چند اپ همزمان، پیشنهاد تجمیعی داده می شود تا سرور کم نیاید.</p>
      </article>
      <article class="timeline-item">
        <h4>۳) پرداخت اشتراک + زیرساخت</h4>
        <p>ماهانه یا سالانه، با امکان افزایش منابع و گزارش شفاف هزینه ها.</p>
      </article>
      <article class="timeline-item">
        <h4>۴) ارتقا از دمو به پلن واقعی</h4>
        <p>پس از پایان دمو، تبدیل به پلن پولی با یک کلیک انجام می شود.</p>
      </article>
    </div>
  </section>
</template>
