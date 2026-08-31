export type LensFlareGhost = {
	position: [number, number, number];
	size: number;
	opacity: number;
	phase: number;
	warmth: number;
};

export const LENS_FLARE_GHOSTS: LensFlareGhost[] = [
	{ position: [-2.18, 0.88, -1.9], size: 1.72, opacity: 0.074, phase: 0.2, warmth: 0.28 },
	{ position: [-1.18, -0.02, -1.35], size: 1.06, opacity: 0.092, phase: 1.4, warmth: 0.7 },
	{ position: [-0.48, -0.62, -0.72], size: 0.38, opacity: 0.12, phase: 2.1, warmth: 0.92 },
	{ position: [0.62, -1.64, -0.55], size: 0.46, opacity: 0.096, phase: 2.8, warmth: 0.54 },
	{ position: [1.22, -2.18, -1.05], size: 0.72, opacity: 0.054, phase: 3.7, warmth: 0.36 },
];
