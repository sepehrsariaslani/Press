import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { chapterAt, clamp } from './chapters';

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
      element.style.setProperty('--story-progress', String(p));
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
