<script setup>
import { reactive, ref, watch } from 'vue';
import { submitErpyarLead } from '@/api';

const DRAFT_KEY = 'erpyar_contact_draft';

const form = reactive({
  fullName: '',
  company: '',
  phone: '',
  email: '',
  message: '',
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
    form.phone = parsed.phone || '';
    form.email = parsed.email || '';
    form.message = parsed.message || '';
    form.website = parsed.website || '';
  } catch (error) {
    // Ignore malformed drafts and continue with empty form.
  }
}

watch(
  () => ({
    fullName: form.fullName,
    company: form.company,
    phone: form.phone,
    email: form.email,
    message: form.message,
    website: form.website,
  }),
  (value) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
  },
  { deep: true }
);

async function submitContact() {
  state.value = 'idle';
  notice.value = '';

  if (!form.fullName || !form.phone || !form.message) {
    state.value = 'error';
    notice.value = 'نام، شماره تماس و توضیح نیاز پروژه الزامی است.';
    return;
  }

  isSubmitting.value = true;

  try {
    await submitErpyarLead({
      lead_type: 'contact',
      full_name: form.fullName,
      company: form.company,
      phone: form.phone,
      email: form.email,
      message: form.message,
      source_path: '/contact',
      website: form.website,
    });

    state.value = 'success';
    notice.value = 'درخواست شما ثبت شد. تیم ارپ یار در اولین فرصت با شما تماس می گیرد.';

    form.fullName = '';
    form.company = '';
    form.phone = '';
    form.email = '';
    form.message = '';
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
    <h1 class="section-title">تماس با ارپ یار</h1>
    <p>
      اگر درباره استقرار، مهاجرت، سفارشی سازی یا پشتیبانی سوال دارید، فرم زیر را کامل کنید تا تیم ارپ یار
      درخواست شما را بررسی کند.
    </p>

    <form class="grid" style="margin-top: 12px" @submit.prevent="submitContact">
      <div class="form-grid">
        <div class="field">
          <label for="fullName">نام و نام خانوادگی *</label>
          <input id="fullName" v-model.trim="form.fullName" type="text" placeholder="مثال: علی رضایی" />
        </div>
        <div class="field">
          <label for="company">نام شرکت</label>
          <input id="company" v-model.trim="form.company" type="text" placeholder="مثال: شرکت نمونه" />
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
        <label for="message">توضیح نیاز پروژه *</label>
        <textarea
          id="message"
          v-model.trim="form.message"
          placeholder="در مورد نیازمندی ها، اندازه تیم و بازه زمانی موردنظر بنویسید."
        ></textarea>
      </div>

      <div v-if="notice" class="alert" :class="state === 'success' ? 'alert-success' : 'alert-error'">
        {{ notice }}
      </div>

      <div class="hero-actions">
        <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'در حال ارسال...' : 'ثبت درخواست تماس' }}
        </button>
        <RouterLink class="btn btn-outline" to="/demo">رفتن به فرم دمو</RouterLink>
      </div>
    </form>
  </section>
</template>
