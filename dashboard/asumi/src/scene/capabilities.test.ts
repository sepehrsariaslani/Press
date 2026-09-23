import { describe, expect, test } from 'vitest';
import { canUseCinematicScene } from './capabilities';

const desktop = {
	reducedMotion: false,
	finePointer: true,
	viewportWidth: 1440,
	webglSupported: true,
};

describe('canUseCinematicScene', () => {
	test('enables the cinematic renderer on a capable desktop', () => {
		expect(canUseCinematicScene(desktop)).toBe(true);
	});

	test.each([
		['reduced motion', { reducedMotion: true }],
		['coarse pointer', { finePointer: false }],
		['narrow viewport', { viewportWidth: 899 }],
		['missing WebGL', { webglSupported: false }],
	])('keeps the SVG fallback for %s', (_label, change) => {
		expect(canUseCinematicScene({ ...desktop, ...change })).toBe(false);
	});
});
