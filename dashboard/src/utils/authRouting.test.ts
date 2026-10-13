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

test('returns a newly registered customer to the internal checkout destination', async () => {
	const { getPostSignupDestination } = await import('./authRouting');
	expect(getPostSignupDestination).toBeTypeOf('function');
	if (typeof getPostSignupDestination !== 'function') return;

	expect(
		getPostSignupDestination({
			redirect: '/dashboard/orders?asumi_app=accounts',
			isInvitation: false,
		}),
	).toBe('/dashboard/orders?asumi_app=accounts');
});

test('rejects external post-signup redirects and keeps the normal Press onboarding fallback', async () => {
	const { getPostSignupDestination } = await import('./authRouting');
	expect(getPostSignupDestination).toBeTypeOf('function');
	if (typeof getPostSignupDestination !== 'function') return;

	expect(
		getPostSignupDestination({
			redirect: 'https://example.com/dashboard/orders',
			isInvitation: false,
		}),
	).toBe('/dashboard/create-site/app-selector');

	expect(
		getPostSignupDestination({ product: 'erpnext', isInvitation: false }),
	).toBe('/dashboard/create-site/erpnext/setup');
	expect(
		getPostSignupDestination({
			redirect: '/dashboard/orders',
			product: 'erpnext',
			isInvitation: true,
		}),
	).toBe('/dashboard/sites');
});

test('preserves a safe checkout destination when signup discovers an existing account', async () => {
	const { getSignupLoginRedirect } = await import('./authRouting');
	expect(getSignupLoginRedirect).toBeTypeOf('function');
	if (typeof getSignupLoginRedirect !== 'function') return;

	expect(
		getSignupLoginRedirect({ redirect: '/dashboard/orders?asumi_app=accounts' }),
	).toBe('/dashboard/orders?asumi_app=accounts');
	expect(getSignupLoginRedirect({ redirect: 'https://example.com' })).toBeNull();
	expect(getSignupLoginRedirect({ product: 'erpnext' })).toBe(
		'/dashboard/create-site/erpnext/setup',
	);
});
