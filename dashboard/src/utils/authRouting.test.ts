import { expect, test } from 'vitest';

async function protectedRouteRedirect() {
	const module = await import('./authRouting').catch(() => null);
	return module?.getProtectedRouteRedirect;
}

test('redirects guests without a team to login and preserves the requested destination', async () => {
	const resolve = await protectedRouteRedirect();
	expect(resolve).toBeTypeOf('function');
	if (typeof resolve !== 'function') return;

	const destination = '/dashboard/orders?asumi_app=accounts';
	expect(
		resolve({ isLoggedIn: false, hasTeamPrivileges: false, destination }),
	).toEqual({
		type: 'login',
		route: { name: 'Login', query: { redirect: destination } },
	});
});

test('keeps invalid-team handling for signed-in users without an active team', async () => {
	const resolve = await protectedRouteRedirect();
	expect(resolve).toBeTypeOf('function');
	if (typeof resolve !== 'function') return;

	expect(
		resolve({ isLoggedIn: true, hasTeamPrivileges: false, destination: '/dashboard/orders' }),
	).toEqual({ type: 'invalid-team' });
});
