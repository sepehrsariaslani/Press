<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchErpyarCatalog } from '@/api';
import { baseProduct as staticBaseProduct, publicAddons as staticPublicAddons, homeSections } from '@/content';

// Import modular reusable components
import HeroFrame from '@/components/HeroFrame.vue';
import SectionHeader from '@/components/SectionHeader.vue';
import PricingComposer from '@/components/PricingComposer.vue';
import PricingReceipt from '@/components/PricingReceipt.vue';
import TrialFlowStrip from '@/components/TrialFlowStrip.vue';
import ProductModuleCard from '@/components/ProductModuleCard.vue';

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

const handleToggleAddon = (id) => {
  const index = selectedAddons.value.indexOf(id);
  if (index > -1) {
    selectedAddons.value.splice(index, 1);
  } else {
    selectedAddons.value.push(id);
  }
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
  <!-- Large Cinematic Hero Frame -->
  <HeroFrame 
    badge="ارپ‌یار ابری (Erpyar Cloud)"
    title="راه‌اندازی فوری نرم‌افزارهای سازمانی بر پایه پلتفرم پیشرفته <span style='color:var(--erpyar-primary-light); text-shadow: 0 0 15px rgba(195,155,98,0.3)'>ارپ‌یار</span>"
    subtitle="سیستم‌های حسابداری، زنجیره تامین، مشتریان و صندوق‌های اختصاصی خود را روی بستر ابری مطمئن و با دامنه اختصاصی خود مستقر کنید. شروع سریع با ۱۴ روز دوره تست کاملاً رایگان، بدون نیاز به فاکتور اولیه."
    primary-cta-text="راه‌اندازی سایت آزمایشی (۱۴ روز رایگان)"
    secondary-cta-text="درخواست دمو و مشاوره"
    @primary-click="scrollToCalculator"
  >
    <template #visual>
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
    </template>
  </HeroFrame>

  <!-- Value Propositions / Trust Stats -->
  <section class="page-card trust-section">
    <SectionHeader 
      badge="اعتماد و عملکرد"
      title="زیرساختی مطمئن و اختصاصی برای رشد مداوم کسب‌وکار"
      subtitle="ارپ‌یار به تداوم و ایمنی فرآیندهای مالی و سازمانی شما با استانداردهای بالای پایداری متعهد است."
    />
    <div class="grid grid-3">
      <article v-for="stat in homeSections.trustStats" :key="stat.label" class="trust-card">
        <div class="trust-badge-val">{{ stat.value }}</div>
        <h3>{{ stat.label }}</h3>
        <p>{{ stat.description }}</p>
      </article>
    </div>
  </section>

  <!-- Interactive Pricing Calculator Section -->
  <section id="calculator" class="page-card calculator-section">
    <SectionHeader 
      badge="قیمت‌گذاری شفاف و پویا"
      title="برآورد هزینه و سفارش پلتفرم اختصاصی"
      subtitle="نرم‌افزار سازمانی خود را با فرمول عادلانه اسمبل کنید. همواره با پلتفرم پایه شروع کنید و به دلخواه ماژول‌های مورد نیاز خود را به آن اضافه یا حذف کنید."
    />

    <div class="calculator-container">
      <!-- Calculator options / modules checkboxes -->
      <PricingComposer 
        :base-product="baseProduct"
        :public-addons="publicAddons"
        :selected-addons="selectedAddons"
        @toggle-addon="handleToggleAddon"
      />

      <!-- Live Receipt & Checkout -->
      <div class="calculator-receipt-pane">
        <PricingReceipt 
          :base-product="baseProduct"
          :public-addons="publicAddons"
          :selected-addons="selectedAddons"
          @checkout-click="startTrialWithSelection"
        />
      </div>
    </div>
  </section>

  <!-- How It Works Section -->
  <section class="page-card how-it-works-section">
    <SectionHeader 
      badge="مراحل راه‌اندازی"
      title="سایت شما چگونه ساخته و تمدید می‌شود؟"
      subtitle="مسیر سلف‌سرویس و اتوماتیک ارپ‌یار به گونه‌ای طراحی شده تا شما در چند دقیقه سیستم خود را تحویل بگیرید."
    />
    <TrialFlowStrip />
  </section>

  <!-- Public Curated Add-ons Details -->
  <section class="page-card addons-details-section">
    <SectionHeader 
      badge="جزئیات ماژول‌ها"
      title="ماژول‌های ابری از پیش آماده برای استقرار فوری"
      subtitle="توسعه داده شده بر پایه قوی‌ترین و پایدارترین راهکارهای متن‌باز بین‌المللی با بومی‌سازی عمیق برای ایران."
    />

    <div class="grid grid-2" style="margin-top: 10px">
      <ProductModuleCard 
        v-for="addon in publicAddons" 
        :key="addon.id" 
        :addon="addon"
        :active="false"
        :is-selectable="false"
      />
    </div>
  </section>

  <!-- Marketplace Preview -->
  <section class="page-card">
    <SectionHeader 
      badge="افزونه‌های جانبی"
      title="افزونه‌های مارکت‌پلیس آماده نصب"
      subtitle="به‌سادگی ابزارهای ارتباطی و بانکی محلی ایران را فعال کنید و سیستم خود را به دیگر سرویس‌ها متصل سازید."
    />
    <div class="grid grid-3">
      <article v-for="app in homeSections.marketplace" :key="app.title" class="item glass-card card-hover">
        <span class="badge">سازگار با ایران</span>
        <h3 style="margin-top: 10px; font-size: 16px;">{{ app.title }}</h3>
        <small style="color: var(--erpyar-primary); font-weight: 700;">{{ app.category }}</small>
        <p style="color: var(--erpyar-text-secondary); font-size: 13px; margin-top: 6px;">{{ app.description }}</p>
      </article>
    </div>
  </section>

  <!-- FAQs Section -->
  <section class="page-card">
    <SectionHeader 
      badge="سوالات متداول"
      title="سوالات متداول کاربران"
    />
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
      <div class="hero-actions" style="justify-content: center; margin-top: 24px; display: flex; gap: 12px;">
        <button class="btn btn-primary" style="padding: 14px 28px; font-size: 15px;" @click="scrollToCalculator">محاسبه قیمت و شروع تست</button>
        <RouterLink class="btn btn-outline" style="padding: 14px 28px; font-size: 15px;" to="/demo">مشاوره حضوری و دمو</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Mockup Visual */
.browser-mockup {
  width: 100%;
  max-width: 440px;
  border-radius: var(--erpyar-radius-lg);
  border: 1px solid var(--erpyar-border);
  box-shadow: var(--erpyar-shadow-premium);
  background: var(--erpyar-bg-surface);
  overflow: hidden;
  transform: rotateY(-6deg) rotateX(4deg);
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
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--erpyar-border-light);
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
.dot-red { background-color: #f87171; }
.dot-yellow { background-color: #fbbf24; }
.dot-green { background-color: #34d399; }

.browser-address {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--erpyar-border-light);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  color: var(--erpyar-text-secondary);
  font-family: monospace;
}

.lock-icon {
  font-size: 10px;
}

.browser-body {
  display: grid;
  grid-template-columns: 55px 1fr;
  min-height: 240px;
  background: rgba(0, 0, 0, 0.1);
}

.mock-sidebar {
  background: #0d0f15;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 12px;
  border-left: 1px solid var(--erpyar-border-light);
}

.mock-logo {
  width: 26px;
  height: 26px;
  background: var(--erpyar-primary);
  border-radius: 6px;
  color: #07080b;
  font-weight: 800;
  display: grid;
  place-items: center;
  font-size: 12px;
}

.mock-nav-item {
  width: 20px;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
}

.mock-nav-item.active {
  background: rgba(195, 155, 98, 0.4);
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
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--erpyar-border-light);
  border-radius: 6px;
}
.h-8 { height: 28px; }

.mock-chart-card {
  height: 90px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--erpyar-border-light);
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
  background: linear-gradient(180deg, var(--erpyar-primary) 0%, transparent 100%);
  border-radius: 4px 4px 0 0;
}
.bar-1 { height: 40%; }
.bar-2 { height: 80%; background: linear-gradient(180deg, var(--erpyar-accent) 0%, transparent 100%); }
.bar-3 { height: 60%; }

.mock-status {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(195, 155, 98, 0.05);
  border: 1px solid rgba(195, 155, 98, 0.15);
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
  color: var(--erpyar-primary);
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.5; }
}

