import { useState } from 'react';
import { AsumiButton } from '../components/atoms/AsumiButton';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { chapters } from './chapters';
import { useStoryProgress } from './useStoryProgress';
import { CaseBoard } from './board/CaseBoard';

function BrandSignal() {
  return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M7 14V7h7M26 7h7v7M33 26v7h-7M14 33H7v-7M12 27l8-13 8 9" stroke="currentColor" strokeWidth="1.6" /><circle cx="20" cy="14" r="3" fill="currentColor" /><circle cx="28" cy="23" r="2" fill="currentColor" /></svg>;
}

export function StoryLanding() {
  const systemReduced = useReducedMotion();
  const [motionChoice, setMotionChoice] = useState<boolean | null>(null);
  const reducedMotion = motionChoice ?? systemReduced;
  const { root, motion, chapter } = useStoryProgress(reducedMotion);
  return <main ref={root} className="asumi-story" data-chapter={chapter} data-reduced-motion={reducedMotion}>
    <a className="skip-story" href="#calm">رفتن به معرفی آسومی</a>
    <header className="story-header">
        <a className="story-brand" href="#chaos" aria-label="آسومی؛ ابتدای داستان"><BrandSignal /><span>آسومی<small>از داده تا تصمیم</small></span></a>
        <p className="header-description">حسابداری و مدیریت کسب‌وکار</p>
        <div className="header-actions">
          <AsumiButton className="motion-control" onClick={() => setMotionChoice(!reducedMotion)} aria-pressed={reducedMotion} aria-label="کاهش حرکت‌های صحنه" title="کاهش حرکت‌های صحنه">
            <svg viewBox="0 0 20 20" aria-hidden="true">{reducedMotion ? <path d="M7 4v12M13 4v12" /> : <path d="M2 8c4-9 6 9 10 0s6 1 6 1M2 14c4-9 6 9 10 0s6 1 6 1" />}</svg>
            <span className="motion-label">{reducedMotion ? 'حرکت کمتر' : 'حرکت صحنه'}</span>
          </AsumiButton>
          <a className="login-link" href="/hesab">ورود به آسومی <span aria-hidden="true">↗</span></a>
        </div>
    </header>
    <div className="story-sticky">
      <div className="case-atmosphere" aria-hidden="true" />
      <div className="scene-frame"><CaseBoard motion={motion} /></div>
      <div className="scene-label" aria-hidden="true"><span className="record-dot" />{['در جست‌وجوی سرنخ', 'اسناد، کنار هم', 'ارتباط‌ها پیدا شدند', 'تصویر، روشن شد', 'مسیر در حال آشکارشدن', 'مقصد، مشخص است'][chapter]}<span className="scene-label-line" /></div>
      <div className="story-bottom">
        <nav className="chapter-nav" aria-label="مراحل داستان آسومی">{chapters.map((item, index) => <a key={item.id} href={`#${item.id}`} aria-current={chapter === index ? 'step' : undefined} aria-label={`${index + 1}. ${item.label}`}><span className="chapter-dot" /><span className="chapter-name">{item.label}</span></a>)}</nav>
        <span className="scene-caption">نمونه‌ی روایی · داده‌ها و مسیر پیشنهادی، نمایشی‌اند</span>
      </div>
      <div className="story-progress" aria-hidden="true" />
    </div>
    <div className="story-copy">
      {chapters.map((item, index) => {
        const Heading = index === 0 ? 'h1' : 'h2';
        return <section key={item.id} id={item.id} className="story-chapter" aria-labelledby={`${item.id}-title`} data-active={chapter === index}>
          <div className="chapter-content">
            <p className="chapter-eyebrow"><span>{String(index + 1).replace(/\d/g, number => '۰۱۲۳۴۵۶۷۸۹'[+number])} / ۰۶</span>{item.eyebrow}</p>
            <Heading id={`${item.id}-title`}>{item.title.split('\n').map(line => <span key={line}>{line}</span>)}</Heading>
            <p className="chapter-description">{item.description}</p>
            <p className={`chapter-detail ${index === 0 ? 'flashlight-hint' : ''}`}>{item.detail}</p>
            {index === 0 && <a className="scroll-invitation" href="#order"><span className="scroll-symbol" aria-hidden="true">↓</span>اسکرول کن؛ سرنخ‌ها را به هم برسان.</a>}
            {index === 5 && <div className="story-cta"><a className="primary-cta" href="/hesab">آسومی را ببین <span aria-hidden="true">↗</span></a><a className="restart-story" href="#chaos">پرونده را از ابتدا ببین</a></div>}
          </div>
        </section>;
      })}
    </div>
  </main>;
}
