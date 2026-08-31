import { describe, expect, test } from 'vitest';
import { LENS_FLARE_GHOSTS } from './lensFlare';

describe('Asumi lens flare composition', () => {
	test('uses multiple optical ghosts instead of decorative orbit rings', () => {
		expect(LENS_FLARE_GHOSTS).toHaveLength(5);
		expect(LENS_FLARE_GHOSTS.some((ghost) => ghost.position[0] < -1 && ghost.position[1] > 0)).toBe(true);
		expect(LENS_FLARE_GHOSTS.some((ghost) => ghost.position[0] > 0 && ghost.position[1] < -1)).toBe(true);
	});

	test('keeps every ghost subtle enough to remain behind the brand', () => {
		for (const ghost of LENS_FLARE_GHOSTS) {
			expect(ghost.opacity).toBeLessThanOrEqual(0.12);
			expect(ghost.opacity).toBeGreaterThan(0);
		}
	});
});
