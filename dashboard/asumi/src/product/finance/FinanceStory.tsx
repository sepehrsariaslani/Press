import { useEffect, useRef, useState } from 'react';
import { AsumiButton } from '../../components/atoms/AsumiButton';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { DocumentFace } from '../../story/board/EvidencePaper';
import { useStoryProgress } from '../../story/useStoryProgress';
import { productModuleDetails } from '../moduleDetails';
import { productModules } from '../modules';
import {
	financeCategories,
	financeChapters,
	financePaperEvidence,
	financeProfit,
	financeProfitDrivers,
	financeQuestions,
	financeSample,
	financeTimeline,
} from './storyData';
import './finance-story.css';

type FinanceStoryProps = {
	onOpenModule: (moduleId: string) => void;
	onReturnToModules: () => void;
};

function toPersianDigits(value: number | string) {
	return String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

function FinancePaperField() {
	return (
		<svg className="finance-paper-field" viewBox="0 0 1000 760" aria-hidden="true">
			{financePaperEvidence.map((item, index) => {
				const [x, y, angle] = item.scattered;
				return (
					<g className="finance-paper-sheet" key={item.tag} transform={`translate(${x} ${y}) rotate(${angle})`}>
						<rect className="paper-body" x={-item.width / 2} y={-item.height / 2} width={item.width} height={item.height} rx="1.5" fill="#e9e5dc" />
						<g className="evidence-document"><DocumentFace item={item} index={index} /></g>
						<path className="paper-fold" d={`M${item.width / 2 - 15} ${item.height / 2} l15 -15 v15Z`} />
					</g>
				);
			})}
		</svg>
	);
}

function FinanceTimeline({ selectedEvent, onSelectEvent }: { selectedEvent: number; onSelectEvent: (index: number) => void }) {
	const activeEvent = financeTimeline[selectedEvent];
	return (
		<div className="finance-scene-panel finance-timeline-panel" aria-hidden="false">
			<div className="finance-panel-heading">
				<span>مسیر یک رویداد</span>
				<strong>یک فاکتور؛ چهار ردّ قابل‌پیگیری</strong>
			</div>
			<div className="finance-event-list" role="group" aria-label="مراحل ردیابی فاکتور نمونه">
				{financeTimeline.map((event, index) => (
					<button
						className="finance-event"
						data-selected={selectedEvent === index}
						key={event.id}
						type="button"
						aria-pressed={selectedEvent === index}
						onClick={() => onSelectEvent(index)}
					>
						<span className="finance-event-time">{event.time}</span>
						<span className="finance-event-node" aria-hidden="true">{toPersianDigits(index + 1)}</span>
						<strong>{event.label}</strong>
						<small>{event.type}</small>
						<em>{event.amount}</em>
					</button>
				))}
			</div>
			<div className="finance-event-detail" aria-live="polite">
				<span>{activeEvent.reference}</span>
				<p>{activeEvent.detail}</p>
			</div>
		</div>
	);
}

function FinanceFormPreview() {
	return (
		<article className="finance-form-preview" aria-label="پیش‌نمایش نمایشی فاکتور فروش آسومی">
			<header className="finance-form-header">
				<div><span>مرکز مالی</span><strong>فاکتور فروش</strong></div>
				<span className="finance-sample-tag">پیش‌نمایش نمایشی</span>
			</header>
			<div className="finance-form-meta">
				<div><span>شماره سند</span><strong dir="ltr">SINV-1405-0142</strong></div>
				<div><span>وضعیت</span><strong className="finance-status-partial">پرداخت جزئی</strong></div>
				<div><span>مشتری</span><strong>مشتری نمونه</strong></div>
				<div><span>تاریخ</span><strong>ماه جاری</strong></div>
			</div>
			<table className="finance-form-table">
				<caption className="finance-visually-hidden">ردیف‌های فاکتور نمونه</caption>
				<thead><tr><th>شرح</th><th>تعداد</th><th>مبلغ</th></tr></thead>
				<tbody><tr><td>خدمات سازمانی</td><td>۱</td><td>۴۸٬۰۰۰٬۰۰۰</td></tr></tbody>
			</table>
			<footer className="finance-form-total">
				<div><span>جمع فاکتور</span><strong>۴۸ میلیون تومان</strong></div>
				<p>۴۰ میلیون دریافت‌شده <span aria-hidden="true">·</span> ۸ میلیون مانده</p>
			</footer>
		</article>
	);
}

function FinanceAnswer({ questionIndex }: { questionIndex: number }) {
	const question = financeQuestions[questionIndex];
	return (
		<article className="finance-answer-card" aria-live="polite">
			<div className="finance-answer-header">
				<span className="finance-answer-mark" aria-hidden="true">?</span>
				<div><small>تحلیل نمونه بر پایه‌ی داده‌های نمایشی</small><strong>{question.label}</strong></div>
			</div>
			<p className="finance-answer-copy">{question.answer}</p>
			<div className="finance-answer-drivers">
				{financeProfitDrivers.map(driver => (
					<div key={driver.id}><span>{driver.label}</span><strong>{driver.symbol}{toPersianDigits(driver.amount)} م</strong></div>
				))}
			</div>
			<p className="finance-answer-takeaway">{question.primaryDriver}</p>
		</article>
	);
}

function FinanceDashboardPreview() {
	return (
		<div className="finance-dashboard-preview" role="group" aria-label="نمای نمونه‌ی داشبورد مالی آسومی">
			<header className="finance-dashboard-topbar">
				<strong>آسومی <span> / </span> امور مالی</strong>
				<span className="finance-sample-tag">محیط نمونه · داده‌ی نمایشی</span>
			</header>
			<div className="finance-dashboard-body">
				<nav className="finance-dashboard-nav" aria-label="بخش‌های نمایشی مرکز مالی">
					<span data-active="true">نمای کلی</span><span>سندها</span><span>بانک</span>
				</nav>
				<div className="finance-dashboard-content">
					<div className="finance-dashboard-title"><span>گزارش ماهانه</span><strong>تصویر مالی کسب‌وکار</strong></div>
					<div className="finance-dashboard-metrics">
						<div><span>سود خالص</span><strong>{toPersianDigits(financeProfit.current)} م</strong><small>۲۵٪ کمتر از ماه قبل</small></div>
						<div><span>فروش</span><strong>{toPersianDigits(financeSample.current.sales)} م</strong><small>این ماه</small></div>
						<div><span>هزینه‌ها</span><strong>{toPersianDigits(financeSample.current.purchases + financeSample.current.payroll + financeSample.current.rent + financeSample.current.returns)} م</strong><small>این ماه</small></div>
					</div>
					<figure className="finance-profit-chart" aria-labelledby="finance-profit-chart-title">
						<figcaption id="finance-profit-chart-title">روند سود خالص <span>· میلیون تومان</span></figcaption>
						<div className="finance-chart-bars" aria-hidden="true">
							<div><i style={{ height: '100%' }} /><span>ماه قبل</span><strong>{toPersianDigits(financeProfit.previous)}</strong></div>
							<div><i style={{ height: `${Math.round(financeProfit.current / financeProfit.previous * 100)}%` }} /><span>این ماه</span><strong>{toPersianDigits(financeProfit.current)}</strong></div>
						</div>
						<p className="finance-visually-hidden">سود خالص از ۲۶۸ به ۲۰۰ میلیون تومان رسیده است.</p>
					</figure>
				</div>
			</div>
		</div>
	);
}

function FinanceScene({ stage, selectedEvent, onSelectEvent, questionIndex }: {
	stage: number;
	selectedEvent: number;
	onSelectEvent: (index: number) => void;
	questionIndex: number;
}) {
	const currentChapter = financeChapters[stage];
	return (
		<div className="finance-scene" data-stage={stage} role="group" aria-label={`نمای تصویری: ${currentChapter.label}`}>
			<div className="finance-dashboard-shadow" aria-hidden="true">
				<div className="finance-shadow-toolbar" /><div className="finance-shadow-kpis"><i /><i /><i /></div>
				<div className="finance-shadow-chart"><i /><i /><i /><i /><i /><i /></div>
			</div>
			<div className="finance-papers"><FinancePaperField /></div>
			<div className="finance-total" aria-hidden={stage > 1}>
				<span>سود خالص · نمونه</span>
				<strong>{toPersianDigits(financeProfit.current)}</strong>
				<small>میلیون تومان</small>
			</div>
			<section className="finance-scene-panel finance-breakdown-panel" aria-hidden={stage !== 1}>
				<div className="finance-panel-heading"><span>این ماه · داده‌ی نمایشی</span><strong>هر بخش از عدد، حالا پیداست</strong></div>
				<div className="finance-breakdown-grid">
					{financeCategories.map(category => (
						<article className="finance-breakdown-item" data-tone={category.tone} key={category.id}>
							<span>{category.label}</span>
							<strong>{category.tone === 'expense' ? '−' : ''}{toPersianDigits(category.value)}</strong>
							<small>{financeSample.unit}</small>
						</article>
					))}
				</div>
				<p className="finance-equation">۴۵۵ فروش − ۲۵۵ هزینه = ۲۰۰ سود خالص</p>
			</section>
			<div className="finance-layer" aria-hidden={stage !== 2}>
				<FinanceTimeline selectedEvent={selectedEvent} onSelectEvent={onSelectEvent} />
			</div>
			<div className="finance-layer" aria-hidden={stage !== 3}><FinanceFormPreview /></div>
			<div className="finance-layer" aria-hidden={stage !== 4}><FinanceAnswer questionIndex={questionIndex} /></div>
			<div className="finance-layer" aria-hidden={stage !== 5}><FinanceDashboardPreview /></div>
			<div className="finance-scene-caption" aria-hidden="true"><span />{currentChapter.label} · پرونده‌ی مالی</div>
		</div>
	);
}

export function FinanceStory({ onOpenModule, onReturnToModules }: FinanceStoryProps) {
	const systemReducedMotion = useReducedMotion();
	const [motionChoice, setMotionChoice] = useState<boolean | null>(null);
	const reducedMotion = motionChoice ?? systemReducedMotion;
	const { root, chapter: stage } = useStoryProgress(reducedMotion);
	const [selectedEvent, setSelectedEvent] = useState(0);
	const [questionIndex, setQuestionIndex] = useState(0);
	const heading = useRef<HTMLHeadingElement>(null);
	const details = productModuleDetails.finance;
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
		const chapterIndex = financeChapters.findIndex(chapter => chapter.id === id);
		if (chapterIndex >= 0 && root.current) {
			const bounds = root.current.getBoundingClientRect();
			const rootDocumentTop = bounds.top + window.scrollY;
			const scrollRange = Math.max(0, bounds.height - window.innerHeight);
			const progress = chapterIndex / (financeChapters.length - 1);
			window.scrollTo({ top: rootDocumentTop + scrollRange * progress, behavior: reducedMotion ? 'auto' : 'smooth' });
			return;
		}
		document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
	};

	return (
		<main className="finance-story" data-chapter={stage} data-theme-phase={stage === 5 ? 'bright' : 'dark'} data-reduced-motion={reducedMotion} aria-labelledby="finance-mystery-title">
			<a className="finance-skip-story" href="#finance-handoff" onClick={event => { event.preventDefault(); scrollTo('finance-handoff'); }}>رفتن مستقیم به معرفی مرکز مالی</a>
			<header className="module-page-header finance-story-header">
				<a className="module-page-brand" href="#modules" aria-label="بازگشت به ماژول‌های آسومی" onClick={event => { event.preventDefault(); onReturnToModules(); }}>
					<span className="brand-signal" aria-hidden="true"><i /><i /><i /></span>
					<span>آسومی<small>از داده تا تصمیم</small></span>
				</a>
				<div className="finance-header-actions">
					<AsumiButton className="finance-motion-control" onClick={() => setMotionChoice(!reducedMotion)} aria-pressed={reducedMotion} aria-label="کاهش حرکت‌های داستان مالی" title="کاهش حرکت‌های داستان مالی">
						<svg viewBox="0 0 20 20" aria-hidden="true">{reducedMotion ? <path d="M7 4v12M13 4v12" /> : <path d="M2 8c4-9 6 9 10 0s6 1 6 1M2 14c4-9 6 9 10 0s6 1 6 1" />}</svg>
						<span>{reducedMotion ? 'حرکت کمتر' : 'حرکت صحنه'}</span>
					</AsumiButton>
					<a className="module-page-login" href={`/hesab${details.entryPath}`}>ورود به مرکز مالی <span aria-hidden="true">↗</span></a>
				</div>
			</header>

			<div className="finance-story-experience" ref={root}>
				<div className="finance-story-sticky">
					<div className="finance-atmosphere" aria-hidden="true" />
					<div className="finance-scene-frame">
						<FinanceScene stage={stage} selectedEvent={selectedEvent} onSelectEvent={setSelectedEvent} questionIndex={questionIndex} />
					</div>
					<nav className="finance-stage-nav" aria-label="مرحله‌های پرونده‌ی مالی">
						{financeChapters.map((item, index) => (
							<button className="finance-stage-button" key={item.id} type="button" aria-current={stage === index ? 'step' : undefined} aria-label={`${toPersianDigits(index + 1)}. ${item.label}`} onClick={() => scrollTo(item.id)}>
								<span className="finance-stage-dot" aria-hidden="true" />
								<span className="finance-stage-name">{item.label}</span>
							</button>
						))}
					</nav>
					<span className="finance-sample-caption">روایت نمایشی · مبلغ‌ها نمونه‌اند</span>
					<div className="finance-story-progress" aria-hidden="true" />
					<div className="finance-story-copy">
						{financeChapters.map((item, index) => {
							const Heading = index === 0 ? 'h1' : 'h2';
							return (
								<section className="finance-story-chapter" id={item.id} key={item.id} data-active={stage === index} aria-labelledby={`${item.id}-title`} aria-hidden={stage !== index}>
									<div className="finance-chapter-content">
										<p className="finance-chapter-eyebrow"><span>{toPersianDigits(index + 1)} / ۰۶</span>{item.eyebrow}</p>
										<Heading id={`${item.id}-title`} ref={index === 0 ? heading : undefined} tabIndex={index === 0 ? -1 : undefined} aria-label={item.title.replace('\n', ' ')}>{item.title.split('\n').map(line => <span key={line}>{line}</span>)}</Heading>
										<p className="finance-chapter-description">{item.description}</p>
										<p className="finance-chapter-detail">{item.detail}</p>
										{index === 0 && <button className="finance-scroll-invitation" type="button" onClick={() => scrollTo(financeChapters[1].id)}><span aria-hidden="true">↓</span>پایین برو؛ عدد را باز کن</button>}
										{index === 4 && <div className="finance-question-picker" role="group" aria-label="یک سؤال برای تحلیل نمونه انتخاب کن">
											{financeQuestions.map((question, questionPosition) => <button className="finance-question-button" type="button" key={question.id} aria-pressed={questionIndex === questionPosition} onClick={() => setQuestionIndex(questionPosition)}>{question.label}</button>)}
										</div>}
										{index === 5 && <div className="finance-story-cta"><a className="primary-cta" href={`/hesab${details.entryPath}`}>ورود به مرکز مالی <span aria-hidden="true">↗</span></a><button className="finance-replay-link" type="button" onClick={() => scrollTo(financeChapters[0].id)}>روایت را دوباره ببین</button></div>}
									</div>
								</section>
							);
						})}
					</div>
				</div>
			</div>

			<section className="finance-handoff" id="finance-handoff" aria-labelledby="finance-handoff-title">
				<div className="finance-handoff-inner">
					<div className="finance-handoff-heading">
						<p>از روایت تا کار روزانه</p>
						<h2 id="finance-handoff-title">اتفاق‌ها را ثبت کن؛ اثرشان را هم ببین.</h2>
						<span>این صحنه با داده‌های نمونه ساخته شده است. در آسومی، اسناد و گزارش‌های واقعی بر اساس دسترسی شرکت نمایش داده می‌شوند.</span>
					</div>
					<ul className="finance-capability-list">
						{productModules[0].features.map((feature, index) => <li key={feature}><span>{toPersianDigits(index + 1)}</span>{feature}</li>)}
					</ul>
					<div className="finance-handoff-records">
						{details.records.map(record => <div className="finance-handoff-record" key={record.source ?? record.label}><span>{record.label}</span>{record.source && <small>{record.source}</small>}</div>)}
					</div>
					<p className="finance-handoff-boundary"><strong>مرز این بخش</strong>{details.boundary}</p>
					<div className="finance-handoff-footer">
						<nav className="finance-related-modules" aria-label="ماژول‌های مرتبط با مالی">
							{relatedModules.map(module => <a href={`#module/${module.id}`} key={module.id} onClick={event => { event.preventDefault(); onOpenModule(module.id); }}>{module.title}<span aria-hidden="true">←</span></a>)}
						</nav>
						<a className="finance-handoff-cta" href={`/hesab${details.entryPath}`}>{details.entryLabel}<span aria-hidden="true">↗</span></a>
					</div>
					<button className="finance-back-to-modules" type="button" onClick={onReturnToModules}>← بازگشت به همه‌ی ۱۵ ماژول</button>
				</div>
			</section>
		</main>
	);
}
