import { useEffect, useRef } from 'react';
import { ModuleMark } from './ModuleMark';
import { productModuleDetails } from './moduleDetails';
import { productModules, type ProductModule } from './modules';

type ModuleDetailPageProps = {
  module: ProductModule;
  index: number;
  onOpenModule: (moduleId: string) => void;
  onReturnToModules: () => void;
};

function toPersianNumber(value: number) {
  return String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

export function ModuleDetailPage({ module, index, onOpenModule, onReturnToModules }: ModuleDetailPageProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const details = productModuleDetails[module.id];
  const relatedModules = details.relatedIds
    .map(id => productModules.find(item => item.id === id))
    .filter((item): item is ProductModule => Boolean(item));

  useEffect(() => heading.current?.focus({ preventScroll: true }), [module.id]);

  return <main className="module-detail-page" dir="rtl" aria-labelledby="module-page-title">
    <header className="module-page-header">
      <a className="module-page-brand" href="/#modules" aria-label="آسومی، فهرست ماژول‌ها">
        <span className="brand-signal" aria-hidden="true"><i /><i /><i /></span>
        <span>آسومی<small>از داده تا تصمیم</small></span>
      </a>
      <a className="module-page-login" href="/hesab">ورود به آسومی <span aria-hidden="true">↗</span></a>
    </header>

    <div className="module-page-inner">
      <nav className="module-breadcrumb" aria-label="مسیر صفحه">
        <a href="#modules" onClick={event => { event.preventDefault(); onReturnToModules(); }}>همه‌ی ماژول‌ها</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{module.title}</span>
      </nav>

      <section className="module-page-hero">
        <div className="module-page-copy">
          <div className="module-page-kicker">
            <span className="module-page-icon"><ModuleMark icon={module.icon} /></span>
            <span>ماژول {toPersianNumber(index + 1)} از {toPersianNumber(productModules.length)}</span>
          </div>
          <h1 id="module-page-title" ref={heading} tabIndex={-1}>{module.title}</h1>
          <p>{module.description}</p>
          <a className="module-page-primary" href={`/hesab${details.entryPath}`}>
            {details.entryLabel}<span aria-hidden="true">↗</span>
          </a>
        </div>

        <div className="module-route-card" aria-label={`مسیر کلی ${module.title}`}>
          <p>از کار روزانه تا نتیجه</p>
          <div className="module-route-steps">
            {module.flow.map((step, stepIndex) => <div className="module-route-step" key={step}>
              <span>{toPersianNumber(stepIndex + 1)}</span>
              <strong>{step}</strong>
            </div>)}
          </div>
        </div>
      </section>

      <section className="module-page-section" aria-labelledby="module-capabilities-title">
        <div className="module-section-heading">
          <p>قابلیت‌ها</p>
          <h2 id="module-capabilities-title">با این بخش چه کار می‌کنی؟</h2>
        </div>
        <ul className="module-capability-list">
          {module.features.map((feature, featureIndex) => <li key={feature}>
            <span>{toPersianNumber(featureIndex + 1)}</span>
            <p>{feature}</p>
          </li>)}
        </ul>
      </section>

      <section className="module-page-section" aria-labelledby="module-records-title">
        <div className="module-section-heading">
          <p>اسناد و پرونده‌ها</p>
          <h2 id="module-records-title">چه چیزهایی اینجا ثبت می‌شود؟</h2>
        </div>
        <div className="module-record-grid">
          {details.records.map(record => <article className="module-record" key={record.source || record.label}>
            {record.path ? <a href={`/hesab${record.path}`}>{record.label}<span aria-hidden="true">↗</span></a> : <h3>{record.label}</h3>}
            {record.source && <p>{record.source}</p>}
          </article>)}
        </div>
      </section>

      <section className="module-boundary" aria-labelledby="module-boundary-title">
        <div>
          <p>ارتباط با بخش‌های دیگر</p>
          <h2 id="module-boundary-title">مرز این ماژول کجاست؟</h2>
          <p className="module-boundary-copy">{details.boundary}</p>
        </div>
        <nav className="module-related" aria-label="ماژول‌های مرتبط">
          {relatedModules.map(related => <a key={related.id} href={`#module/${related.id}`} onClick={event => {
            event.preventDefault();
            onOpenModule(related.id);
          }}>{related.title}<span aria-hidden="true">←</span></a>)}
        </nav>
      </section>

      <p className="module-page-note">این صفحه معرفی قابلیت‌ها و مسیرهاست، نه داده‌ی واقعی شرکت شما. نمایش هر سند پس از ورود و بر اساس نصب، تنظیمات و سطح دسترسی انجام می‌شود.</p>
      <footer className="module-page-footer">
        <button className="module-page-back" type="button" onClick={onReturnToModules}>← برگشت به همه‌ی ۱۵ ماژول</button>
        <span>آسومی · به‌سوی آینده‌ی روشن</span>
      </footer>
    </div>
  </main>;
}
