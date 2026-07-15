<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchErpyarCatalog } from '@/api';
import { baseProduct as staticBaseProduct, publicAddons as staticPublicAddons, homeSections } from '@/content';

const router = useRouter();

// Reactive catalog variables initialized with static fallbacks
const baseProduct = ref(staticBaseProduct);
const publicAddons = ref(staticPublicAddons);

// State for pricing calculator
// Default pre-select 'erpnext' to show interactive calculations right away
const selectedAddons = ref(['erpnext']);

// Fetch catalog dynamically on mount
onMounted(async () => {
  try {
    const apiCatalog = await fetchErpyarCatalog();
    if (apiCatalog && apiCatalog.length > 0) {
      // Extract Base Platform
      const baseItem = apiCatalog.find(p => p.product_id === 'base' || !p.is_addon);
      if (baseItem) {
        baseProduct.value = {
          id: baseItem.product_id,
          name: baseItem.product_name,
          price: baseItem.price,
          priceFormatted: baseItem.price.toLocaleString('fa-IR'),
          period: baseItem.period,
          description: baseItem.description,
          features: baseItem.features || []
        };
      }
      
      // Extract Add-ons
      const addonsList = apiCatalog.filter(p => p.product_id !== 'base' && p.is_addon);
      if (addonsList.length > 0) {
        publicAddons.value = addonsList.map(item => ({
          id: item.product_id,
          name: item.product_name,
          price: item.price,
          priceFormatted: item.price.toLocaleString('fa-IR'),
          description: item.description,
          to: item.product_id === 'erpnext' || item.product_id === 'crm' ? `/products/${item.product_id}` : null,
          features: item.features || []
        }));
      }
    }
  } catch (error) {
    console.warn('Unable to load dynamic catalog, falling back to local storage:', error);
  }
});

// Calculate total monthly price
const totalPrice = computed(() => {
  const addonsCost = publicAddons.value
    .filter(addon => selectedAddons.value.includes(addon.id))
    .reduce((sum, addon) => sum + addon.price, 0);
  return baseProduct.value.price + addonsCost;
});

const isSelected = (id) => selectedAddons.value.includes(id);

const toggleAddon = (id) => {
  const index = selectedAddons.value.indexOf(id);
  if (index > -1) {
    selectedAddons.value.splice(index, 1);
  } else {
    selectedAddons.value.push(id);
  }
};

const formatPrice = (value) => {
  return value.toLocaleString('fa-IR') + ' تومان';
};

// Route to /demo carrying selected addons as query parameter
const startTrialWithSelection = () => {
  const queryAddons = selectedAddons.value.join(',');
  router.push({
    path: '/demo',
    query: { addons: queryAddons }
  });
};

const scrollToCalculator = () => {
  const el = document.getElementById('calculator');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
};
</script>

