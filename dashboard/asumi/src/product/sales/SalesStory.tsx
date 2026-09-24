import { useEffect, useRef, useState } from 'react';
import { AsumiButton } from '../../components/atoms/AsumiButton';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { BrandSignal } from '../../story/BrandSignal';
import { useStoryProgress } from '../../story/useStoryProgress';
import { productModuleDetails } from '../moduleDetails';
import { productModules } from '../modules';
import { salesChapters, salesSample } from './storyData';
import { SalesEvidenceBoard } from './SalesEvidenceBoard';
import './sales-story.css';

type SalesStoryProps = {
	onOpenModule: (moduleId: string) => void;
	onReturnToModules: () => void;
};

function toPersianDigits(value: number | string) {
	return String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

export function SalesStory({ onOpenModule, onReturnToModules }: SalesStoryProps) {
	const systemReducedMotion = useReducedMotion();
	const [motionChoice, setMotionChoice] = useState<boolean | null>(null);
	const reducedMotion = motionChoice ?? systemReducedMotion;
	const { root, motion, chapter: stage } = useStoryProgress(reducedMotion);
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

	return <main className="asumi-story sales-story" data-chapter={stage} data-theme-phase={stage === 5 ? 'bright' : 'dark'} data-reduced-motion={reducedMotion} aria-labelledby="sales-request-title">
		<a className="skip-story" href="#sales-handoff" onClick={event => { event.preventDefault(); scrollTo('sales-handoff'); }}>رفتن مستقیم به معرفی مرکز فروش</a>
		<header className="story-header sales-story-header">
			<a className="story-brand" href="#modules" aria-label="بازگشت به ماژول‌های آسومی" onClick={event => { event.preventDefault(); onReturnToModules(); }}>
				<BrandSignal /><span>آسومی<small>از داده تا تصمیم</small></span>
			</a>
			<p className="header-description">روایت ماژول فروش</p>
			<div className="header-actions">
				<AsumiButton className="motion-control sales-motion-control" onClick={() => setMotionChoice(!reducedMotion)} aria-pressed={reducedMotion} aria-label="کاهش حرکت‌های داستان فروش" title="کاهش حرکت‌های داستان فروش">
					<svg viewBox="0 0 20 20" aria-hidden="true">{reducedMotion ? <path d="M7 4v12M13 4v12" /> : <path d="M2 8c4-9 6 9 10 0s6 1 6 1M2 14c4-9 6 9 10 0s6 1 6 1" />}</svg>
					<span className="motion-label">{reducedMotion ? 'حرکت کمتر' : 'حرکت صحنه'}</span>
				</AsumiButton>
				<a className="login-link" href={`/hesab${details.entryPath}`}>ورود به مرکز فروش <span aria-hidden="true">↗</span></a>
			</div>
		</header>

		<div className="story-experience sales-story-experience" ref={root}>
			<div className="story-sticky sales-story-sticky">
				<div className="case-atmosphere" aria-hidden="true" />
				<div className="scene-frame sales-scene-frame"><SalesEvidenceBoard motion={motion} stage={stage} /></div>
				<div className="scene-label sales-scene-label" aria-hidden="true"><span className="record-dot" />پرونده‌ی فروش · از درخواست تا تحویل<span className="scene-label-line" /></div>
				<div className="story-bottom sales-story-bottom">
					<nav className="chapter-nav sales-chapter-nav" aria-label="مرحله‌های داستان فروش">
						{salesChapters.map((item, index) => <a key={item.id} href={`#${item.id}`} aria-current={stage === index ? 'step' : undefined} aria-label={`${toPersianDigits(index + 1)}. ${item.label}`} onClick={event => { event.preventDefault(); scrollTo(item.id); }}>
							<span className="chapter-dot" /><span className="chapter-name">{item.label}</span>
						</a>)}
					</nav>
					<span className="scene-caption">روایت نمونه · وضعیت‌ها و اعداد نمایشی‌اند</span>
				</div>
				<div className="story-progress sales-story-progress" aria-hidden="true" />
			</div>
			<div className="story-copy sales-story-copy">
				{salesChapters.map((item, index) => {
					const Heading = index === 0 ? 'h1' : 'h2';
					return <section className="story-chapter sales-story-chapter" id={item.id} key={item.id} data-active={stage === index} aria-labelledby={`${item.id}-title`} aria-hidden={stage !== index}>
						<div className="chapter-content sales-chapter-content">
							<p className="chapter-eyebrow sales-chapter-eyebrow"><span>{toPersianDigits(index + 1)} / ۰۶</span>{item.eyebrow}</p>
							<Heading id={`${item.id}-title`} ref={index === 0 ? heading : undefined} tabIndex={index === 0 ? -1 : undefined} aria-label={item.title.replace('\n', ' ')}>{item.title.split('\n').map(line => <span key={line}>{line}</span>)}</Heading>
							<p className="chapter-description sales-chapter-description">{item.description}</p>
							<p className="chapter-detail sales-chapter-detail">{item.detail}</p>
							{index === 0 && <button className="scroll-invitation sales-scroll-invitation" type="button" onClick={() => scrollTo(salesChapters[1].id)}><span className="scroll-symbol" aria-hidden="true">↓</span>پایین برو؛ ببین این درخواست به کجا می‌رسد.</button>}
							{index === 5 && <div className="story-cta sales-story-cta"><a className="primary-cta" href={`/hesab${details.entryPath}`}>ورود به مرکز فروش <span aria-hidden="true">↗</span></a><button className="restart-story" type="button" onClick={() => scrollTo(salesChapters[0].id)}>روایت را دوباره ببین</button></div>}
						</div>
					</section>;
				})}
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
	</main>;
}
