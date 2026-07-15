<template>
  <footer class="footer-grid glass-card">
    <div class="footer-branding">
      <div class="footer-logo">
        <span class="logo-mark">ای</span>
        <strong>ارپ یار</strong>
      </div>
      <p class="footer-tagline">
        بستری پیشرفته و خودگردان بر بستر زیرساخت Press جهت استقرار، تست و مدیریت نرم‌افزارهای یکپارچه سازمانی و مالی با لایسنس معتبر برای سازمان‌های ایرانی.
      </p>
    </div>
    
    <div class="footer-columns">
      <div class="footer-col">
        <h4>نقشه راه</h4>
        <RouterLink to="/products">محصولات ابری</RouterLink>
        <RouterLink to="/pricing">تعرفه‌ها و ماژول‌ها</RouterLink>
        <RouterLink to="/marketplace">مارکت‌پلیس</RouterLink>
      </div>

      <div class="footer-col">
        <h4>پشتیبانی کلاینت</h4>
        <RouterLink to="/docs">مستندات پلتفرم</RouterLink>
        <RouterLink to="/contact">تماس با پشتیبانی</RouterLink>
        <RouterLink to="/demo">راه‌اندازی تست ۱۴ روزه</RouterLink>
      </div>
    </div>

    <div class="footer-bottom">
      <p>© تمامی حقوق مادی و معنوی برای پلتفرم ارپ‌یار محفوظ است.</p>
      <div class="legal-links">
        <a href="#">حریم خصوصی</a>
        <a href="#">قوانین و شرایط استفاده</a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer-grid {
  padding: 40px;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 30px;
  border-color: var(--erpyar-border-light);
  margin-top: 24px;
}

.footer-branding {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-mark {
  width: 28px;
  height: 28px;
  background: var(--erpyar-primary);
  color: #07080b;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 13px;
}

.footer-logo strong {
  font-size: 16px;
  font-weight: 800;
}

.footer-tagline {
  font-size: 13px;
  color: var(--erpyar-text-secondary);
  line-height: 1.8;
  max-width: 50ch;
}

.footer-columns {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-col h4 {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--erpyar-primary);
  margin-bottom: 4px;
}

.footer-col a {
  font-size: 13px;
  color: var(--erpyar-text-secondary);
}

.footer-col a:hover {
  color: var(--erpyar-primary-light);
}

.footer-bottom {
  grid-column: span 2 / span 2;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 20px;
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
  color: var(--erpyar-text-muted);
  flex-wrap: wrap;
  gap: 12px;
}

.legal-links {
  display: flex;
  gap: 14px;
}

.legal-links a:hover {
  color: var(--erpyar-primary);
}

@media (max-width: 980px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }
  
  .footer-bottom {
    grid-column: span 1 / span 1;
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