<template>
  <!-- Hero Section -->
  <section class="hero-section page-card">
    <div class="hero-content">
      <span class="badge-premium">ارپ‌یار ابری (Erpyar Cloud)</span>
      <h1 class="hero-title">
        راه‌اندازی فوری نرم‌افزارهای سازمانی بر پایه پلتفرم پیشرفته <span class="highlight">ارپ‌یار</span>
      </h1>
      <p class="hero-subtitle">
        سیستم‌های مالی، زنجیره تامین، مشتریان و صندوق‌های اختصاصی خود را روی بستر ابری مطمئن و با دامنه اختصاصی خود مستقر کنید. شروع سریع با ۱۴ روز دوره تست کاملاً رایگان، بدون نیاز به کارت بانکی یا هزینه‌های راه‌اندازی اولیه.
      </p>
      <div class="hero-actions">
        <button class="btn btn-primary btn-lg" @click="scrollToCalculator">
          <span>راه‌اندازی سایت آزمایشی (۱۴ روز رایگان)</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon-arrow"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <RouterLink class="btn btn-outline btn-lg" to="/demo">درخواست دمو و مشاوره</RouterLink>
      </div>
    </div>
    
    <div class="hero-visual">
      <!-- Premium CSS-only Browser Mockup showing slug.erpyar.ir creation -->
      <div class="browser-mockup">
        <div class="browser-header">
          <div class="browser-buttons">
            <span class="dot dot-red"></span>
            <span class="dot dot-yellow"></span>
            <span class="dot dot-green"></span>
          </div>
          <div class="browser-address">
            <span class="lock-icon">🔒</span>
            <span class="address-text">your-company.erpyar.ir</span>
          </div>
        </div>
        <div class="browser-body">
          <div class="mock-sidebar">
            <div class="mock-logo">E</div>
            <div class="mock-nav-item active"></div>
            <div class="mock-nav-item"></div>
            <div class="mock-nav-item"></div>
          </div>
          <div class="mock-main">
            <div class="mock-stat-row">
              <div class="mock-card h-8"></div>
              <div class="mock-card h-8"></div>
              <div class="mock-card h-8"></div>
            </div>
            <div class="mock-chart-card">
              <div class="mock-chart-line"></div>
              <div class="mock-chart-bars">
                <div class="bar bar-1"></div>
                <div class="bar bar-2"></div>
                <div class="bar bar-3"></div>
              </div>
            </div>
            <div class="mock-status">
              <span class="status-indicator"></span>
              <span class="status-text">سایت آزمایشی شما آماده به کار است</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Value Propositions / Trust Stats -->
  <section class="page-card trust-section">
    <div class="section-header text-center">
      <span class="badge">چرا ارپ‌یار؟</span>
      <h2 class="section-title">زیرساختی مطمئن و اختصاصی برای رشد مداوم کسب‌وکار</h2>
    </div>
    <div class="grid grid-3" style="margin-top: 24px">
      <article v-for="stat in homeSections.trustStats" :key="stat.label" class="trust-card">
        <div class="trust-badge-val">{{ stat.value }}</div>
        <h3>{{ stat.label }}</h3>
        <p>{{ stat.description }}</p>
      </article>
    </div>
  </section>

  <!-- Interactive Pricing Calculator Section -->
  <section id="calculator" class="page-card calculator-section">
    <div class="section-header text-center">
      <span class="badge">قیمت‌گذاری شفاف و پویا</span>
      <h2 class="section-title">برآورد هزینه و سفارش پلتفرم اختصاصی</h2>
      <p class="section-subtitle">
        نرم‌افزار سازمانی خود را با فرمول عادلانه اسمبل کنید. همواره با پلتفرم پایه شروع کنید و به دلخواه ماژول‌های مورد نیاز خود را به آن اضافه یا حذف کنید.
      </p>
    </div>

    <div class="calculator-container" style="margin-top: 30px">
      <div class="calculator-options">
        
        <!-- Base Platform Card (Always Active) -->
        <div class="base-product-card-interactive active">
          <div class="selection-indicator">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <div class="card-body">
            <div class="card-meta">
              <span class="badge-required">پلتفرم الزامی</span>
              <span class="addon-price">{{ formatPrice(baseProduct.price) }} / ماه</span>
            </div>
            <h3>{{ baseProduct.name }}</h3>
            <p>{{ baseProduct.description }}</p>
            <ul class="features-bullets">
              <li v-for="feat in baseProduct.features.slice(0, 4)" :key="feat">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="bullet-check"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>{{ feat }}</span>
              </li>
            </ul>
          </div>
        </div>

        <h3 class="group-title">افزونه‌ها و ماژول‌های ابری اختیاری:</h3>

        <!-- Interactive Add-ons List -->
        <div class="addons-interactive-list">
          <div 
            v-for="addon in publicAddons" 
            :key="addon.id" 
            class="addon-interactive-card"
            :class="{ 'active': isSelected(addon.id) }"
            @click="toggleAddon(addon.id)"
          >
            <div class="checkbox-wrapper">
              <div class="custom-checkbox" :class="{ 'checked': isSelected(addon.id) }">
                <svg v-if="isSelected(addon.id)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            </div>
            <div class="addon-content">
              <div class="addon-header">
                <h4>{{ addon.name }}</h4>
                <span class="addon-card-price">+ {{ formatPrice(addon.price) }} / ماه</span>
              </div>
              <p>{{ addon.description }}</p>
            </div>
          </div>
        </div>

      </div>

      <!-- Live Receipt & Checkout -->
      <div class="calculator-receipt-pane">
        <div class="receipt-card glass-card">
          <h3 class="receipt-title">پیش‌فاکتور اشتراک ابری</h3>
          
          <div class="receipt-items">
            <!-- Base product row -->
            <div class="receipt-row">
              <span class="item-name">{{ baseProduct.name }}</span>
              <span class="item-value">{{ formatPrice(baseProduct.price) }}</span>
            </div>
            
            <!-- Selected Addons list -->
            <div v-if="selectedAddons.length > 0" class="receipt-addons-divider">افزونه‌های انتخابی</div>
            
            <div v-for="addonId in selectedAddons" :key="addonId" class="receipt-row addon-row">
              <span class="item-name">
                <span class="plus">+</span> {{ publicAddons.find(a => a.id === addonId)?.name }}
              </span>
              <span class="item-value">
                {{ formatPrice(publicAddons.find(a => a.id === addonId)?.price || 0) }}
              </span>
            </div>
          </div>

          <div class="receipt-total-block">
            <div class="receipt-row total-row">
              <span class="total-label">مجموع هزینه اشتراک ماهانه</span>
              <span class="total-amount">{{ formatPrice(totalPrice) }}</span>
            </div>
            <p class="trial-text-info">
              فاکتور نهایی پس از اتمام دوره آزمایشی صادر خواهد شد. هم‌اکنون می‌توانید بدون نیاز به پرداخت، به مدت <strong>۱۴ روز</strong> به صورت آزمایشی استفاده کنید.
            </p>
          </div>

          <button class="btn btn-primary btn-block btn-xl" @click="startTrialWithSelection">
            <span>شروع دوره تست رایگان ۱۴ روزه</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon-arrow"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>

          <div class="guarantee-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="guarantee-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>۱۴ روز تست رایگان کامل + ۷ روز مهلت تنفس</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- How It Works Section -->
  <section class="page-card how-it-works-section">
    <div class="section-header text-center">
      <span class="badge">مراحل راه‌اندازی</span>
      <h2 class="section-title">سایت شما چگونه ساخته و تمدید می‌شود؟</h2>
      <p class="section-subtitle">
        مسیر سلف‌سرویس و اتوماتیک ارپ‌یار به گونه‌ای طراحی شده تا شما در چند دقیقه سیستم خود را تحویل بگیرید.
      </p>
    </div>

    <div class="steps-flow-grid" style="margin-top: 30px">
      
      <div class="step-card">
        <div class="step-number">۱</div>
        <h3>۱. ثبت مشخصات و انتخاب آدرس</h3>
        <p>نام و مشخصات سازمان خود را ثبت کنید و نام انگلیسی آدرس سایت اختصاصی خود را برگزینید. آدرس نهایی به صورت <strong>slug.erpyar.ir</strong> فوراً برای شما رزرو خواهد شد.</p>
      </div>

      <div class="step-card">
        <div class="step-number">۲</div>
        <h3>۲. انتخاب ماژول‌ها و اسمبل سیستم</h3>
        <p>ماژول‌های مورد نیاز خود (مانند حسابداری ERPNext یا CRM مشتریان) را انتخاب کنید. سیستم شما در پشت صحنه در سریع‌ترین زمان روی زیرساخت Press اسمبل می‌شود.</p>
      </div>

      <div class="step-card">
        <div class="step-number">۳</div>
        <h3>۳. شروع تست رایگان ۱۴ روزه</h3>
        <p>بدون نیاز به پرداخت، به مدت ۱۴ روز به صورت کامل از امکانات پلتفرم استفاده کنید. هیچ محدودیتی در بررسی ویژگی‌ها و بومی‌سازی فرآیندهای سازمان شما وجود ندارد.</p>
      </div>

      <div class="step-card">
        <div class="step-number">۴</div>
        <h3>۴. پرداخت اشتراک یا تعلیق موقت</h3>
        <p>پیش از پایان تست، اشتراک خود را تمدید کنید. در صورت اتمام ۱۴ روز و عدم تمدید، سایت شما موقتاً <strong>تعلیق (Suspended)</strong> می‌شود و تا <strong>۷ روز مهلت پرداخت (Grace Period)</strong> دارید تا از حذف اطلاعات جلوگیری کنید.</p>
      </div>

    </div>
  </section>

  <!-- Public Curated Add-ons Details -->
  <section class="page-card addons-details-section">
    <div class="section-header text-center">
      <span class="badge">جزئیات ماژول‌ها</span>
      <h2 class="section-title">ماژول‌های ابری از پیش آماده برای استقرار فوری</h2>
      <p class="section-subtitle">
        توسعه داده شده بر پایه قوی‌ترین و پایدارترین راهکارهای متن‌باز بین‌المللی با بومی‌سازی عمیق برای ایران.
      </p>
    </div>

    <div class="grid grid-2" style="margin-top: 30px">
      <div v-for="addon in publicAddons" :key="addon.id" class="addon-detail-block">
        <div class="addon-detail-header">
          <div class="title-wrap">
            <h3>{{ addon.name }}</h3>
            <span class="badge-accent">{{ formatPrice(addon.price) }} / ماه</span>
          </div>
        </div>
        <p>{{ addon.description }}</p>
        <ul class="features-list-detail">
          <li v-for="feat in addon.features" :key="feat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="check-icon"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>{{ feat }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>

  <!-- Marketplace Preview -->
  <section class="page-card">
    <h2 class="section-title text-center">افزونه‌های مارکت‌پلیس آماده نصب</h2>
    <p class="section-subtitle text-center" style="margin-bottom: 24px;">
      به‌سادگی ابزارهای ارتباطی و بانکی محلی ایران را فعال کنید و سیستم خود را به دیگر سرویس‌ها متصل سازید.
    </p>
    <div class="grid grid-3">
      <article v-for="app in homeSections.marketplace" :key="app.title" class="item">
        <span class="badge">سازگار با ایران</span>
        <h3>{{ app.title }}</h3>
        <small style="color: var(--erpyar-muted)">{{ app.category }}</small>
        <p>{{ app.description }}</p>
      </article>
    </div>
  </section>

  <!-- FAQs Section -->
  <section class="page-card">
    <h2 class="section-title text-center" style="margin-bottom: 24px;">سوالات متداول کاربران</h2>
    <div class="faq-container">
      <article v-for="faq in homeSections.faqs" :key="faq.q" class="faq-item">
        <h4>{{ faq.q }}</h4>
        <p>{{ faq.a }}</p>
      </article>
    </div>
  </section>

  <!-- Final CTA Section -->
  <section class="page-card final-cta-block">
    <div class="cta-inner">
      <h2>نرم‌افزار سازمانی خود را امروز فعال کنید</h2>
      <p>بدون ریسک، فرآیندهای مالی، فروش و اداری سازمان خود را روی امن‌ترین بستر ابری تست کنید.</p>
      <div class="hero-actions" style="justify-content: center; margin-top: 20px;">
        <button class="btn btn-primary btn-xl" @click="scrollToCalculator">محاسبه قیمت و شروع تست</button>
        <RouterLink class="btn btn-outline" style="color: #fff; border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.05);" to="/demo">مشاوره حضوری و دمو</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Redesigned Premium Styles for Home.vue */

