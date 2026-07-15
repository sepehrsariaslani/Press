<script setup>
import { reactive, ref, watch } from 'vue';
import { submitErpyarLead } from '@/api';

const DRAFT_KEY = 'erpyar_demo_draft';

const form = reactive({
  fullName: '',
  company: '',
  teamSize: '',
  phone: '',
  email: '',
  product: 'ERPNext',
  description: '',
  website: '',
});

const state = ref('idle');
const notice = ref('');
const isSubmitting = ref(false);

const savedDraft = localStorage.getItem(DRAFT_KEY);
if (savedDraft) {
  try {
    const parsed = JSON.parse(savedDraft);
    form.fullName = parsed.fullName || '';
    form.company = parsed.company || '';
    form.teamSize = parsed.teamSize || '';
    form.phone = parsed.phone || '';
    form.email = parsed.email || '';
    form.product = parsed.product || 'ERPNext';
    form.description = parsed.description || '';
    form.website = parsed.website || '';
  } catch (error) {
    // Ignore malformed drafts and continue with empty form.
  }
}

watch(
  () => ({
    fullName: form.fullName,
    company: form.company,
    teamSize: form.teamSize,
    phone: form.phone,
    email: form.email,
    product: form.product,
    description: form.description,
    website: form.website,
  }),
  (value) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
  },
  { deep: true }
);

async function submitDemo() {
  state.value = 'idle';
  notice.value = '';

  if (!form.fullName || !form.phone || !form.product) {
    state.value = 'error';
    notice.value = 'نام، شماره تماس و محصول موردنظر الزامی است.';
    return;
  }

  isSubmitting.value = true;

  try {
    await submitErpyarLead({
      lead_type: 'demo',
      full_name: form.fullName,
      company: form.company,
      phone: form.phone,
      email: form.email,
      product_interest: form.product,
      company_size: form.teamSize,
      message: form.description,
      source_path: '/demo',
      website: form.website,
    });

    state.value = 'success';
    notice.value = 'درخواست دمو ثبت شد. زمان پیشنهادی جلسه برای شما ارسال خواهد شد.';

    form.fullName = '';
    form.company = '';
    form.teamSize = '';
    form.phone = '';
    form.email = '';
    form.product = 'ERPNext';
    form.description = '';
    form.website = '';
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    state.value = 'error';
    notice.value = error?.message || 'ارسال فرم انجام نشد. لطفا دوباره تلاش کنید.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <section class="page-card">
    <h1 class="section-title">درخواست دمو</h1>
    <p>
      برای هماهنگی جلسه دمو، اطلاعات زیر را ثبت کنید تا تیم ارپ یار مسیر مناسب استقرار و اجرای پروژه شما را
      پیشنهاد دهد.
    </p>

    <form class="grid" style="margin-top: 12px" @submit.prevent="submitDemo">
      <div class="form-grid">
        <div class="field">
          <label for="fullName">نام و نام خانوادگی *</label>
          <input id="fullName" v-model.trim="form.fullName" type="text" placeholder="مثال: سارا محمدی" />
        </div>
        <div class="field">
          <label for="company">نام شرکت</label>
          <input id="company" v-model.trim="form.company" type="text" placeholder="مثال: فناوران تجارت" />
        </div>
        <div class="field">
          <label for="teamSize">اندازه تیم</label>
          <input id="teamSize" v-model.trim="form.teamSize" type="text" placeholder="مثال: ۲۰ تا ۵۰ نفر" />
        </div>
        <div class="field">
          <label for="product">محصول موردنظر *</label>
          <select id="product" v-model="form.product">
            <option value="ERPNext">ERPNext</option>
            <option value="CRM">CRM</option>
            <option value="منابع انسانی">منابع انسانی</option>
            <option value="میزبانی روی Press">میزبانی روی Press</option>
          </select>
        </div>
        <div class="field">
          <label for="phone">شماره تماس *</label>
          <input id="phone" v-model.trim="form.phone" type="tel" dir="ltr" placeholder="0912xxxxxxx" />
        </div>
        <div class="field">
          <label for="email">ایمیل</label>
          <input id="email" v-model.trim="form.email" type="email" dir="ltr" placeholder="name@company.com" />
        </div>
      </div>

      <div class="field honeypot-field" aria-hidden="true">
        <label for="website">وبسایت</label>
        <input id="website" v-model.trim="form.website" type="text" tabindex="-1" autocomplete="off" />
      </div>

      <div class="field">
        <label for="description">شرح نیازمندی</label>
        <textarea
          id="description"
          v-model.trim="form.description"
          placeholder="ماژول های موردنیاز، محدودیت زمانی و یکپارچگی های لازم را بنویسید."
        ></textarea>
      </div>

      <div v-if="notice" class="alert" :class="state === 'success' ? 'alert-success' : 'alert-error'">
        {{ notice }}
      </div>

      <div class="hero-actions">
        <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'در حال ارسال...' : 'ثبت درخواست دمو' }}
        </button>
        <RouterLink class="btn btn-outline" to="/contact">تماس مستقیم با تیم</RouterLink>
      </div>
    </form>
  </section>
</template>
