import './showcase.css';
import { ModuleMark } from './ModuleMark';
import { productModules } from './modules';

function toPersianNumber(value: number) {
  return String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

export function ProductShowcase({ onOpenModule, onOpenPricing }: { onOpenModule: (moduleId: string) => void; onOpenPricing: () => void }) {
  return <section id="modules" className="product-showcase" aria-labelledby="modules-title" dir="rtl">
    <div className="product-showcase-inner">
      <header className="product-intro">
        <p className="product-eyebrow"><span className="product-eyebrow-mark" aria-hidden="true" />یکپارچگی، در عمل</p>
        <h2 id="modules-title">هر بخش از کسب‌وکارت،<br /><span>در جای خودش.</span></h2>
        <div className="product-intro-side">
          <p>از ثبت‌های روزانه تا برنامه‌ریزی آینده؛ ۱۵ ماژول آسومی به هم متصل‌اند تا هر تصمیم، تصویر کامل‌تری داشته باشد.</p>
          <button className="product-pricing-link" type="button" onClick={onOpenPricing}>ساخت ترکیب و دیدن تعرفه‌ها <span aria-hidden="true">←</span></button>
          <a className="product-login-link" href="/hesab">ورود به آسومی <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <div className="module-directory-heading">
        <h3>ماژول‌ها را بشناس</h3>
        <p>هر بخش را باز کن تا قابلیت‌ها، اسناد و ارتباطش با بقیه را ببینی.</p>
      </div>

      <nav className="module-directory" aria-label="۱۵ ماژول آسومی">
        {productModules.map((item, index) => <a
          key={item.id}
          className="module-card"
          href={`#module/${item.id}`}
          onClick={event => {
            event.preventDefault();
            onOpenModule(item.id);
          }}
        >
          <span className="module-card-meta">
            <span className="module-card-index">{toPersianNumber(index + 1)} <span>از {toPersianNumber(productModules.length)}</span></span>
            <span className="module-card-mark"><ModuleMark icon={item.icon} /></span>
          </span>
          <h4>{item.title}</h4>
          <p>{item.description}</p>
          <span className="module-card-action">قابلیت‌ها و اسناد <span aria-hidden="true">←</span></span>
        </a>)}
      </nav>

      <aside className="module-availability-note">
        <span className="availability-mark" aria-hidden="true">i</span>
        <p>این صفحه راهنمای معرفی ماژول‌هاست؛ اسناد واقعی پس از ورود و بر اساس ماژول‌های نصب‌شده، تنظیمات شرکت و سطح دسترسی نمایش داده می‌شوند.</p>
      </aside>

      <footer className="product-close">
        <p>آسومی</p>
        <h2>به‌سوی آینده‌ی روشن</h2>
        <a className="product-final-cta" href="/hesab">آسومی را ببین <span aria-hidden="true">↗</span></a>
      </footer>
    </div>
  </section>;
}
