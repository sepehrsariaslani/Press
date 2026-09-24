import { useEffect, useRef, useState } from 'react';
import { AsumiButton } from '../../components/atoms/AsumiButton';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useStoryProgress } from '../../story/useStoryProgress';
import { productModuleDetails } from '../moduleDetails';
import { productModules } from '../modules';
import { salesChapters, salesFlow, salesQuote, salesSample, salesSignals } from './storyData';
import './sales-story.css';

type SalesStoryProps = {
	onOpenModule: (moduleId: string) => void;
	onReturnToModules: () => void;
};

function toPersianDigits(value: number | string) {
	return String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

function formatToman(value: number) {
	return `${toPersianDigits(value.toLocaleString('en-US')).replace(/,/g, '٬')} تومان`;
}

function SalesRequestPreview() {
	return (
		<div className="sales-request-scene">
			<div className="sales-inbox" aria-hidden="true">
				<span>درخواست‌های تازه</span>
				<div><i /><i /><i /></div>
				<small>۲ پاسخ در انتظار</small>
			</div>
			<article className="sales-request-card">
				<header><span>درخواست مشتری</span><span>امروز · ۰۹:۴۲</span></header>
				<p>سلام، برای <strong>{toPersianDigits(salesSample.quantity)} عدد {salesSample.product}</strong> قیمت می‌خواستم.</p>
				<footer><span>پیام ورودی</span><strong>فرصت تازه</strong></footer>
			</article>
			<p className="sales-request-note">پاسخ به این درخواست، آغاز یک مسیر است.</p>
		</div>
	);
}

function SalesQuotePreview() {
	return (
		<article className="sales-quote-card" aria-label="پیش‌نمایش نمایشی پیشنهاد قیمت">
			<header className="sales-document-heading">
				<div><span>پیشنهاد فروش · پیش‌نمایش نمونه</span><strong>پیشنهاد قیمت</strong></div>
				<span className="sales-document-state">آماده‌ی ارسال</span>
			</header>
			<div className="sales-quote-customer"><span>مشتری</span><strong>{salesSample.customer}</strong></div>
			<div className="sales-quote-row sales-quote-columns"><span>کالا و تعداد</span><span>قیمت واحد</span><span>تخفیف</span></div>
			<div className="sales-quote-row sales-quote-item"><strong>{salesSample.product} × {toPersianDigits(salesSample.quantity)}</strong><span>{formatToman(salesSample.unitPrice)}</span><span>{toPersianDigits(salesSample.discountPercent)}٪</span></div>
			<div className="sales-quote-total"><span>مبلغ پس از تخفیف</span><strong>{formatToman(salesQuote.total)}</strong></div>
			<footer><span>زمان تحویل</span><strong>{salesSample.deliveryTime}</strong></footer>
		</article>
	);
}

function SalesAcceptancePreview() {
	return (
		<div className="sales-accepted-scene">
			<article className="sales-accepted-card">
				<div className="sales-accepted-mark" aria-hidden="true">✓</div>
				<div><span>پاسخ مشتری</span><strong>پیشنهاد تأیید شد</strong><small>{salesSample.customer} · {salesSample.product}</small></div>
				<strong className="sales-accepted-status">توافق</strong>
			</article>
			<p className="sales-twist">اما هنوز باید جواب چهار سؤال را پیدا کنی:</p>
			<ul className="sales-questions-list">
				<li>موجودی کافی است؟</li><li>چه زمانی تحویل می‌شود؟</li>
				<li>پیش‌پرداخت دریافت شد؟</li><li>پیگیری تیم کامل است؟</li>
			</ul>
		</div>
	);
}

function SalesConnectedPreview() {
	return (
		<section className="sales-connected-card" aria-label="ارتباط سفارش نمونه با بخش‌های دیگر">
			<header><div><span>یک سفارش، چند تیم</span><strong dir="ltr">{salesSample.orderId}</strong></div><span className="sales-sample-badge">نمونه‌ی نمایشی</span></header>
			<div className="sales-connected-list">
				{salesFlow.map(item => <article key={item.id}>
					<div><span>{item.label}</span><strong>{typeof item.value === 'number' ? toPersianDigits(item.value) : item.value}{item.suffix}</strong></div>
					<span className="sales-flow-status">{item.status}</span>
				</article>)}
			</div>
			<p>اطلاعات سفارش یک‌بار وارد می‌شود و هر بخش، سهم خودش را می‌بیند.</p>
		</section>
	);
}

function SalesOrderPreview() {
	return (
		<article className="sales-order-preview" aria-label="پیش‌نمایش نمونه‌ی سفارش فروش در آسومی">
			<header className="sales-order-header">
				<div><span>آسومی / مرکز فروش</span><strong>سفارش فروش</strong></div>
				<span className="sales-sample-badge">محیط نمونه · داده‌ی نمایشی</span>
			</header>
			<div className="sales-order-meta">
				<div><span>شماره سفارش</span><strong dir="ltr">{salesSample.orderId}</strong></div>
				<div><span>وضعیت سفارش</span><strong className="sales-order-approved">تأیید شده</strong></div>
				<div><span>مشتری</span><strong>{salesSample.customer}</strong></div>
				<div><span>زمان تحویل</span><strong>{salesSample.deliveryTime}</strong></div>
			</div>
			<div className="sales-order-line"><span>{salesSample.product} · {toPersianDigits(salesSample.quantity)} عدد</span><strong>{formatToman(salesQuote.total)}</strong></div>
			<div className="sales-order-progress" aria-label="وضعیت نمونه‌ی سفارش">
				<div><span>موجودی</span><strong>{toPersianDigits(salesSample.quantity)} عدد آماده</strong></div>
				<div><span>دریافت</span><strong>{toPersianDigits(salesSample.advancePercent)}٪ پیش‌پرداخت</strong></div>
				<div><span>پیگیری</span><strong>تکمیل شده</strong></div>
			</div>
		</article>
	);
}

function SalesDashboardPreview() {
	return (
		<section className="sales-dashboard-preview" aria-label="نمای نمونه‌ی داشبورد فروش آسومی">
			<header><div><span>آسومی / امور فروش</span><strong>تصویر روشن‌تری از مسیر فروش</strong></div><span className="sales-sample-badge">داده‌ی نمایشی</span></header>
			<div className="sales-dashboard-metrics">
				<article><span>فرصت‌های بدون پیگیری</span><strong>{salesSignals[0].value}</strong><small>زمان پیگیری را از دست نده</small></article>
				<article><span>سفارش‌های در انتظار موجودی</span><strong>{salesSignals[2].value}</strong><small>تحویل‌های در معرض تأخیر</small></article>
				<article><span>فروش مشتریان قبلی</span><strong>{salesSignals[1].value} کمتر</strong><small>نیازمند بررسی دوباره</small></article>
			</div>
			<p className="sales-dashboard-insight">آسومی فقط نمی‌گوید چقدر فروختی؛ نشان می‌دهد کجا فرصت رشد داری.</p>
		</section>
	);
}

function SalesScene({ stage }: { stage: number }) {
	const chapter = salesChapters[stage];
	return (
		<div className="sales-scene" data-stage={stage} role="group" aria-label={`نمای تصویری: ${chapter.label}`}>
			<div className="sales-scene-layer" aria-hidden={stage !== 0}><SalesRequestPreview /></div>
			<div className="sales-scene-layer" aria-hidden={stage !== 1}><SalesQuotePreview /></div>
			<div className="sales-scene-layer" aria-hidden={stage !== 2}><SalesAcceptancePreview /></div>
			<div className="sales-scene-layer" aria-hidden={stage !== 3}><SalesConnectedPreview /></div>
			<div className="sales-scene-layer" aria-hidden={stage !== 4}><SalesOrderPreview /></div>
			<div className="sales-scene-layer" aria-hidden={stage !== 5}><SalesDashboardPreview /></div>
			<p className="sales-scene-caption" aria-hidden="true">پرونده‌ی فروش · {chapter.label}</p>
		</div>
	);
}

export function SalesStory({ onOpenModule, onReturnToModules }: SalesStoryProps) {
	const systemReducedMotion = useReducedMotion();
	const [motionChoice, setMotionChoice] = useState<boolean | null>(null);
	const reducedMotion = motionChoice ?? systemReducedMotion;
	const { root, chapter: stage } = useStoryProgress(reducedMotion);
	const heading = useRef<HTMLHeadingElement>(null);
	const details = productModuleDetails.sales;
	const salesModule = productModules.find(module => module.id === 'sales')!;
	const relatedModules = details.relatedIds
		.map(id => productModules.find(module => module.id === id))
		.filter((module): module is (typeof productModules)[number] => Boolean(module));

	useEffect(() => {
		if (window.scrollY > 0) {
			document.documentElement.scrollTop = 0;
			document.body.scrollTop = 0;
		}
		heading.current?.focus({ preventScroll: true });
	}, []);

	const scrollTo = (id: string) => {
		const chapterIndex = salesChapters.findIndex(item => item.id === id);
		if (chapterIndex >= 0 && root.current) {
			const bounds = root.current.getBoundingClientRect();
			const rootDocumentTop = bounds.top + window.scrollY;
			const scrollRange = Math.max(0, bounds.height - window.innerHeight);
			const progress = chapterIndex / (salesChapters.length - 1);
			window.scrollTo({ top: rootDocumentTop + scrollRange * progress, behavior: reducedMotion ? 'auto' : 'smooth' });
			return;
		}
		document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
	};

	return (
		<main className="sales-story" data-chapter={stage} data-theme-phase={stage === 5 ? 'bright' : 'dark'} data-reduced-motion={reducedMotion} aria-labelledby="sales-request-title">
			<a className="sales-skip-story" href="#sales-handoff" onClick={event => { event.preventDefault(); scrollTo('sales-handoff'); }}>رفتن مستقیم به معرفی مرکز فروش</a>
			<header className="module-page-header sales-story-header">
				<a className="module-page-brand" href="#modules" aria-label="بازگشت به ماژول‌های آسومی" onClick={event => { event.preventDefault(); onReturnToModules(); }}>
					<span className="brand-signal" aria-hidden="true"><i /><i /><i /></span>
					<span>آسومی<small>از داده تا تصمیم</small></span>
				</a>
				<div className="sales-header-actions">
					<AsumiButton className="sales-motion-control" onClick={() => setMotionChoice(!reducedMotion)} aria-pressed={reducedMotion} aria-label="کاهش حرکت‌های داستان فروش">
						<span>{reducedMotion ? 'حرکت کمتر' : 'حرکت داستان'}</span>
					</AsumiButton>
					<a className="module-page-login" href={`/hesab${details.entryPath}`}>ورود به مرکز فروش <span aria-hidden="true">↗</span></a>
				</div>
			</header>

			<div className="sales-story-experience" ref={root}>
				<div className="sales-story-sticky">
					<div className="sales-atmosphere" aria-hidden="true" />
					<div className="sales-scene-frame"><SalesScene stage={stage} /></div>
					<nav className="sales-stage-nav" aria-label="مرحله‌های داستان فروش">
						{salesChapters.map((item, index) => <button className="sales-stage-button" key={item.id} type="button" aria-current={stage === index ? 'step' : undefined} aria-label={`${toPersianDigits(index + 1)}. ${item.label}`} onClick={() => scrollTo(item.id)}>
							<span className="sales-stage-dot" aria-hidden="true" />
							<span className="sales-stage-name">{item.label}</span>
						</button>)}
					</nav>
					<span className="sales-sample-caption">روایت نمونه · مسیر سفارش مشتری</span>
					<div className="sales-story-progress" aria-hidden="true" />
					<div className="sales-story-copy">
						{salesChapters.map((item, index) => {
							const Heading = index === 0 ? 'h1' : 'h2';
							return <section className="sales-story-chapter" id={item.id} key={item.id} data-active={stage === index} aria-labelledby={`${item.id}-title`} aria-hidden={stage !== index}>
								<div className="sales-chapter-content">
									<p className="sales-chapter-eyebrow"><span>{toPersianDigits(index + 1)} / ۰۶</span>{item.eyebrow}</p>
									<Heading id={`${item.id}-title`} ref={index === 0 ? heading : undefined} tabIndex={index === 0 ? -1 : undefined} aria-label={item.title.replace('\n', ' ')}>{item.title.split('\n').map(line => <span key={line}>{line}</span>)}</Heading>
									<p className="sales-chapter-description">{item.description}</p>
									<p className="sales-chapter-detail">{item.detail}</p>
									{index === 0 && <button className="sales-scroll-invitation" type="button" onClick={() => scrollTo(salesChapters[1].id)}><span aria-hidden="true">↓</span>پایین برو؛ مسیر را دنبال کن</button>}
									{index === 5 && <div className="sales-story-cta"><a className="primary-cta" href={`/hesab${details.entryPath}`}>ورود به مرکز فروش <span aria-hidden="true">↗</span></a><button className="sales-replay-link" type="button" onClick={() => scrollTo(salesChapters[0].id)}>روایت را دوباره ببین</button></div>}
								</div>
							</section>;
						})}
					</div>
				</div>
			</div>

			<section className="sales-handoff" id="sales-handoff" aria-labelledby="sales-handoff-title">
				<div className="sales-handoff-inner">
					<div className="sales-handoff-heading">
						<p>از روایت تا کار روزانه</p>
						<h2 id="sales-handoff-title">هر سفارش، از گفت‌وگو تا وصول.</h2>
						<span>مسیر را در یک گردش کار ببین؛ جزئیات هر بخش به نصب، تنظیمات و سطح دسترسی شرکت بستگی دارد.</span>
					</div>
					<ul className="sales-capability-list">
						{salesModule.features.map((feature, index) => <li key={feature}><span>{toPersianDigits(index + 1)}</span>{feature}</li>)}
					</ul>
					<div className="sales-handoff-section-heading"><p>اسناد مسیر فروش</p><h3>این جریان با کدام سندها پیش می‌رود؟</h3></div>
					<div className="sales-handoff-records">
						{details.records.map(record => <div className="sales-handoff-record" key={record.source ?? record.label}><span>{record.label}</span>{record.source && <small>{record.source}</small>}</div>)}
					</div>
					<p className="sales-handoff-boundary"><strong>ارتباط با CRM</strong>{details.boundary}</p>
					<div className="sales-pathways" aria-labelledby="sales-pathways-title">
						<div className="sales-handoff-section-heading"><p>مسیر خودت را انتخاب کن</p><h3 id="sales-pathways-title">در فروش، چه چیزی برایت مهم‌تر است؟</h3></div>
						<div className="sales-pathway-grid">
							<a href={`/hesab${productModuleDetails.crm.entryPath}`}><span>مشتری و فرصت‌ها</span><strong>بازکردن قیف CRM <span aria-hidden="true">↗</span></strong></a>
							<a href={`/hesab${details.entryPath}`}><span>قیمت و سفارش</span><strong>رفتن به مرکز فروش <span aria-hidden="true">↗</span></strong></a>
							<div><span>تحویل و وصول</span><strong><a href={`/hesab${productModuleDetails.inventory.entryPath}`}>انبار <span aria-hidden="true">↗</span></a><a href={`/hesab${productModuleDetails.finance.entryPath}`}>مالی <span aria-hidden="true">↗</span></a></strong></div>
							<a href={`/hesab${productModuleDetails.growth.entryPath}`}><span>تحلیل و رشد</span><strong>بازاریابی و رشد <span aria-hidden="true">↗</span></strong></a>
						</div>
					</div>
					<p className="sales-handoff-note">این صفحه برای نمایش مسیر از داده‌های نمونه استفاده می‌کند؛ اعداد و وضعیت‌ها، اطلاعات زنده‌ی شرکت شما نیستند.</p>
					<div className="sales-handoff-footer">
						<nav className="sales-related-modules" aria-label="ماژول‌های مرتبط با فروش">
							{relatedModules.map(module => <a href={`#module/${module.id}`} key={module.id} onClick={event => { event.preventDefault(); onOpenModule(module.id); }}>{module.title}<span aria-hidden="true">←</span></a>)}
						</nav>
						<a className="sales-handoff-cta" href={`/hesab${details.entryPath}`}>{details.entryLabel}<span aria-hidden="true">↗</span></a>
					</div>
					<button className="sales-back-to-modules" type="button" onClick={onReturnToModules}>← بازگشت به همه‌ی ۱۵ ماژول</button>
				</div>
			</section>
		</main>
	);
}
