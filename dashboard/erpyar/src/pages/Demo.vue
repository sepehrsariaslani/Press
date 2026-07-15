<script setup>
import { reactive, ref, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { submitErpyarLead, provisionTrialSite } from '@/api';
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
  if (!queryVal) return [];
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
  slug: draftData.slug || '',
  product: hasQuery.value ? calculatedSummary.value : (draftData.product && draftData.product !== 'ERPNext' ? draftData.product : 'پلتفرم پایه ارپ‌یار'),
  description: hasQuery.value ? calculatedDescription.value : (draftData.description || ''),
  website: draftData.website || '',
});

// Clean slug: lowercase, replace anything that is not alphanumeric or hyphen
const cleanSlug = () => {
  form.slug = (form.slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, ''); // no leading/trailing hyphens
};

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
    slug: form.slug,
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

  if (!form.slug) {
    state.value = 'error';
    notice.value = 'انتخاب آدرس اختصاصی (Slug) الزامی است.';
    return;
  }

  isSubmitting.value = true;

  try {
    // 1. Submit Lead Capture (secondary background flow)
    await submitErpyarLead({
      lead_type: 'demo',
      full_name: form.fullName,
      company: form.company,
      phone: form.phone,
      email: form.email,
      product_interest: form.product,
      company_size: form.teamSize,
      message: `${form.description || ''} (آدرس درخواستی: ${form.slug}.erpyar.ir)`.trim(),
      source_path: '/demo',
      website: form.website,
    }).catch(() => {
      // Ignore background lead capture errors to keep provisioning primary path intact
    });

    // 2. Map current selected public addons to parameter string
    const addonsParam = selectedAddons.value.join(',');

    // 3. Initiate site self-serve trial provisioning (primary successful path)
    const response = await provisionTrialSite({
      slug: form.slug,
      email: form.email || `${form.slug}@erpyar.ir`,
      addons: addonsParam
    });

    state.value = 'success';
    notice.value = `سایت اختصاصی شما با موفقیت رزرو شد! آدرس اختصاصی شما: ${response.site_name} است. دوره تست رایگان ۱۴ روزه شما آغاز گردید. (تاریخ انقضای تست: ${response.trial_end_date})`;

    // Reset Form
    form.fullName = '';
    form.company = '';
    form.teamSize = '';
    form.phone = '';
    form.email = '';
    form.slug = '';
    form.product = hasQuery.value ? calculatedSummary.value : 'پلتفرم پایه ارپ‌یار';
    form.description = hasQuery.value ? calculatedDescription.value : '';
    form.website = '';
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    state.value = 'error';
    notice.value = error?.message || 'ثبت‌نام و ایجاد سایت آزمایشی با خطا مواجه شد. لطفا دوباره تلاش کنید.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="demo-page-layout">
    <section class="page-card demo-form-section">
      <h1 class="section-title">راه‌اندازی سایت آزمایشی اختصاصی</h1>
      <p>
        آدرس انگلیسی مورد علاقه خود را انتخاب کنید تا سایت اختصاصی شما بر روی دامنه <strong>erpyar.ir</strong> فوراً رزرو و راه‌اندازی آزمایشی شود.
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
          
          <!-- Slug Subdomain Input Flow (reserve slug.erpyar.ir) -->
          <div class="field col-span-2">
            <label for="slug">آدرس اینترنتی اختصاصی شما *</label>
            <div class="slug-input-container">
              <input 
                id="slug" 
                v-model.trim="form.slug" 
                type="text" 
                placeholder="my-company" 
                dir="ltr" 
                required 
                @input="cleanSlug"
              />
              <span class="slug-domain-suffix">.erpyar.ir</span>
            </div>
            <small class="field-help">آدرس سایت آزمایشی شما به این صورت خواهد بود: <strong>{{ form.slug ? form.slug : 'my-company' }}.erpyar.ir</strong> (فقط حروف انگلیسی کوچک، اعداد و خط تیره مجاز است).</small>
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
            {{ isSubmitting ? 'در حال راه‌اندازی...' : 'تایید و راه‌اندازی سایت آزمایشی' }}
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

.col-span-2 {
  grid-column: span 2 / span 2;
}

@media (max-width: 980px) {
  .col-span-2 {
    grid-column: span 1 / span 1;
  }
}

/* Slug subdomain input */
.slug-input-container {
  display: flex;
  align-items: center;
  border: 1px solid var(--erpyar-border);
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
  min-height: 44px;
}

.slug-input-container input {
  border: none !important;
  border-radius: 0 !important;
  flex: 1;
  padding: 10px 12px;
  font-weight: 700;
  color: var(--erpyar-text);
  font-family: monospace;
}

.slug-domain-suffix {
  padding: 10px 14px;
  background: #f1f5f9;
  border-right: 1px solid var(--erpyar-border);
  color: var(--erpyar-muted);
  font-family: monospace;
  font-weight: 700;
  user-select: none;
}

.field-help {
  font-size: 11.5px;
  color: var(--erpyar-muted);
  margin-top: 2px;
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
