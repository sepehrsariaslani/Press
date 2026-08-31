export type LensFlareGhost = {
	position: [number, number, number];
	size: number;
	opacity: number;
	phase: number;
	warmth: number;
};

export const LENS_FLARE_GHOSTS: LensFlareGhost[] = [
	{ position: [-1.72, 0.72, -1.9], size: 0.94, opacity: 0.022, phase: 0.2, warmth: 0.28 },
	{ position: [-0.92, 0.02, -1.35], size: 0.58, opacity: 0.029, phase: 1.4, warmth: 0.7 },
	{ position: [-0.38, -0.54, -0.72], size: 0.24, opacity: 0.038, phase: 2.1, warmth: 0.92 },
	{ position: [0.58, -1.48, -0.55], size: 0.22, opacity: 0.03, phase: 2.8, warmth: 0.54 },
	{ position: [1.08, -1.92, -1.05], size: 0.34, opacity: 0.018, phase: 3.7, warmth: 0.36 },
];
