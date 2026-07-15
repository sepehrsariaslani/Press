<script setup>
import { mainMenu } from '@/content';
</script>

<template>
  <header class="nav-dock-container">
    <div class="nav-dock glass-card">
      <!-- Brand -->
      <RouterLink class="brand-logo" to="/">
        <span class="logo-mark">ای</span>
        <span class="logo-text">
          <strong>ارپ یار</strong>
          <small>SaaS Portal</small>
        </span>
      </RouterLink>

      <!-- Nav items -->
      <nav class="dock-nav" aria-label="منوی اصلی">
        <RouterLink 
          v-for="item in mainMenu" 
          :key="item.to" 
          :to="item.to" 
          class="nav-link"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <!-- CTA -->
      <div class="dock-actions">
        <RouterLink class="btn btn-outline btn-sm" to="/products">محصولات</RouterLink>
        <RouterLink class="btn btn-primary btn-sm" to="/demo">ایجاد سایت تستی</RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.nav-dock-container {
  position: sticky;
  top: 16px;
  z-index: 100;
  width: 100%;
  display: flex;
  justify-content: center;
}

.nav-dock {
  width: min(1080px, 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 18px;
  border-radius: 999px; /* Pill layout */
  background: rgba(14, 15, 21, 0.65);
  backdrop-filter: blur(20px);
  border: 1px solid var(--erpyar-border-light);
  box-shadow: 
    0 15px 35px -10px rgba(0, 0, 0, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-mark {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--erpyar-primary) 0%, var(--erpyar-accent) 100%);
  color: #07080b;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-weight: 900;
  font-size: 14px;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-text strong {
  font-size: 14.5px;
  font-weight: 800;
  color: var(--erpyar-text-primary);
  line-height: 1.1;
}

.logo-text small {
  font-size: 10px;
  color: var(--erpyar-text-muted);
}

.dock-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--erpyar-text-secondary);
  border-radius: 999px;
  transition: all 0.25s ease;
}

.nav-link:hover {
  color: var(--erpyar-primary);
  background: rgba(255, 255, 255, 0.03);
}

.nav-link.router-link-active {
  color: #07080b;
  background: var(--erpyar-primary);
  font-weight: 700;
}

.dock-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-sm {
  padding: 6px 14px;
  font-size: 12px;
}

@media (max-width: 980px) {
  .dock-nav {
    display: none; /* Mobile hamburger/drawer fallback in general app shell */
  }
}
</style>
