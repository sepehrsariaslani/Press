import { Component, Suspense, lazy, useState } from 'react';
import type { ReactNode } from 'react';
import { AsumiButton } from '../components/atoms/AsumiButton';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { chapters } from './chapters';
import { useStoryProgress } from './useStoryProgress';

const OfficeCanvas = lazy(() => import('./scene/OfficeCanvas'));
const poster = new URL('./assets/office-poster.png', import.meta.url).href;

function Sun({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M7 27a13 13 0 0 1 26 0M3 31h34M10 36h20M20 3v5M5.2 9.2l3.6 3.6M34.8 9.2l-3.6 3.6M1 22h5M34 22h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>;
}

function Poster({ failed = false }: { failed?: boolean }) {
  return <div className="story-poster">
    <img src={poster} alt="شخصیت آسومی با لباس سبز مریم‌گلی، روی صندلی کرم در فضایی آرام" width="1100" height="1000" />
    {failed && <p className="scene-fallback-note">نمای ساده · داستان با اسکرول ادامه دارد</p>}
  </div>;
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Poster failed /> : this.props.children; }
}

export function StoryLanding() {
  const systemReduced = useReducedMotion();
  const [motionChoice, setMotionChoice] = useState<boolean | null>(null);
  const reducedMotion = motionChoice ?? systemReduced;
  const { root, motion, chapter } = useStoryProgress(reducedMotion);
  return <main ref={root} className="asumi-story" data-chapter={chapter} data-reduced-motion={reducedMotion}>
    <a className="skip-story" href="#calm">رفتن به معرفی آسومی</a>
    <div className="story-sticky">
      <div className="morning-glow" aria-hidden="true" />
      <div className="window-light" aria-hidden="true" />
      <header className="story-header">
        <a className="story-brand" href="#chaos" aria-label="آسومی؛ ابتدای داستان"><Sun /><span>آسومی<small>آینده‌ای روشن</small></span></a>
        <p className="header-description">حسابداری و مدیریت کسب‌وکار</p>
        <div className="header-actions">
          <AsumiButton className="motion-control" onClick={() => setMotionChoice(!reducedMotion)} aria-pressed={reducedMotion} aria-label="کاهش حرکت‌های صحنه" title="کاهش حرکت‌های صحنه">
            <span aria-hidden="true">{reducedMotion ? 'Ⅱ' : '≈'}</span><span className="motion-label">{reducedMotion ? 'حرکت کمتر' : 'حرکت صحنه'}</span>
          </AsumiButton>
          <a className="login-link" href="/hesab">ورود به آسومی <span aria-hidden="true">↗</span></a>
        </div>
      </header>
      <div className="scene-frame">
        <SceneBoundary><Suspense fallback={<Poster />}><OfficeCanvas motion={motion} poster={<Poster />} /></Suspense></SceneBoundary>
      </div>
      <div className="scene-annotation" data-visible={chapter === 3} aria-hidden={chapter !== 3}>
        <span className="annotation-icon" aria-hidden="true">!</span><div><strong>یک قدم جلوتر</strong><p>۳ فاکتور، فردا سررسید می‌شوند.</p><small>زمان خوبی برای پیگیری دریافت‌هاست.</small></div>
      </div>
      <div className="automation-status" data-visible={chapter === 4} aria-hidden={chapter !== 4}>
        {['فاکتور ثبت شد', 'موجودی به‌روز شد', 'یادآوری آماده شد'].map((label, i) => <div key={label} style={{ '--task-index': i } as React.CSSProperties}><span aria-hidden="true">✓</span>{label}</div>)}
      </div>
      <div className="calm-note" data-visible={chapter === 5} aria-hidden={chapter !== 5}><Sun /><span>امروز، با خیال آسوده‌تر.</span></div>
      <div className="story-bottom">
        <nav className="chapter-nav" aria-label="مراحل داستان آسومی">{chapters.map((item, i) => <a key={item.id} href={`#${item.id}`} aria-current={chapter === i ? 'step' : undefined} aria-label={`${i + 1}. ${item.label}`}><span className="chapter-dot" /><span className="chapter-name">{item.label}</span></a>)}</nav>
        <span className="scene-caption">روایتی از تجربه‌ی آسومی · داده‌های نمایشی</span>
      </div>
      <div className="story-progress" aria-hidden="true" />
    </div>
    <div className="story-copy">
      {chapters.map((item, i) => {
        const Heading = i === 0 ? 'h1' : 'h2';
        return <section key={item.id} id={item.id} className="story-chapter" aria-labelledby={`${item.id}-title`} data-active={chapter === i}>
          <div className="chapter-content">
            <p className="chapter-eyebrow"><span>{String(i + 1).replace(/\d/g, n => '۰۱۲۳۴۵۶۷۸۹'[+n])} / ۰۶</span>{item.eyebrow}</p>
            <Heading id={`${item.id}-title`}>{item.title.split('\n').map(line => <span key={line}>{line}</span>)}</Heading>
            <p className="chapter-description">{item.description}</p>
            <p className="chapter-detail">{item.detail}</p>
            {i === 0 && <a className="scroll-invitation" href="#order"><span className="scroll-symbol" aria-hidden="true">↓</span>آرام اسکرول کن؛ ببین چه می‌شود.</a>}
            {i === 5 && <div className="story-cta"><a className="primary-cta" href="/hesab">آسومی را ببین <span aria-hidden="true">↗</span></a><a className="restart-story" href="#chaos">یک بار دیگر، از ابتدا</a></div>}
          </div>
        </section>;
      })}
    </div>
  </main>;
}
