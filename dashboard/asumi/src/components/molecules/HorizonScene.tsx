import { Particle } from '../atoms/Particle';

const particles = Array.from({ length: 16 }, (_, index) => index);

export function HorizonScene() {
	return (
		<div aria-hidden="true" className="horizon-scene">
			<svg className="horizon-scene__svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1600 900">
				<defs>
					<linearGradient id="horizon-light" x1="0" x2="1"><stop offset="0" stopColor="#84683d" stopOpacity="0" /><stop offset="0.5" stopColor="#f6dfb0" /><stop offset="1" stopColor="#84683d" stopOpacity="0" /></linearGradient>
					<linearGradient id="fabric-gold" x1="0" x2="0.9" y1="1" y2="0"><stop offset="0" stopColor="#141718" stopOpacity="0" /><stop offset="0.55" stopColor="#51564f" stopOpacity="0.18" /><stop offset="0.92" stopColor="#c8a66a" stopOpacity="0.42" /><stop offset="1" stopColor="#f6dfb0" stopOpacity="0.72" /></linearGradient>
					<filter id="horizontal-bloom" x="-30%" width="160%"><feGaussianBlur stdDeviation="38 5" /></filter>
					<filter id="soft-fabric"><feGaussianBlur stdDeviation="1.8" /></filter>
				</defs>
				<g data-sun>
					<rect fill="url(#horizon-light)" filter="url(#horizontal-bloom)" height="14" opacity="0.52" width="760" x="420" y="672" />
					<ellipse cx="800" cy="730" fill="#c8a66a" filter="url(#horizontal-bloom)" opacity="0.24" rx="17" ry="92" />
					<circle cx="800" cy="678" fill="#fff4d4" r="3.5" />
				</g>
				<g className="horizon-scene__orbits" data-orbits fill="none" stroke="#c8a66a" strokeWidth="0.55">
					<ellipse cx="770" cy="430" opacity="0.14" rx="260" ry="292" />
					<ellipse cx="842" cy="428" opacity="0.09" rx="335" ry="277" transform="rotate(7 842 428)" />
					<ellipse cx="730" cy="408" opacity="0.055" rx="405" ry="328" transform="rotate(-8 730 408)" />
				</g>
				<g filter="url(#soft-fabric)">
					<path d="M790 684 C1000 680 1095 522 1255 556 C1380 584 1458 462 1640 372 L1640 730 C1450 760 1320 690 1190 712 C1050 738 930 704 790 690 Z" data-wave fill="url(#fabric-gold)" opacity="0.72" />
					<path d="M790 690 C1000 696 1118 604 1250 648 C1390 694 1490 576 1640 522 L1640 770 C1450 788 1315 724 1170 738 C1015 752 910 710 790 696 Z" data-wave fill="url(#fabric-gold)" opacity="0.4" />
				</g>
			</svg>
			<div className="horizon-scene__particles">
				{particles.map((index) => <Particle index={index} key={index} />)}
			</div>
		</div>
	);
}
