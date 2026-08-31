import { Particle } from '../atoms/Particle';

const particles = Array.from({ length: 24 }, (_, index) => index);

export function HorizonScene() {
	return (
		<div aria-hidden="true" className="horizon-scene">
			<svg className="horizon-scene__svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1600 900">
				<defs>
					<radialGradient id="asumi-sun" cx="50%" cy="50%" r="50%">
						<stop offset="0%" stopColor="var(--asumi-gold-bright)" stopOpacity="1" />
						<stop offset="22%" stopColor="var(--asumi-gold)" stopOpacity="0.66" />
						<stop offset="100%" stopColor="var(--asumi-gold)" stopOpacity="0" />
					</radialGradient>
					<linearGradient id="asumi-wave" x1="0" x2="1" y1="0" y2="0">
						<stop offset="0%" stopColor="var(--asumi-gold-deep)" stopOpacity="0" />
						<stop offset="55%" stopColor="var(--asumi-gold)" stopOpacity="0.45" />
						<stop offset="100%" stopColor="var(--asumi-gold-bright)" stopOpacity="0.9" />
					</linearGradient>
					<filter id="asumi-blur"><feGaussianBlur stdDeviation="14" /></filter>
				</defs>
				<ellipse className="horizon-scene__sun-glow" cx="800" cy="655" data-sun fill="url(#asumi-sun)" rx="240" ry="170" />
				<ellipse className="horizon-scene__reflection" cx="800" cy="748" fill="url(#asumi-sun)" filter="url(#asumi-blur)" rx="26" ry="142" />
				<circle className="horizon-scene__sun" cx="800" cy="655" fill="var(--asumi-gold-bright)" r="5" />
				<g className="horizon-scene__orbits" data-orbits fill="none" stroke="var(--asumi-gold)" strokeWidth="1">
					<circle cx="800" cy="395" r="282" />
					<ellipse cx="800" cy="395" rx="357" ry="306" />
					<ellipse cx="800" cy="395" rx="437" ry="365" />
				</g>
				<path className="horizon-scene__horizon" d="M0 655 C270 638 450 673 800 655 C1120 637 1320 678 1600 642" fill="none" stroke="var(--asumi-gold)" strokeWidth="1" />
				<g className="horizon-scene__waves" fill="none" stroke="url(#asumi-wave)">
					<path d="M760 716 C985 720 1090 492 1250 650 C1360 756 1480 622 1660 400" data-wave strokeWidth="3" />
					<path d="M690 758 C944 726 1075 596 1210 720 C1350 850 1510 656 1660 526" data-wave strokeWidth="1.4" />
					<path d="M760 685 C968 642 1082 545 1190 626 C1350 745 1470 527 1640 466" data-wave strokeWidth="0.9" />
				</g>
			</svg>
			<div className="horizon-scene__particles">
				{particles.map((index) => <Particle index={index} key={index} />)}
			</div>
		</div>
	);
}
