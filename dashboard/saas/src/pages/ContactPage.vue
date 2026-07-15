<template>
  <section class="card">
    <h1 class="section-title">تماس با ما</h1>
    <p class="section-subtitle">برای دریافت دمو یا مشاوره ظرفیت، فرم زیر را پر کنید.</p>

    <div class="grid-2" style="margin-top: 12px">
      <article class="panel">
        <div class="form-grid">
          <div class="field">
            <label>نام و نام خانوادگی</label>
            <input type="text" placeholder="مثلا علی رضایی" />
          </div>
          <div class="field">
            <label>موبایل</label>
            <input type="tel" placeholder="09xxxxxxxxx" />
          </div>
          <div class="field">
            <label>ایمیل</label>
            <input type="email" placeholder="name@company.com" />
          </div>
          <div class="field">
            <label>حوزه کاری</label>
            <select>
              <option>خرده فروشی</option>
              <option>خدمات سازمانی</option>
              <option>استارتاپ</option>
            </select>
          </div>
        </div>
        <div class="field" style="margin-top: 10px">
          <label>توضیحات</label>
          <textarea placeholder="نیازهای شما برای اپ ها و منابع زیرساختی"></textarea>
        </div>
        <div style="margin-top: 10px">
          <button class="btn" type="button">ارسال درخواست</button>
        </div>
      </article>

      <article class="panel">
        <h3>راه های ارتباطی</h3>
        <p>تلفن: ۰۲۱-xxxxxxx</p>
        <p>ایمیل: hello@dencloud.ir</p>
        <p>ساعات پاسخگویی: شنبه تا چهارشنبه، ۹ تا ۱۸</p>
        <div class="notice" style="margin-top: 10px">
          اگر سرویس فعال دارید، برای سرعت بیشتر از بخش «خدمات مشتری» تیکت ثبت کنید.
        </div>
      </article>
    </div>
  </section>
</template>