/* Helper utilities */
.text-center {
  text-align: center;
}
.text-white {
  color: #ffffff;
}

/* Sections */
.hero-section {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 30px;
  align-items: center;
  padding: clamp(30px, 5vw, 60px);
  background: 
    radial-gradient(400px 300px at 0% 0%, rgba(18, 184, 134, 0.12), transparent 75%),
    radial-gradient(400px 300px at 100% 100%, rgba(59, 130, 246, 0.1), transparent 75%),
    #ffffff;
  border-radius: var(--erpyar-radius-xl);
  overflow: hidden;
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.badge-premium {
  align-self: flex-start;
  font-size: 13px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(18, 184, 134, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%);
  color: var(--erpyar-primary-dark);
}

.hero-title {
  font-size: clamp(28px, 3.8vw, 42px);
  line-height: 1.3;
  margin: 0;
  font-weight: 900;
  color: var(--erpyar-text);
}

.hero-title .highlight {
  background: linear-gradient(120deg, var(--erpyar-primary) 0%, var(--erpyar-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: clamp(15px, 1.6vw, 17px);
  line-height: 1.85;
  color: var(--erpyar-muted);
  margin: 0;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.btn-lg {
  padding: 12px 24px;
  font-size: 15px;
}

.btn-xl {
  padding: 16px 28px;
  font-size: 16px;
  width: 100%;
}

.btn-block {
  width: 100%;
  display: flex;
  justify-content: center;
}

.icon-arrow {
  margin-right: 8px;
  transition: transform 0.2s ease;
}

.btn:hover .icon-arrow {
  transform: translateX(-4px);
}

/* Browser Mockup Visual */
.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
  perspective: 1000px;
}

.browser-mockup {
  width: 100%;
  max-width: 440px;
  border-radius: var(--erpyar-radius-lg);
  border: 1px solid var(--erpyar-border);
  box-shadow: 0 30px 70px -15px rgba(15, 23, 42, 0.15);
  background: #ffffff;
  overflow: hidden;
  transform: rotateY(-5deg) rotateX(3deg);
  transition: transform 0.5s ease;
}

.browser-mockup:hover {
  transform: rotateY(0deg) rotateX(0deg);
}

.browser-header {
  display: grid;
  grid-template-columns: 80px 1fr;
  align-items: center;
  padding: 10px 14px;
  background: #f1f5f9;
  border-bottom: 1px solid var(--erpyar-border);
}

.browser-buttons {
  display: flex;
  gap: 6px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
}
.dot-red { background-color: #ef4444; }
.dot-yellow { background-color: #f59e0b; }
.dot-green { background-color: #10b981; }

.browser-address {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid var(--erpyar-border);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  color: var(--erpyar-muted);
  font-family: monospace;
}

.lock-icon {
  font-size: 10px;
}

.browser-body {
  display: grid;
  grid-template-columns: 55px 1fr;
  min-height: 240px;
  background: #f8fafc;
}

.mock-sidebar {
  background: #1e293b;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 12px;
}

.mock-logo {
  width: 26px;
  height: 26px;
  background: var(--erpyar-primary);
  border-radius: 6px;
  color: #ffffff;
  font-weight: 800;
  display: grid;
  place-items: center;
  font-size: 12px;
}

.mock-nav-item {
  width: 20px;
  height: 6px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
}

.mock-nav-item.active {
  background: rgba(18, 184, 134, 0.4);
}

.mock-main {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mock-stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.mock-card {
  background: #ffffff;
  border: 1px solid var(--erpyar-border);
  border-radius: 6px;
}
.h-8 { height: 28px; }

.mock-chart-card {
  height: 90px;
  background: #ffffff;
  border: 1px solid var(--erpyar-border);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.mock-chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 60px;
}

.bar {
  width: 20%;
  background: linear-gradient(180deg, var(--erpyar-primary) 0%, var(--erpyar-soft-bg) 100%);
  border-radius: 4px 4px 0 0;
}
.bar-1 { height: 40%; }
.bar-2 { height: 80%; background: linear-gradient(180deg, var(--erpyar-secondary) 0%, var(--erpyar-soft-bg) 100%); }
.bar-3 { height: 60%; }

.mock-status {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(18, 184, 134, 0.08);
  border: 1px solid rgba(18, 184, 134, 0.2);
  border-radius: 6px;
  padding: 6px 10px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  background-color: var(--erpyar-primary);
  border-radius: 999px;
  box-shadow: 0 0 8px var(--erpyar-primary);
  animation: pulse 2s infinite;
}

.status-text {
  font-size: 11px;
  font-weight: 700;
  color: var(--erpyar-primary-dark);
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.5; }
}

/* Trust Section */
.trust-section {
  background: #ffffff;
}

.section-header {
  margin-bottom: 12px;
}

.section-subtitle {
  color: var(--erpyar-muted);
  max-width: 600px;
  margin: 8px auto 0;
  line-height: 1.8;
}

.trust-card {
  border: 1px solid var(--erpyar-border);
  border-radius: var(--erpyar-radius-md);
  padding: 24px 20px;
  background: #f8fafc;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.trust-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}

.trust-badge-val {
  font-size: clamp(24px, 3.5vw, 32px);
  font-weight: 900;
  color: var(--erpyar-primary-dark);
  background: rgba(18, 184, 134, 0.08);
  padding: 6px 16px;
  border-radius: 999px;
  line-height: 1;
}

.trust-card h3 {
  margin: 10px 0 0;
  font-size: 17px;
}

.trust-card p {
  margin: 0;
  font-size: 14px;
  color: var(--erpyar-muted);
  line-height: 1.7;
}

/* Calculator Section */
.calculator-section {
  background: linear-gradient(180deg, #ffffff 0%, #f1f7f5 100%);
}

.calculator-container {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 30px;
  align-items: start;
}

.calculator-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.base-product-card-interactive {
  border: 2px solid var(--erpyar-primary);
  background: #ffffff;
  border-radius: var(--erpyar-radius-lg);
  padding: 20px;
  display: flex;
  gap: 14px;
  position: relative;
  box-shadow: 0 10px 30px rgba(18, 184, 134, 0.06);
}

.selection-indicator {
  width: 28px;
  height: 28px;
  background: var(--erpyar-primary);
  border-radius: 999px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge-required {
  background: rgba(18, 184, 134, 0.15);
  color: var(--erpyar-primary-dark);
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
}

.addon-price {
  font-size: 15px;
  font-weight: 800;
  color: var(--erpyar-text);
}

.base-product-card-interactive h3 {
  margin: 0;
  font-size: 19px;
}

.base-product-card-interactive p {
  margin: 0;
  font-size: 13.5px;
  color: var(--erpyar-muted);
  line-height: 1.65;
}

.features-bullets {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.features-bullets li {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--erpyar-muted);
}

.bullet-check {
  color: var(--erpyar-primary);
  flex-shrink: 0;
}

.group-title {
  font-size: 16px;
  margin: 10px 0 4px;
  color: var(--erpyar-text);
  font-weight: 800;
}

.addons-interactive-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.addon-interactive-card {
  border: 1px solid var(--erpyar-border);
  background: #ffffff;
  border-radius: var(--erpyar-radius-md);
  padding: 16px;
  display: flex;
  gap: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
}

.addon-interactive-card:hover {
  border-color: rgba(59, 130, 246, 0.4);
  background: #f8fafc;
}

.addon-interactive-card.active {
  border-color: var(--erpyar-secondary);
  background: rgba(59, 130, 246, 0.02);
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.05);
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.custom-checkbox {
  width: 22px;
  height: 22px;
  border: 2px solid var(--erpyar-border);
  border-radius: 6px;
  display: grid;
  place-items: center;
  transition: all 0.2s ease;
  background: #ffffff;
}

.custom-checkbox.checked {
  border-color: var(--erpyar-secondary);
  background: var(--erpyar-secondary);
  color: #ffffff;
}

.addon-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.addon-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.addon-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.addon-card-price {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--erpyar-secondary);
}

.addon-content p {
  margin: 0;
  font-size: 12.5px;
  color: var(--erpyar-muted);
  line-height: 1.6;
}

/* Calculator Receipt */
.calculator-receipt-pane {
  position: sticky;
  top: 90px;
}

.receipt-card {
  padding: 24px;
  border-radius: var(--erpyar-radius-lg);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.receipt-title {
  margin: 0;
  font-size: 17px;
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
  font-size: 13.5px;
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
  margin-top: 10px;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.addon-row {
  font-size: 13px;
  color: var(--erpyar-muted);
}

.addon-row .plus {
  color: var(--erpyar-secondary);
  font-weight: 800;
  margin-left: 2px;
}

.receipt-total-block {
  padding-top: 14px;
  border-top: 1px solid var(--erpyar-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.total-row {
  font-size: 14px;
  font-weight: 800;
  color: var(--erpyar-text);
}

.total-row .total-amount {
  font-size: 18px;
  font-weight: 900;
  color: var(--erpyar-primary-dark);
}

.trial-text-info {
  font-size: 12px;
  color: var(--erpyar-muted);
  line-height: 1.6;
  margin: 0;
}

.btn-xl {
  padding: 14px 20px;
  font-weight: 800;
}

.guarantee-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--erpyar-muted);
}

.guarantee-icon {
  color: var(--erpyar-primary-dark);
}

/* How It Works Section */
.how-it-works-section {
  background: #ffffff;
}

.steps-flow-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.step-card {
  border: 1px solid var(--erpyar-border);
  background: #f8fafc;
  border-radius: var(--erpyar-radius-md);
  padding: 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-number {
  position: absolute;
  top: -12px;
  right: 16px;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--erpyar-primary) 0%, var(--erpyar-secondary) 100%);
  color: #ffffff;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 900;
  box-shadow: 0 4px 10px rgba(18, 184, 134, 0.2);
}

.step-card h3 {
  margin: 8px 0 0;
  font-size: 14.5px;
  font-weight: 800;
}

.step-card p {
  margin: 0;
  font-size: 12.5px;
  color: var(--erpyar-muted);
  line-height: 1.7;
}

/* Addons detail section */
.addon-detail-block {
  border: 1px solid var(--erpyar-border);
  border-radius: var(--erpyar-radius-lg);
  padding: 24px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.addon-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.addon-detail-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.badge-accent {
  font-size: 12px;
  font-weight: 700;
  background: rgba(59, 130, 246, 0.1);
  color: var(--erpyar-secondary);
  padding: 4px 10px;
  border-radius: 999px;
  display: inline-block;
  margin-top: 4px;
}

.addon-detail-block p {
  margin: 0;
  font-size: 13.5px;
  color: var(--erpyar-muted);
  line-height: 1.7;
}

.features-list-detail {
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.features-list-detail li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--erpyar-text);
}

.check-icon {
  color: var(--erpyar-primary);
  flex-shrink: 0;
}

/* FAQ Container */
.faq-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 12px;
}

.faq-item {
  border: 1px solid var(--erpyar-border);
  border-radius: var(--erpyar-radius-md);
  padding: 16px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.faq-item h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--erpyar-text);
}

.faq-item p {
  margin: 0;
  font-size: 13px;
  color: var(--erpyar-muted);
  line-height: 1.75;
}

/* Final CTA block */
.final-cta-block {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  color: #ffffff;
  padding: 40px;
  text-align: center;
}

.cta-inner h2 {
  font-size: clamp(22px, 3.2vw, 32px);
  margin: 0;
  font-weight: 800;
}

.cta-inner p {
  font-size: clamp(14px, 1.5vw, 16px);
  color: #94a3b8;
  margin: 8px 0 0;
}

/* Mobile responsive adjustments */
@media (max-width: 1024px) {
  .hero-section {
    grid-template-columns: 1fr;
    padding: 30px 20px;
  }
  
  .hero-visual {
    margin-top: 20px;
  }
  
  .calculator-container {
    grid-template-columns: 1fr;
  }
  
  .calculator-receipt-pane {
    position: static;
  }
  
  .steps-flow-grid {
    grid-template-columns: 1fr;
  }
  
  .faq-container {
    grid-template-columns: 1fr;
  }
}
</style>
