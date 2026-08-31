import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { BrandLockup } from '../molecules/BrandLockup';
import { HybridHorizonScene } from '../molecules/HybridHorizonScene';
import { usePointerParallax } from '../../hooks/usePointerParallax';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AsumiHeader } from './AsumiHeader';
import { Galaxy } from '../effects/Galaxy';
import { LaserFlow } from '../effects/LaserFlow';
import { Strands } from '../effects/Strands';
import { ExploreWork } from '../molecules/ExploreWork';
import { LocalParticles } from '../molecules/LocalParticles';
import { OrbitCircles } from '../molecules/OrbitCircles';

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

	useGSAP(() => {
		const hero = heroRef.current;
		if (!hero || !active) return;
		if (reducedMotion) {
			hero.dataset.introComplete = 'true';
			return;
		}
		gsap.ticker.lagSmoothing(0);
		const timeline = gsap.timeline({
				onComplete: () => {
					hero.dataset.introComplete = 'true';
					gsap.to('[data-sunrise]', { filter: 'brightness(1.12)', scale: 1.025, duration: 3.1, yoyo: true, repeat: -1, ease: 'sine.inOut' });
				},
			});
		timeline
				.fromTo('[data-sunrise]', { opacity: 0, scale: 0.1, transformOrigin: '50% 76%' }, { opacity: 1, scale: 1, duration: 1, ease: 'power3.out' }, 0.2)
				.fromTo('[data-haze]', { opacity: 0 }, { opacity: 0.9, duration: 1.15, ease: 'power2.out' }, 0.4)
				.fromTo('[data-orbit-path]', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.85, stagger: 0.12, ease: 'power2.inOut' }, 0.65)
				.fromTo('[data-wordmark]', { opacity: 0, letterSpacing: '0.65em', filter: 'blur(12px)', y: 14 }, { opacity: 1, letterSpacing: '0.42em', filter: 'blur(0px)', y: 0, duration: 1.1, ease: 'power3.out' }, 0.95)
				.fromTo('[data-kanji]', { opacity: 0, y: 8, filter: 'blur(7px)', '--line-scale': 0 }, { opacity: 1, y: 0, filter: 'blur(0px)', '--line-scale': 1, duration: 0.72, ease: 'power2.out' }, 1.25)
				.fromTo('[data-english]', { opacity: 0, y: 8, filter: 'blur(7px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: 'power2.out' }, 1.5)
				.fromTo('[data-persian]', { opacity: 0, y: 8, filter: 'blur(7px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.72, ease: 'power2.out' }, 1.75)
				.to('[data-sunrise]', { filter: 'brightness(1.15)', duration: 0.32, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 1.8)
				.fromTo('[data-ribbons]', { opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 1.15, ease: 'power2.out' }, 1.95)
				.fromTo('[data-particles]', { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.out' }, 2.2)
				.fromTo('[data-cta]', { opacity: 0, y: 10, filter: 'blur(5px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.72, ease: 'power3.out' }, 2.45);
		return () => {
			hero.dataset.introComplete = reducedMotion ? 'true' : 'false';
			timeline.kill();
		};
	}, { dependencies: [active, reducedMotion], revertOnUpdate: true, scope: heroRef });

	return (
		<section className="asumi-hero" data-active={active ? 'true' : 'false'} data-intro-complete={reducedMotion ? 'true' : 'false'} data-parallax={enabled && active ? 'on' : 'off'} data-testid="asumi-hero" onPointerMove={onPointerMove} ref={heroRef}>
			<AsumiHeader compact={compactHeader} />
			<div className="asumi-hero__galaxy" data-layer="galaxy" data-testid="galaxy-background">
				<Galaxy disableAnimation={reducedMotion} />
			</div>
			<div className="asumi-hero__haze" data-haze data-layer="haze"><LaserFlow disableAnimation={reducedMotion} /></div>
			<div className="asumi-hero__scene" data-layer="sunrise" data-sunrise><HybridHorizonScene active={active} reducedMotion={reducedMotion} /></div>
			<div className="asumi-hero__ribbons" data-layer="ribbons" data-ribbons>
				<Strands amplitude={0.7} colors={['#84683d', '#c8a66a', '#e2bd76', '#f4f0e8']} count={4} disableAnimation={reducedMotion} glow={2.8} intensity={0.42} opacity={0.7} saturation={0.28} scale={1.6} speed={0.28} spread={0.9} taper={4.5} thickness={1.15} waviness={0.72} />
			</div>
			<div className="asumi-hero__particles" data-layer="particles" data-particles><LocalParticles /></div>
			<div className="asumi-hero__orbits" data-layer="orbits"><OrbitCircles /></div>
			<div className="asumi-hero__content" data-layer="typography">
				<BrandLockup />
			</div>
			<div className="asumi-hero__cta" data-cta data-layer="cta"><ExploreWork /></div>
		</section>
	);
}