/* Trust Section */
.trust-card {
  border: 1px solid var(--erpyar-border-light);
  border-radius: var(--erpyar-radius-md);
  padding: 24px 20px;
  background: rgba(255, 255, 255, 0.01);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.trust-card:hover {
  transform: translateY(-4px);
  border-color: var(--erpyar-border);
  background: rgba(195, 155, 98, 0.02);
}

.trust-badge-val {
  font-size: clamp(24px, 3.5vw, 32px);
  font-weight: 900;
  color: var(--erpyar-primary);
  background: rgba(195, 155, 98, 0.08);
  padding: 6px 18px;
  border-radius: 999px;
  line-height: 1;
}

.trust-card h3 {
  margin: 10px 0 0;
  font-size: 16px;
  font-weight: 800;
}

.trust-card p {
  margin: 0;
  font-size: 13.5px;
  color: var(--erpyar-text-secondary);
  line-height: 1.7;
}

/* Calculator Container */
.calculator-container {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 30px;
  align-items: start;
}

.calculator-receipt-pane {
  position: sticky;
  top: 90px;
}

/* FAQ Container */
.faq-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 12px;
}

.faq-item {
  border: 1px solid var(--erpyar-border-light);
  border-radius: var(--erpyar-radius-md);
  padding: 20px;
  background: rgba(255, 255, 255, 0.01);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.faq-item h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--erpyar-text-primary);
}

.faq-item p {
  margin: 0;
  font-size: 13px;
  color: var(--erpyar-text-secondary);
  line-height: 1.75;
}

/* Final CTA block */
.final-cta-block {
  background: radial-gradient(circle at 50% 50%, rgba(195, 155, 98, 0.1) 0%, transparent 80%), #0d0e15;
  border-color: var(--erpyar-border);
  padding: 50px 40px;
  text-align: center;
}

.cta-inner h2 {
  font-size: clamp(22px, 3.2vw, 32px);
  margin: 0;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.cta-inner p {
  font-size: clamp(14px, 1.5vw, 16px);
  color: var(--erpyar-text-secondary);
  margin: 8px 0 0;
}

/* Card hover animation */
.card-hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-hover:hover {
  transform: translateY(-4px);
  border-color: var(--erpyar-border);
}

@media (max-width: 1024px) {
  .calculator-container {
    grid-template-columns: 1fr;
  }
  .calculator-receipt-pane {
    position: static;
  }
  .faq-container {
    grid-template-columns: 1fr;
  }
}
</style>
