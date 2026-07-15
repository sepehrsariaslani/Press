<template>
  <div class="trial-flow-strip">
    <div class="step-item">
      <div class="step-num-circle">۱</div>
      <div class="step-content">
        <h4>ثبت مشخصات و انتخاب آدرس</h4>
        <p>نام و مشخصات سازمان خود را ثبت کنید و آدرس اختصاصی <strong>slug.erpyar.ir</strong> خود را رزرو نمایید.</p>
      </div>
    </div>
    
    <div class="flow-connector"></div>

    <div class="step-item">
      <div class="step-num-circle">۲</div>
      <div class="step-content">
        <h4>انتخاب ماژول‌ها و اسمبل سیستم</h4>
        <p>ماژول‌های مورد نیاز خود (حسابداری یا مشتریان) را انتخاب کنید تا روی بستر Press مستقر شوند.</p>
      </div>
    </div>

    <div class="flow-connector"></div>

    <div class="step-item">
      <div class="step-num-circle">۳</div>
      <div class="step-content">
        <h4>شروع تست رایگان ۱۴ روزه</h4>
        <p>بدون نیاز به پرداخت، به مدت ۱۴ روز کامل از امکانات و ابزارهای پلتفرم پایه به صورت تست استفاده کنید.</p>
      </div>
    </div>

    <div class="flow-connector"></div>

    <div class="step-item">
      <div class="step-num-circle">۴</div>
      <div class="step-content">
        <h4>پرداخت اشتراک یا تعلیق موقت</h4>
        <p>در صورت اتمام تست و عدم پرداخت، سایت موقتاً تعلیق شده و کلاینت تا ۷ روز مهلت تنفس برای پرداخت خواهد داشت.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trial-flow-strip {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
  align-items: flex-start;
  gap: 12px;
  position: relative;
  z-index: 10;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}

.step-num-circle {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--erpyar-primary) 0%, var(--erpyar-primary-dark) 100%);
  color: #07080b;
  font-size: 18px;
  font-weight: 900;
  border-radius: 999px;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 15px rgba(195, 155, 98, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.step-content h4 {
  font-size: 14.5px;
  font-weight: 800;
  color: var(--erpyar-text-primary);
  margin-bottom: 4px;
}

.step-content p {
  font-size: 12px;
  color: var(--erpyar-text-secondary);
  line-height: 1.7;
  max-width: 25ch;
  margin: 0 auto;
}

.flow-connector {
  height: 2px;
  background: linear-gradient(90deg, var(--erpyar-primary-dark), transparent);
  width: 30px;
  align-self: center;
  opacity: 0.3;
}

@media (max-width: 980px) {
  .trial-flow-strip {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .flow-connector {
    width: 2px;
    height: 30px;
    background: linear-gradient(180deg, var(--erpyar-primary-dark), transparent);
  }
}
</style>
