import { useState, type ReactNode } from 'react';
import './showcase.css';
import { productModules, type ModuleIcon } from './modules';

const moduleIcons: Record<ModuleIcon, ReactNode> = {
  finance: <><path d="M4 5.5h16v15H4zM8 2.5v6M16 2.5v6M4 10h16M8 14h3M8 17h8" /><path d="m15 14 1.5 1.5L19 13" /></>,
  sales: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20zM16 5.5a3 3 0 0 1 0 5.8M17.5 14a4.5 4.5 0 0 1 3 4.3V20h-3" /></>,
  procurement: <><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 1.9-1.5L21 9H6" /><circle cx="10" cy="20" r="1.2" /><circle cx="18" cy="20" r="1.2" /><path d="M10 7h7M13.5 3.5v7" /></>,
  inventory: <><path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2zM4 7.2l8 4.3 8-4.3M12 11.5V21M8 5.1l8 4.3" /></>,
  projects: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h8M8 12h3M8 16h5M15 12l1.3 1.3L19 10.5" /></>,
  manufacturing: <><path d="M4 20V9l5 3V9l5 3V5l6-2v17z" /><path d="M8 16h2M14 16h2M17 7h1" /></>,
  quality: <><path d="M12 3 20 6v5.3c0 4.6-3 7.7-8 9.7-5-2-8-5.1-8-9.7V6z" /><path d="m8.5 11.5 2.2 2.2 4.8-5" /></>,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.3a5.5 5.5 0 0 1 11 0V20z" /><path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 14a4.5 4.5 0 0 1 3 4.3V20h-3" /></>,
  assets: <><path d="M4 5h16v15H4zM8 9h8M8 13h3M8 16h5" /><path d="m15 15 1.5 1.5L20 13" /></>,
  fleet: <><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /><path d="M15.5 10v3H21" /></>,
  pricing: <><path d="M4 12 12 4h8v8l-8 8z" /><circle cx="16" cy="8" r="1.2" /><path d="m8 15 2-2 2 2 4-4" /></>,
  growth: <><path d="M4 20V11M10 20V7M16 20V14M22 20H2" /><path d="m4 8 6-4 5 4 6-5" /></>,
  restaurant: <><path d="M5 3v7a3 3 0 0 0 6 0V3M8 3v18M17 3c-2 2.5-2 6-.5 8H20V3M18 11v10" /></>,
};

function ModuleMark({ icon }: { icon: ModuleIcon }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{moduleIcons[icon]}</svg>;
}

function toPersianNumber(value: number) {
  return String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

export function ProductShowcase() {
  const [selectedId, setSelectedId] = useState(productModules[0].id);
  const selectedIndex = productModules.findIndex(item => item.id === selectedId);
  const selected = productModules[selectedIndex] ?? productModules[0];

  return <section id="modules" className="product-showcase" aria-labelledby="modules-title" dir="rtl">
    <div className="product-showcase-inner">
      <header className="product-intro">
        <p className="product-eyebrow"><span className="product-eyebrow-mark" aria-hidden="true" />یکپارچگی، در عمل</p>
        <h2 id="modules-title">هر بخش از کسب‌وکارت،<br /><span>در جای خودش.</span></h2>
        <div className="product-intro-side">
          <p>از حسابداری و فروش تا پروژه، تولید و نگهداری؛ ماژول‌ها اطلاعات را به هم وصل می‌کنند تا تصمیم‌گرفتن ساده‌تر شود.</p>
          <a className="product-login-link" href="/hesab">ورود به آسومی <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <nav className="module-picker" aria-label="انتخاب ماژول برای معرفی">
        {productModules.map((item, index) => <button
          key={item.id}
          type="button"
          className="module-picker-button"
          aria-pressed={selected.id === item.id}
          aria-controls="selected-module"
          onClick={() => setSelectedId(item.id)}
        >
          <span className="module-picker-index">{toPersianNumber(index + 1)}</span>
          <span>{item.shortTitle}</span>
        </button>)}
      </nav>

      <article key={selected.id} id="selected-module" className="module-detail" data-module={selected.id} aria-labelledby="selected-module-title">
        <div className="module-copy">
          <div className="module-heading-row">
            <span className="module-mark"><ModuleMark icon={selected.icon} /></span>
            <p className="module-kicker">ماژول {toPersianNumber(selectedIndex + 1)} <span>از {toPersianNumber(productModules.length)}</span></p>
          </div>
          <h3 id="selected-module-title" aria-live="polite" aria-atomic="true">{selected.title}</h3>
          <p className="module-description">{selected.description}</p>
          <ul className="module-features">
            {selected.features.map(feature => <li key={feature}><svg viewBox="0 0 18 18" aria-hidden="true"><path d="m4 9 3.1 3.1L14 5.5" /></svg>{feature}</li>)}
          </ul>
          <a className="module-entry-link" href="/hesab">این بخش را در آسومی ببین <span aria-hidden="true">↗</span></a>
        </div>

        <div className="module-visual" role="img" aria-label={`نمای مفهومی جریان کار ${selected.title}: ${selected.flow.join('، سپس ')}`}>
          <div className="module-visual-topbar" aria-hidden="true"><span className="visual-brand-mark"><i /><i /><i /></span><span>جریان کار</span><span className="visual-status"><i /> پیوسته</span></div>
          <div className="module-visual-body">
            <p className="flow-caption">یک مسیر؛ از ثبت تا نتیجه</p>
            <div className="module-flow">
              {selected.flow.map((step, index) => <div className="module-flow-step" key={step}>
                <span className="flow-step-index">{toPersianNumber(index + 1)}</span>
                <span className="flow-step-label">{step}</span>
              </div>)}
            </div>
            <div className="flow-summary" aria-hidden="true"><span /><span /><span /></div>
          </div>
          <p className="visual-footnote">نمای مفهومی · نه تصویر داده‌ی واقعی</p>
        </div>
      </article>

      <aside className="module-availability-note">
        <span className="availability-mark" aria-hidden="true">i</span>
        <p>فهرست بر پایه‌ی قابلیت‌های موجود در برنامه است. نمایش و استفاده از هر بخش به نصب ماژول‌های لازم، تنظیمات شرکت و سطح دسترسی کاربر بستگی دارد.</p>
      </aside>

      <footer className="product-close">
        <p>آسومی</p>
        <h2>به‌سوی آینده‌ی روشن</h2>
        <a className="product-final-cta" href="/hesab">آسومی را ببین <span aria-hidden="true">↗</span></a>
      </footer>
    </div>
  </section>;
}
