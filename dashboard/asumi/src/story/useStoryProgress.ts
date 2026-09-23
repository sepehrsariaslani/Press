import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { chapterAt, clamp, lerp, transition } from './chapters';

export type StoryMotion = { progress: number; reducedMotion: boolean; invalidate?: () => void };
export type MotionRef = RefObject<StoryMotion>;

export function useStoryProgress(reducedMotion: boolean) {
  const root = useRef<HTMLElement>(null);
  const motion = useRef<StoryMotion>({ progress: 0, reducedMotion });
  const [chapter, setChapter] = useState(0);
  useEffect(() => {
    motion.current.reducedMotion = reducedMotion;
    motion.current.invalidate?.();
  }, [reducedMotion]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const bounds = element.getBoundingClientRect();
      const p = clamp(-bounds.top / Math.max(1, bounds.height - window.innerHeight));
      motion.current.progress = p;
      motion.current.invalidate?.();
      setChapter(chapterAt(p));
      const light = transition(.24, .68, p);
      const dark = [19, 28, 26], bright = [247, 243, 232];
      const rgb = dark.map((v, i) => Math.round(lerp(v, bright[i], light)));
      element.style.setProperty('--story-background', rgb.join(' '));
      // Keep small Persian copy legible even while the background crosses mid-grey.
      const luminance = rgb.reduce((total, value, i) => {
        const channel = value / 255;
        return total + (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][i];
      }, 0);
      for (const variable of ['--ink', '--muted', '--accent']) {
        if (light > .10 && light < .88) element.style.setProperty(variable, luminance > .179 ? '#000000' : '#ffffff');
        else element.style.removeProperty(variable);
      }
      element.style.setProperty('--story-sun', String(transition(.12, .9, p)));
      element.style.setProperty('--story-progress', String(p));
      element.dataset.light = String(p > .48);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : undefined;
    observer?.observe(element);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);
  return { root, motion, chapter };
}
