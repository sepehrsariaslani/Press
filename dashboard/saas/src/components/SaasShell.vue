<script setup>
const navItems = [
  { to: '/', label: 'خانه' },
  { to: '/services', label: 'خدمات' },
  { to: '/club', label: 'باشگاه مشتریان' },
  { to: '/reserve', label: 'رزرو دمو' },
  { to: '/wifi', label: 'وای فای هوشمند' },
  { to: '/pricing', label: 'قیمت ها' },
  { to: '/faq', label: 'سوالات متداول' },
  { to: '/customers', label: 'مشتریان' },
  { to: '/blog', label: 'بلاگ' },
  { to: '/contact', label: 'تماس با ما' },
];

const quickItems = ['سایت ها', 'بنچ ها', 'سرورها', 'پنل فروشنده', 'بازارچه', 'صورتحساب', 'تنظیمات', 'وضعیت'];
</script>

<template>
  <div class="site-wrap">
    <div class="ambient ambient--one" />
    <div class="ambient ambient--two" />

    <header class="shell-header">
      <div class="brand-block">
        <span class="brand-mark">دن</span>
        <div>
          <p class="brand-title">DEN SaaS Cloud</p>
          <p class="brand-subtitle">پنل مدیریت اپ و زیرساخت برای مشتریان شما</p>
        </div>
      </div>

      <nav class="main-nav">
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to">{{ item.label }}</RouterLink>
      </nav>

      <div class="header-actions">
        <a class="btn-inline" href="/dashboard">ورود مشتری</a>
      </div>
    </header>

    <section class="quick-links">
      <span>برچسب های سیستمی:</span>
      <span v-for="item in quickItems" :key="item" class="chip">{{ item }}</span>
    </section>

    <main class="shell-content">
      <slot />
    </main>

    <footer class="site-footer">
      <p>© {{ new Date().getFullYear() }} دن کلود - طراحی فارسی برای مدل SaaS شما</p>
      <div>
        <RouterLink to="/about-us">درباره ما</RouterLink>
        <RouterLink to="/customer-services">خدمات مشتری</RouterLink>
        <RouterLink to="/other-expenses">هزینه های دیگر</RouterLink>
      </div>
    </footer>
  </div>
</template>
