import { useEffect, useRef, useState } from 'react';
import { AsumiButton } from '../../components/atoms/AsumiButton';
import { SiteFooter } from '../../components/site/SiteFooter';
import { SiteHeader } from '../../components/site/SiteHeader';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useStoryProgress } from '../../story/useStoryProgress';
import { productModuleDetails } from '../moduleDetails';
import { ProcurementEvidenceScene } from './ProcurementEvidenceScene';
import { ProcurementProductGuide } from './ProcurementProductGuide';
import { procurementChapters } from './storyData';
import './procurement-story.css';

type ProcurementStoryProps = {
	onOpenModule: (moduleId: string) => void;
	onReturnToModules: () => void;
	onOpenPricing: () => void;
};

function toPersianDigits(value: number | string) {
	return String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

export function ProcurementStory({ onOpenModule, onReturnToModules, onOpenPricing }: ProcurementStoryProps) {
	const systemReducedMotion = useReducedMotion();
	const [motionChoice, setMotionChoice] = useState<boolean | null>(null);
	const reducedMotion = motionChoice ?? systemReducedMotion;
	const { root, chapter: stage } = useStoryProgress(reducedMotion);
	const heading = useRef<HTMLHeadingElement>(null);
	const details = productModuleDetails.procurement;

	useEffect(() => {
		if (window.scrollY > 0) {
			document.documentElement.scrollTop = 0;
			document.body.scrollTop = 0;
		}
		heading.current?.focus({ preventScroll: true });
	}, []);

	const scrollTo = (id: string) => {
		const chapterIndex = procurementChapters.findIndex(item => item.id === id);
		if (chapterIndex >= 0 && root.current) {
			const bounds = root.current.getBoundingClientRect();
			const rootDocumentTop = bounds.top + window.scrollY;
			const scrollRange = Math.max(0, bounds.height - window.innerHeight);
			const progress = chapterIndex / (procurementChapters.length - 1);
			window.scrollTo({ top: rootDocumentTop + scrollRange * progress, behavior: reducedMotion ? 'auto' : 'smooth' });
			return;
		}
		document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
	};

	return <main className="asumi-story procurement-story" data-stage={stage} data-theme-phase={stage === 5 ? 'bright' : 'dark'} data-reduced-motion={reducedMotion} aria-labelledby="purchase-need-title">
		<a className="skip-story" href="#purchase-handoff" onClick={event => { event.preventDefault(); scrollTo('purchase-handoff'); }}>رفتن مستقیم به امکانات خرید</a>
		<SiteHeader variant="story" className="procurement-story-header" description="روایت ماژول خرید و تدارکات" onOpenPricing={onOpenPricing} onReturnToModules={onReturnToModules} entryHref={`/hesab${details.entryPath}`} entryLabel="ورود به مرکز خرید" actions={<AsumiButton className="motion-control procurement-motion-control" onClick={() => setMotionChoice(!reducedMotion)} aria-pressed={reducedMotion} aria-label="کاهش حرکت‌های داستان خرید" title="کاهش حرکت‌های داستان خرید">
			<svg viewBox="0 0 20 20" aria-hidden="true">{reducedMotion ? <path d="M7 4v12M13 4v12" /> : <path d="M2 8c4-9 6 9 10 0s6 1 6 1M2 14c4-9 6 9 10 0s6 1 6 1" />}</svg>
			<span className="motion-label">{reducedMotion ? 'حرکت کمتر' : 'حرکت صحنه'}</span>
		</AsumiButton>} />

		<div className="story-experience procurement-story-experience" ref={root}>
			<div className="story-sticky procurement-story-sticky">
				<div className="case-atmosphere" aria-hidden="true" />
				<div className="scene-frame procurement-scene-frame"><ProcurementEvidenceScene stage={stage} /></div>
				<div className="scene-label procurement-scene-label" aria-hidden="true"><span className="record-dot" />پرونده‌ی خرید · از نیاز تا تطبیق<span className="scene-label-line" /></div>
				<div className="story-bottom procurement-story-bottom">
					<nav className="chapter-nav procurement-chapter-nav" aria-label="مرحله‌های داستان خرید">
						{procurementChapters.map((item, index) => <a key={item.id} href={`#${item.id}`} aria-current={stage === index ? 'step' : undefined} aria-label={`${toPersianDigits(index + 1)}. ${item.label}`} onClick={event => { event.preventDefault(); scrollTo(item.id); }}><span className="chapter-dot" /><span className="chapter-name">{item.label}</span></a>)}
					</nav>
					<span className="scene-caption">روایت نمونه · پیشنهادها و وضعیت‌ها نمایشی‌اند</span>
				</div>
				<div className="story-progress procurement-story-progress" aria-hidden="true" />
			</div>
			<div className="story-copy procurement-story-copy">
				{procurementChapters.map((item, index) => {
					const Heading = index === 0 ? 'h1' : 'h2';
					return <section className="story-chapter procurement-story-chapter" id={item.id} key={item.id} data-active={stage === index} aria-labelledby={`${item.id}-title`} aria-hidden={stage !== index}>
						<div className="chapter-content procurement-chapter-content">
							<p className="chapter-eyebrow procurement-chapter-eyebrow"><span>{toPersianDigits(index + 1)} / ۰۶</span>{item.eyebrow}</p>
							<Heading id={`${item.id}-title`} ref={index === 0 ? heading : undefined} tabIndex={index === 0 ? -1 : undefined} aria-label={item.title.replace('\n', ' ')}>{item.title.split('\n').map(line => <span key={line}>{line}</span>)}</Heading>
							<p className="chapter-description procurement-chapter-description">{item.description}</p>
							<p className="chapter-detail procurement-chapter-detail">{item.detail}</p>
							{index === 0 && <button className="scroll-invitation procurement-scroll-invitation" type="button" onClick={() => scrollTo(procurementChapters[1].id)}><span className="scroll-symbol" aria-hidden="true">↓</span>پایین برو؛ ببین این نیاز چطور به خرید می‌رسد.</button>}
							{index === 5 && <div className="story-cta procurement-story-cta"><a className="primary-cta" href={`/hesab${details.entryPath}`}>ورود به مرکز خرید <span aria-hidden="true">↗</span></a><button className="restart-story" type="button" onClick={() => scrollTo(procurementChapters[0].id)}>روایت را دوباره ببین</button></div>}
						</div>
					</section>;
				})}
			</div>
		</div>

		<ProcurementProductGuide onOpenModule={onOpenModule} onNavigateToSection={scrollTo} onReturnToModules={onReturnToModules} />
		<SiteFooter />
	</main>;
}
