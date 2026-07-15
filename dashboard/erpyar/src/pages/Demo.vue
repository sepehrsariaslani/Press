<script setup>
import { reactive, ref, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { submitErpyarLead } from '@/api';
import { baseProduct, publicAddons } from '@/content';

const route = useRoute();
const DRAFT_KEY = 'erpyar_demo_draft';

// Status tracking
const state = ref('idle');
const notice = ref('');
const isSubmitting = ref(false);

// Check if we have incoming query params from calculator (even if addons is empty)
const hasQuery = computed(() => {
  return route.query.addons !== undefined;
});

// Deterministic addons selection derived from route query
const selectedAddons = computed(() => {
  if (!hasQuery.value) return [];
  const queryVal = route.query.addons;
  if (!queryVal) return []; // base-only has route.query.addons as empty string ""
  return queryVal.toString().split(',').map(s => s.trim()).filter(Boolean);
});

// Compute localized addon names
const selectedAddonNames = computed(() => {
  return selectedAddons.value.map(id => {
    const addon = publicAddons.find(a => a.id === id);
    return addon ? addon.name : id;
  });
});

// Calculate current package summary and description deterministically
const calculatedSummary = computed(() => {
  if (selectedAddons.value.length === 0) {
    return baseProduct.name;
  }
  return `${baseProduct.name} + ${selectedAddonNames.value.join(' + ')}`;
});

const calculatedDescription = computed(() => {
  if (selectedAddons.value.length === 0) {
    return `درخواست تست رایگان ۱۴ روزه پلتفرم پایه ارپ‌یار.`;
  }
  return `درخواست تست رایگان ۱۴ روزه پلتفرم پایه ارپ‌یار به همراه افزونه‌های: ${selectedAddonNames.value.join('، ')}.`;
});

// Handle localStorage drafts
const savedDraft = localStorage.getItem(DRAFT_KEY);
let draftData = {};
if (savedDraft) {
  try {
    draftData = JSON.parse(savedDraft) || {};
  } catch (error) {
    // Ignore malformed drafts
  }
}

// Initialize form reactively.
// Stale localStorage drafts CANNOT override incoming query selections.
const form = reactive({
  fullName: draftData.fullName || '',
  company: draftData.company || '',
  teamSize: draftData.teamSize || '',
  phone: draftData.phone || '',
  email: draftData.email || '',
  product: hasQuery.value ? calculatedSummary.value : (draftData.product && draftData.product !== 'ERPNext' ? draftData.product : 'پلتفرم پایه ارپ‌یار'),
  description: hasQuery.value ? calculatedDescription.value : (draftData.description || ''),
  website: draftData.website || '',
});

// Watch query parameters reactively in case of back-and-forth transitions
watch(
  () => route.query.addons,
  (newVal) => {
    if (newVal !== undefined) {
      form.product = calculatedSummary.value;
      form.description = calculatedDescription.value;
    }
  }
);

// Watch for form changes to save draft
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

// Calculate total monthly price for display
const totalPrice = computed(() => {
  const addonsCost = publicAddons
    .filter(addon => selectedAddons.value.includes(addon.id))
    .reduce((sum, addon) => sum + addon.price, 0);
  return baseProduct.price + addonsCost;
});

const formatPrice = (value) => {
  return value.toLocaleString('fa-IR') + ' تومان';
};

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
    // Lead data matches the current selected package exactly
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
    notice.value = 'سفارش سایت آزمایشی شما ثبت شد. تیم پشتیبانی ارپ‌یار طی چند ساعت آینده برای راه‌اندازی نهایی و ارائه دسترسی با شما تماس خواهند گرفت.';

    form.fullName = '';
    form.company = '';
    form.teamSize = '';
    form.phone = '';
    form.email = '';
    form.product = hasQuery.value ? calculatedSummary.value : 'پلتفرم پایه ارپ‌یار';
    form.description = hasQuery.value ? calculatedDescription.value : '';
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
  <div class="demo-page-layout">
    <section class="page-card demo-form-section">
      <h1 class="section-title">راه‌اندازی سایت آزمایشی و درخواست دمو</h1>
      <p>
        برای فعال‌سازی دوره تست رایگان ۱۴ روزه یا هماهنگی جلسه دمو، اطلاعات زیر را وارد کنید. تیم ارپ‌یار در کوتاه‌ترین زمان ممکن فرآیند را برای شما نهایی خواهد کرد.
      </p>

      <form class="grid" style="margin-top: 20px" @submit.prevent="submitDemo">
        <div class="form-grid">
          <div class="field">
            <label for="fullName">نام و نام خانوادگی *</label>
            <input id="fullName" v-model.trim="form.fullName" type="text" placeholder="مثال: سارا محمدی" required />
          </div>
          <div class="field">
            <label for="company">نام شرکت یا سازمان</label>
            <input id="company" v-model.trim="form.company" type="text" placeholder="مثال: فناوران تجارت" />
          </div>
          <div class="field">
            <label for="teamSize">اندازه تیم / پرسنل</label>
            <input id="teamSize" v-model.trim="form.teamSize" type="text" placeholder="مثال: ۲۰ تا ۵۰ نفر" />
          </div>
          <div class="field">
            <label for="product">محصول و افزونه‌های موردنظر *</label>
            <input v-if="hasQuery" id="product" v-model.trim="form.product" type="text" readonly class="read-only-input" required />
            <select v-else id="product" v-model="form.product" class="select-product-input" required>
              <option value="پلتفرم پایه ارپ‌یار">پلتفرم پایه ارپ‌یار (شروع تست ۱۴ روزه)</option>
              <option value="پلتفرم پایه + ERPNext">پلتفرم پایه + ERPNext</option>
              <option value="پلتفرم پایه + CRM">پلتفرم پایه + CRM</option>
              <option value="پلتفرم پایه + رستوران">پلتفرم پایه + رستوران (Restaurant)</option>
              <option value="پلتفرم پایه + کافی‌یار">پلتفرم پایه + کافی‌یار (Coffeeyar)</option>
              <option value="مشاوره عمومی و دمو">فقط مشاوره عمومی و دمو</option>
            </select>
          </div>
          <div class="field">
            <label for="phone">شماره تماس (ترجیحاً دارای واتساپ/تلگرام) *</label>
            <input id="phone" v-model.trim="form.phone" type="tel" dir="ltr" placeholder="0912xxxxxxx" required />
          </div>
          <div class="field">
            <label for="email">ایمیل سازمانی</label>
            <input id="email" v-model.trim="form.email" type="email" dir="ltr" placeholder="name@company.com" />
          </div>
        </div>

        <div class="field honeypot-field" aria-hidden="true">
          <label for="website">وبسایت</label>
          <input id="website" v-model.trim="form.website" type="text" tabindex="-1" autocomplete="off" />
        </div>

        <div class="field">
          <label for="description">توضیحات یا نیازمندی‌های خاص</label>
          <textarea
            id="description"
            v-model.trim="form.description"
            placeholder="محدودیت‌های زمانی، فرآیندهای حیاتی و هر توضیحی که به راه‌اندازی بهتر سایت آزمایشی شما کمک می‌کند بنویسید."
          ></textarea>
        </div>

        <div v-if="notice" class="alert" :class="state === 'success' ? 'alert-success' : 'alert-error'">
          {{ notice }}
        </div>

        <div class="hero-actions">
          <button class="btn btn-primary" type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'در حال ارسال...' : 'تایید و ارسال درخواست' }}
          </button>
          <RouterLink class="btn btn-outline" to="/">بازگشت به صفحه اصلی</RouterLink>
        </div>
      </form>
    </section>

    <!-- Sidebar / Receipt view if calculator query parameter is active -->
    <aside v-if="hasQuery" class="demo-receipt-sidebar">
      <div class="receipt-card glass-card">
        <h3 class="receipt-title">مشخصات پکیج انتخابی شما</h3>
        
        <div class="receipt-items">
          <div class="receipt-row">
            <span class="item-name">{{ baseProduct.name }}</span>
            <span class="item-value">{{ formatPrice(baseProduct.price) }}</span>
          </div>
          
          <div v-if="selectedAddons.length > 0" class="receipt-addons-divider">افزونه‌های انتخابی</div>
          
          <div v-for="addonId in selectedAddons" :key="addonId" class="receipt-row addon-row">
            <span class="item-name">
              <span class="plus">+</span> {{ publicAddons.find(a => a.id === addonId)?.name || addonId }}
            </span>
            <span class="item-value">
              {{ formatPrice(publicAddons.find(a => a.id === addonId)?.price || 0) }}
            </span>
          </div>
        </div>

        <div class="receipt-total-block">
          <div class="receipt-row total-row">
            <span class="total-label">اشتراک ماهانه پس از اتمام تست</span>
            <span class="total-amount">{{ formatPrice(totalPrice) }}</span>
          </div>
        </div>

        <div class="trial-explainer">
          <div class="explainer-item">
            <span class="explainer-bullet">✓</span>
            <p><strong>۱۴ روز دوره تست رایگان:</strong> از لحظه راه‌اندازی سایت تا دو هفته دسترسی کامل بدون هزینه خواهید داشت.</p>
          </div>
          <div class="explainer-item">
            <span class="explainer-bullet">✓</span>
            <p><strong>آدرس اختصاصی:</strong> سایت شما روی زیردامنه <code>your-slug.erpyar.ir</code> ساخته می‌شود.</p>
          </div>
          <div class="explainer-item">
            <span class="explainer-bullet">✓</span>
            <p><strong>قانون تعلیق و تنفس:</strong> پس از اتمام دوره تست، در صورت عدم تمدید سایت تعلیق شده و ۷ روز مهلت پرداخت خواهید داشت.</p>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.demo-page-layout {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 980px) {
  .demo-page-layout {
    grid-template-columns: 1fr;
  }
}

