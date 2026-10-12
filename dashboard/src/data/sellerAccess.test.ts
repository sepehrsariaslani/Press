import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canAccessSellerDashboard } from './sellerAccess';

const routerSource = readFileSync(new URL('../router.js', import.meta.url), 'utf8');
const dashboardEntrySource = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
const navigationSource = readFileSync(
	new URL('../components/navigation/sidebar/NavList.vue', import.meta.url),
	'utf8',
);

describe('seller dashboard access', () => {
	it('uses one shared access rule for route guard and navigation', () => {
		expect(routerSource).toContain('canAccessSellerDashboard');
		expect(navigationSource).toContain('canAccessSellerDashboard');
	});

	it('shares the selected dashboard team with server-rendered pages', () => {
		expect(dashboardEntrySource).toContain('press_current_team=');
		expect(dashboardEntrySource).toContain("localStorage.getItem('current_team')");
	});

	it.each([
		[{ owner: true, admin: false, isSystemUser: false }, true],
		[{ owner: false, admin: true, isSystemUser: false }, true],
		[{ owner: false, admin: false, isSystemUser: true }, true],
		[{ owner: false, admin: false, isSystemUser: false }, false],
	])('returns %s for the matching role', (permissions, expected) => {
		expect(canAccessSellerDashboard(permissions)).toBe(expected);
	});
});
