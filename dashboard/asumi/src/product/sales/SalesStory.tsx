import { useEffect, useRef, useState } from 'react';
import { AsumiButton } from '../../components/atoms/AsumiButton';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { BrandSignal } from '../../story/BrandSignal';
import { useStoryProgress } from '../../story/useStoryProgress';
import { productModuleDetails } from '../moduleDetails';
import { salesChapters, salesSample } from './storyData';
import { SalesEvidenceBoard } from './SalesEvidenceBoard';
import { SalesProductGuide } from './SalesProductGuide';
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

		<SalesProductGuide onOpenModule={onOpenModule} onNavigateToSection={scrollTo} onReturnToModules={onReturnToModules} />
	</main>;
}
