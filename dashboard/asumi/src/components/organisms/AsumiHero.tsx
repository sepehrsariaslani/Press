import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { BrandLockup } from '../molecules/BrandLockup';
import { HybridHorizonScene } from '../molecules/HybridHorizonScene';
import { usePointerParallax } from '../../hooks/usePointerParallax';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AsumiHeader } from './AsumiHeader';

export function AsumiHero() {
	const heroRef = useRef<HTMLElement>(null);
	const reducedMotion = useReducedMotion();
	const [compactHeader, setCompactHeader] = useState(false);
	const { enabled, onPointerMove } = usePointerParallax(heroRef, reducedMotion);

	useEffect(() => {
		const updateHeader = () => {
			setCompactHeader(window.scrollY > 80);
			const hero = heroRef.current;
			if (!hero) return;
			const progress = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.72)));
			hero.style.setProperty('--hero-exit', progress.toFixed(3));
		};
		updateHeader();
		window.addEventListener('scroll', updateHeader, { passive: true });
		return () => window.removeEventListener('scroll', updateHeader);
	}, []);

	useEffect(() => {
		const hero = heroRef.current;
		if (!hero || reducedMotion) return;
		const context = gsap.context(() => {
			gsap.timeline()
				.fromTo('[data-sun]', { opacity: 0, scale: 0.15 }, { opacity: 1, scale: 1, duration: 1.2, ease: 'expo.out' })
				.fromTo('[data-orbits]', { strokeDashoffset: 2200, opacity: 0 }, { strokeDashoffset: 0, opacity: 1, duration: 1.7, ease: 'power2.out' }, 0.6)
				.fromTo('[data-wordmark]', { opacity: 0, letterSpacing: '0.72em', filter: 'blur(14px)', y: 16 }, { opacity: 1, letterSpacing: '0.28em', filter: 'blur(0px)', y: 0, duration: 1.2, ease: 'power3.out' }, 1.35)
				.fromTo('[data-kanji]', { opacity: 0, y: 14, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.65, ease: 'power2.out' }, 2.05)
				.fromTo('[data-copy]', { opacity: 0, y: 14, filter: 'blur(9px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.75, stagger: 0.18, ease: 'power2.out' }, 2.35)
				.fromTo('[data-wave]', { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.14, ease: 'power2.out' }, 2.55)
				.to('[data-particle]', { opacity: 1, duration: 0.7, stagger: 0.025 }, 2.85)
				.fromTo('[data-cta]', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 3.25);
			gsap.to('[data-orbits]', { rotation: 360, transformOrigin: '50% 50%', duration: 120, repeat: -1, ease: 'none' });
			gsap.to('[data-wave]', { y: -7, duration: 8, yoyo: true, repeat: -1, stagger: 0.35, ease: 'sine.inOut' });
		}, hero);
		return () => context.revert();
	}, [reducedMotion]);

	return (
		<section className="asumi-hero" data-intro-complete={reducedMotion ? 'true' : 'false'} data-parallax={enabled ? 'on' : 'off'} data-testid="asumi-hero" onPointerMove={onPointerMove} ref={heroRef}>
			<AsumiHeader compact={compactHeader} />
			<div className="asumi-hero__scene"><HybridHorizonScene reducedMotion={reducedMotion} /></div>
			<div className="asumi-hero__content">
				<BrandLockup />
				<a aria-label="Explore Work" className="asumi-button asumi-hero__cta" data-cta href="#what-we-build">
					<span>Explore Work</span>
					<svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18"><path d="M9 2v13m0 0 5-5m-5 5-5-5" stroke="currentColor" strokeLinecap="round" /></svg>
				</a>
			</div>
		</section>
	);
}