.demo-form-section {
  background: #ffffff;
}

.read-only-input {
  background: #f1f5f9;
  cursor: not-allowed;
  font-weight: 700;
  color: var(--erpyar-primary-dark);
  border-color: rgba(18, 184, 134, 0.3);
}

.select-product-input {
  cursor: pointer;
  font-weight: 600;
}

/* Receipt styles */
.demo-receipt-sidebar {
  position: sticky;
  top: 90px;
}

.receipt-card {
  padding: 24px;
  border-radius: var(--erpyar-radius-lg);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.receipt-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  padding-bottom: 12px;
  border-bottom: 2px dashed var(--erpyar-border);
  color: var(--erpyar-text);
  text-align: center;
}

.receipt-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.receipt-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--erpyar-text);
}

.receipt-row .item-name {
  font-weight: 600;
}

.receipt-row .item-value {
  font-weight: 700;
}

.receipt-addons-divider {
  font-size: 11px;
  font-weight: 700;
  color: var(--erpyar-muted);
  margin-top: 8px;
  margin-bottom: 2px;
  text-transform: uppercase;
}

.addon-row {
  font-size: 12.5px;
  color: var(--erpyar-muted);
}

.addon-row .plus {
  color: var(--erpyar-secondary);
  font-weight: 800;
  margin-left: 2px;
}

.receipt-total-block {
  padding-top: 12px;
  border-top: 1px solid var(--erpyar-border);
}

.total-row {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--erpyar-text);
}

.total-row .total-amount {
  font-size: 16px;
  font-weight: 900;
  color: var(--erpyar-primary-dark);
}

.trial-explainer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--erpyar-border);
}

.explainer-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.explainer-bullet {
  color: var(--erpyar-primary-dark);
  font-weight: 900;
  font-size: 14px;
}

.explainer-item p {
  margin: 0;
  font-size: 11.5px;
  color: var(--erpyar-muted);
  line-height: 1.6;
}

.explainer-item code {
  font-family: monospace;
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 4px;
}
</style>
