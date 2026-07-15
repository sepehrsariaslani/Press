<script setup>
import { ref, computed } from 'vue';
import JalaliDatePicker from '@/components/JalaliDatePicker.vue';
import { enDigitsToFa } from '@/utils/jalali';

const selectedDate = ref('1405-01-01');
const selectedHour = ref('10:00');
const selectedApp = ref('DEN CRM');

const summary = computed(() => {
  const [y, m, d] = selectedDate.value.split('-');
  return `${enDigitsToFa(y)}/${enDigitsToFa(m)}/${enDigitsToFa(d)} ساعت ${selectedHour.value}`;
});
</script>

<template>
  <section class="card">
    <h1 class="section-title">رزرو دمو</h1>
    <p class="section-subtitle">رزرو با تاریخ جلالی انجام می شود و دمو بعد از مدت تعیین شده به صورت خودکار منقضی خواهد شد.</p>

    <div class="grid-2" style="margin-top: 12px">
      <article class="panel">
        <div class="form-grid">
          <div class="field">
            <label>اپ موردنظر</label>
            <select v-model="selectedApp">
              <option>DEN CRM</option>
              <option>DEN Service Desk</option>
              <option>DEN Store</option>
            </select>
          </div>

          <div class="field">
            <label>ساعت</label>
            <select v-model="selectedHour">
              <option>10:00</option>
              <option>12:00</option>
              <option>15:00</option>
              <option>18:00</option>
            </select>
          </div>

          <JalaliDatePicker v-model="selectedDate" label="تاریخ دمو (جلالی)" />
        </div>
      </article>

      <article class="panel">
        <h3>پیش نمایش رزرو</h3>
        <p>اپ: {{ selectedApp }}</p>
        <p>زمان: {{ summary }}</p>
        <p>مدت دمو: ۷ روز</p>
        <p style="margin-top: 10px">
          بعد از پایان دمو، کاربر به صفحه ارتقا هدایت می شود و می تواند همان محیط را به پلن پولی تبدیل کند.
        </p>
      </article>
    </div>
  </section>
</template>
