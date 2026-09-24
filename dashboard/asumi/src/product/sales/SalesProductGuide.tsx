import { productModuleDetails } from '../moduleDetails';
import { productModules } from '../modules';
import { salesCapabilities, salesJourney } from './salesProductData';
import './sales-product-guide.css';

type SalesProductGuideProps = {
	onOpenModule: (moduleId: string) => void;
	onNavigateToSection: (id: string) => void;
	onReturnToModules: () => void;
};

function toPersianDigits(value: number) {
	return String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

export function SalesProductGuide({ onOpenModule, onNavigateToSection, onReturnToModules }: SalesProductGuideProps) {
	const details = productModuleDetails.sales;
	const relatedModules = details.relatedIds
		.map(id => productModules.find(module => module.id === id))
		.filter((module): module is (typeof productModules)[number] => Boolean(module));

	return <section className="sales-handoff" id="sales-handoff" aria-labelledby="sales-handoff-title">
		<div className="sales-guide-inner">
			<header className="sales-guide-header">
				<div className="sales-guide-heading">
					<p className="sales-guide-eyebrow">از روایت تا کار روزانه</p>
					<h2 id="sales-handoff-title">هر فرصت، یک مسیر روشن تا تحویل و وصول.</h2>
					<p className="sales-guide-lede">بعد از دیدن داستان سفارش، اینجا ببین در ماژول فروش چه کارهایی انجام می‌دهی؛ از پیش‌فاکتور و سفارش تا آماده‌سازی، تحویل، فاکتور و گزارش.</p>
				</div>
				<nav className="sales-guide-jump" aria-label="بخش‌های معرفی ماژول فروش">
					<a href="#sales-process" onClick={event => { event.preventDefault(); onNavigateToSection('sales-process'); }}>فرایند فروش <span aria-hidden="true">↓</span></a>
					<a href="#sales-capabilities" onClick={event => { event.preventDefault(); onNavigateToSection('sales-capabilities'); }}>امکانات ماژول <span aria-hidden="true">↓</span></a>
					<a href="#sales-connections" onClick={event => { event.preventDefault(); onNavigateToSection('sales-connections'); }}>ارتباط با بخش‌های دیگر <span aria-hidden="true">↓</span></a>
				</nav>
			</header>

			<section className="sales-guide-section" id="sales-process" aria-labelledby="sales-process-title">
				<div className="sales-guide-section-heading">
					<p>از درخواست تا نتیجه</p>
					<h3 id="sales-process-title">مسیر یک فروش، قدم‌به‌قدم</h3>
					<span>هر مرحله، سند و مسئولیت روشن خودش را دارد؛ لازم نیست برای فهمیدن ادامه‌ی کار حدس بزنی.</span>
				</div>
				<ol className="sales-journey-list">
					{salesJourney.map((step, index) => <li className="sales-journey-step" key={step.id} data-sales-journey-step={step.id}>
						<span className="sales-journey-number" aria-hidden="true">{toPersianDigits(index + 1)}</span>
						<div className="sales-journey-content">
							<h4>{step.title}</h4>
							<p>{step.description}</p>
							<div className="sales-document-tags" aria-label="سندها و بخش‌های مرتبط">
								{step.records.map(record => <span dir="auto" key={record}>{record}</span>)}
							</div>
							<a className="sales-guide-text-link" href={`/hesab${step.path}`}>{step.action}<span aria-hidden="true">↗</span></a>
						</div>
					</li>)}
				</ol>
				<p className="sales-crm-boundary"><strong>مرز CRM و فروش</strong><span>{details.boundary}</span><a href={`/hesab${productModuleDetails.crm.entryPath}`}>بازکردن قیف CRM <span aria-hidden="true">↗</span></a></p>
			</section>

			<section className="sales-guide-section" id="sales-capabilities" aria-labelledby="sales-capabilities-title">
				<div className="sales-guide-section-heading">
					<p>یک مرکز، چند کار روشن</p>
					<h3 id="sales-capabilities-title">امکانات ماژول فروش</h3>
					<span>قابلیت‌ها بر اساس کاری که تیم فروش انجام می‌دهد دسته‌بندی شده‌اند؛ هر مسیر به مرکز مربوط خودش می‌رسد.</span>
				</div>
				<div className="sales-capability-grid">
					{salesCapabilities.map(capability => <article className="sales-capability-card" key={capability.id}>
						<p>{capability.eyebrow}</p>
						<h4>{capability.title}</h4>
						<span className="sales-capability-description">{capability.description}</span>
						<ul>{capability.items.map(item => <li key={item}>{item}</li>)}</ul>
						{capability.note && <small className="sales-capability-note">{capability.note}</small>}
						{capability.path && capability.linkLabel && <a className="sales-guide-text-link" href={`/hesab${capability.path}`}>{capability.linkLabel}<span aria-hidden="true">↗</span></a>}
					</article>)}
				</div>
			</section>

			<section className="sales-guide-section" id="sales-connections" aria-labelledby="sales-connections-title">
				<div className="sales-guide-section-heading">
					<p>فروش تنها نیست</p>
					<h3 id="sales-connections-title">هر بخش، ادامه‌ی طبیعی کار خودش را دارد</h3>
					<span>ارتباط ماژول‌ها کمک می‌کند سفارش از گفت‌وگو تا موجودی و اثر مالی، یک مسیر قابل‌فهم داشته باشد.</span>
				</div>
				<div className="sales-connection-grid">
					<article className="sales-connection-card">
						<span className="sales-connection-index">۰۱</span>
						<h4>CRM · شناخت و پیگیری</h4>
						<p>سرنخ، فرصت و ارتباط با مشتری را در CRM نگه دار؛ وقتی درخواست آماده‌ی قیمت‌گذاری شد، در فروش پیش‌فاکتور بساز.</p>
						<a href={`/hesab${productModuleDetails.crm.entryPath}`}>دیدن سرنخ‌ها در CRM <span aria-hidden="true">↗</span></a>
					</article>
					<article className="sales-connection-card">
						<span className="sales-connection-index">۰۲</span>
						<h4>انبار · موجودی و تحویل</h4>
						<p>برای آماده‌سازی سفارش و ثبت تحویل، گردش کالا با موجودی و عملیات انبار هماهنگ می‌شود.</p>
						<a href={`/hesab${productModuleDetails.inventory.entryPath}`}>رفتن به ماژول انبار <span aria-hidden="true">↗</span></a>
					</article>
					<article className="sales-connection-card">
						<span className="sales-connection-index">۰۳</span>
						<h4>مالی · فاکتور و دریافت</h4>
						<p>فاکتور از مسیر فروش صادر می‌شود؛ ثبت دریافت و اثر نهایی وجه در گردش مالی شرکت دنبال می‌شود.</p>
						<a href={`/hesab${productModuleDetails.finance.entryPath}`}>رفتن به ماژول مالی <span aria-hidden="true">↗</span></a>
					</article>
				</div>
			</section>

			<p className="sales-handoff-note">این روایت و مثال‌ها نمایشی‌اند؛ اعداد و وضعیت‌ها اطلاعات زنده‌ی شرکت شما نیستند. دسترسی و جزئیات هر قابلیت به نصب، تنظیمات، اتصال سرویس‌ها و مجوز کاربر بستگی دارد.</p>
			<footer className="sales-handoff-footer">
				<nav className="sales-related-modules" aria-label="ماژول‌های مرتبط با فروش">
					{relatedModules.map(module => <a href={`#module/${module.id}`} key={module.id} onClick={event => { event.preventDefault(); onOpenModule(module.id); }}>{module.title}<span aria-hidden="true">←</span></a>)}
				</nav>
				<a className="sales-handoff-cta" href={`/hesab${details.entryPath}`}>{details.entryLabel}<span aria-hidden="true">↗</span></a>
			</footer>
			<button className="sales-back-to-modules" type="button" onClick={onReturnToModules}>← بازگشت به همه‌ی ۱۵ ماژول</button>
		</div>
	</section>;
}
