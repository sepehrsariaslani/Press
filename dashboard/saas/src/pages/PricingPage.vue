<script setup>
const rows = [
  {
    plan: 'پایه',
    app: 'از ۹۹۰٬۰۰۰ تومان',
    infra: '۱ vCPU + ۲GB RAM',
    suitable: 'تیم های کوچک یا یک اپ',
  },
  {
    plan: 'رشد',
    app: 'از ۲٬۴۹۰٬۰۰۰ تومان',
    infra: '۲ vCPU + ۴GB RAM',
    suitable: 'چند اپ همزمان + API',
  },
  {
    plan: 'سازمانی',
    app: 'سفارشی',
    infra: '۴ vCPU به بالا + HA',
    suitable: 'کسب و کارهای پربازدید',
  },
];
</script>

<template>
  <section class="card">
    <h1 class="section-title">قیمت ها</h1>
    <p class="section-subtitle">
      مدل قیمت گذاری همان سه لایه ای است که گفتید: اشتراک اپ + هزینه زیرساخت + مصرف اضافه. پرداخت ماهانه یا سالانه.
    </p>

    <div class="grid-3" style="margin-top: 12px; margin-bottom: 12px">
      <article class="panel">
        <h3>۱) اشتراک اپ</h3>
        <p>برای هر اپ بر اساس ارزش محصول و سطح پشتیبانی.</p>
      </article>
      <article class="panel">
        <h3>۲) زیرساخت</h3>
        <p>CPU / RAM / Storage با امکان افزایش در لحظه.</p>
      </article>
      <article class="panel">
        <h3>۳) Overage</h3>
        <p>در صورت عبور از سهمیه، هزینه به صورت شفاف افزوده می شود.</p>
      </article>
    </div>

    <table class="comparison">
      <thead>
        <tr>
          <th>پلن</th>
          <th>هزینه اپ</th>
          <th>زیرساخت پایه</th>
          <th>مناسب برای</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.plan">
          <td>{{ row.plan }}</td>
          <td>{{ row.app }}</td>
          <td>{{ row.infra }}</td>
          <td>{{ row.suitable }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
