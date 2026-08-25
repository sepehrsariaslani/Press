<script setup>
const apps = [
  { title: 'DEN CRM', min: '1 vCPU / 2GB', rec: '2 vCPU / 4GB', billing: 'ماهانه / سالانه' },
  { title: 'DEN Service Desk', min: '2 vCPU / 4GB', rec: '3 vCPU / 6GB', billing: 'ماهانه / سالانه' },
  { title: 'DEN Store', min: '2 vCPU / 4GB', rec: '4 vCPU / 8GB', billing: 'ماهانه / سالانه' },
  { title: 'DEN Analytics', min: '2 vCPU / 6GB', rec: '4 vCPU / 12GB', billing: 'سالانه پیشنهادی' },
];
</script>

<template>
  <section class="card">
    <h1 class="section-title">بازارچه اپ</h1>
    <p class="section-subtitle">اپ ها را خودتان از مسیر دلخواه وارد می کنید؛ اینجا فقط خروجی قابل فروش به مشتری نمایش داده می شود.</p>

    <div class="grid-2" style="margin-top: 12px">
      <article class="panel" v-for="app in apps" :key="app.title">
        <h3>{{ app.title }}</h3>
        <p>حداقل منابع: {{ app.min }}</p>
        <p>پیشنهاد پایدار: {{ app.rec }}</p>
        <p>مدل پرداخت: {{ app.billing }}</p>
      </article>
    </div>
  </section>
</template>
