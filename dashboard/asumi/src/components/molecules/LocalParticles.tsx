import type { CSSProperties } from 'react';

const particles = Array.from({ length: 24 }, (_, index) => ({
	x: 46 + ((index * 37) % 52),
	y: 63 + ((index * 19) % 27),
	delay: (index % 8) * -0.72,
	duration: 11 + (index % 7) * 1.35,
	scale: 0.55 + (index % 5) * 0.18,
}));

type ParticleStyle = CSSProperties & {
	'--particle-x': string;
	'--particle-y': string;
	'--particle-delay': string;
	'--particle-duration': string;
	'--particle-scale': number;
};

export function LocalParticles() {
	return particles.map((particle, index) => (
		<span
			aria-hidden="true"
			className="asumi-particle"
			key={index}
			style={{
				'--particle-x': `${particle.x}%`,
				'--particle-y': `${particle.y}%`,
				'--particle-delay': `${particle.delay}s`,
				'--particle-duration': `${particle.duration}s`,
				'--particle-scale': particle.scale,
			} as ParticleStyle}
		/>
	));
}
