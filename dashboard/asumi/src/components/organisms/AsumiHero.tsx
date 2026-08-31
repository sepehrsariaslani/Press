import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { AsumiButton } from '../atoms/AsumiButton';
import { BrandLockup } from '../molecules/BrandLockup';
import { HorizonScene } from '../molecules/HorizonScene';
import { usePointerParallax } from '../../hooks/usePointerParallax';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AsumiHeader } from './AsumiHeader';

export function AsumiHero() {
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
		if (!hero || reducedMotion) return;
		const context = gsap.context(() => {
			gsap.timeline()
				.fromTo('[data-sun]', { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: 1.1, ease: 'power2.out' })
				.fromTo('[data-orbits]', { strokeDashoffset: 2200, opacity: 0 }, { strokeDashoffset: 0, opacity: 1, duration: 1.6, ease: 'power2.out' }, 0.35)
				.fromTo('[data-wave]', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.12, ease: 'power2.out' }, 0.65)
				.fromTo('[data-wordmark]', { opacity: 0, letterSpacing: '0.65em', filter: 'blur(12px)', y: 12 }, { opacity: 1, letterSpacing: '0.28em', filter: 'blur(0px)', y: 0, duration: 1.1, ease: 'power3.out' }, 0.85)
				.fromTo('[data-kanji]', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 1.3)
				.fromTo('[data-copy]', { opacity: 0, y: 10, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, stagger: 0.15, ease: 'power2.out' }, 1.5)
				.fromTo('[data-cta]', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 2.1)
				.to('[data-particle]', { opacity: 1, duration: 0.65, stagger: 0.03 }, 2.2);
			gsap.to('[data-orbits]', { rotation: 360, transformOrigin: '50% 50%', duration: 120, repeat: -1, ease: 'none' });
			gsap.to('[data-wave]', { y: -7, duration: 8, yoyo: true, repeat: -1, stagger: 0.35, ease: 'sine.inOut' });
		}, hero);
		return () => context.revert();
	}, [reducedMotion]);

	return (
		<section className="asumi-hero" data-intro-complete={reducedMotion ? 'true' : 'false'} data-parallax={enabled ? 'on' : 'off'} data-testid="asumi-hero" onPointerMove={onPointerMove} ref={heroRef}>
			<AsumiHeader compact={compactHeader} />
			<div className="asumi-hero__scene"><HorizonScene /></div>
			<div className="asumi-hero__content">
				<BrandLockup />
				<AsumiButton aria-label="Explore Work" className="asumi-hero__cta" data-cta>
					<span>Explore Work</span><span aria-hidden="true">○→</span>
				</AsumiButton>
			</div>
		</section>
	);
}
