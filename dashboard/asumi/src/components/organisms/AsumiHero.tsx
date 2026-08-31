import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { BrandLockup } from '../molecules/BrandLockup';
import { HybridHorizonScene } from '../molecules/HybridHorizonScene';
import { usePointerParallax } from '../../hooks/usePointerParallax';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AsumiHeader } from './AsumiHeader';

type AsumiHeroProps = {
	active?: boolean;
};

export function AsumiHero({ active = true }: AsumiHeroProps) {
	const heroRef = useRef<HTMLElement>(null);
	const reducedMotion = useReducedMotion();
	const [compactHeader, setCompactHeader] = useState(false);
	const { enabled, onPointerMove } = usePointerParallax(heroRef, reducedMotion);

	useEffect(() => {
		const updateHeader = () => setCompactHeader(window.scrollY > 80);
		updateHeader();
		window.addEventListener('scroll', updateHeader, { passive: true });
		return () => window.removeEventListener('scroll', updateHeader);
	}, []);

	useEffect(() => {
		const hero = heroRef.current;
		if (!hero || reducedMotion || !active) return;
		const context = gsap.context(() => {
			gsap.timeline()
				.fromTo('[data-sun]', { opacity: 0, scaleX: 0.08 }, { opacity: 1, scaleX: 1, duration: 0.55, ease: 'power3.out' }, 0.3)
				.fromTo('[data-lens-flare]', { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out' }, 0.72)
				.fromTo('[data-wordmark]', { opacity: 0, letterSpacing: '0.78em', filter: 'blur(13px)', y: 10 }, { opacity: 1, letterSpacing: '0.42em', filter: 'blur(0px)', y: 0, duration: 0.85, ease: 'power3.out' }, 1.1)
				.fromTo('[data-kanji]', { opacity: 0, y: 9, filter: 'blur(7px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.48, ease: 'power2.out' }, 1.4)
				.fromTo('[data-copy]', { opacity: 0, y: 9, filter: 'blur(7px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, stagger: 0.2, ease: 'power2.out' }, 1.7)
				.fromTo('[data-wave]', { opacity: 0 }, { opacity: 1, duration: 0.85, ease: 'power2.out' }, 2.1)
				.to('[data-particle]', { opacity: 1, duration: 0.55, stagger: 0.02 }, 2.5);
			gsap.to('[data-wave]', { y: -7, duration: 8, yoyo: true, repeat: -1, stagger: 0.35, ease: 'sine.inOut' });
		}, hero);
		return () => context.revert();
	}, [active, reducedMotion]);

	return (
		<section className="asumi-hero" data-active={active ? 'true' : 'false'} data-intro-complete={reducedMotion ? 'true' : 'false'} data-parallax={enabled && active ? 'on' : 'off'} data-testid="asumi-hero" onPointerMove={onPointerMove} ref={heroRef}>
			<AsumiHeader compact={compactHeader} />
			<div className="asumi-hero__scene"><HybridHorizonScene active={active} reducedMotion={reducedMotion} /></div>
			<div className="asumi-hero__content">
				<BrandLockup />
			</div>
		</section>
	);
}
