export function getProtectedRouteRedirect({ isLoggedIn, hasTeamPrivileges, destination }) {
	if (isLoggedIn && !hasTeamPrivileges) {
		return { type: 'invalid-team' };
	}

	return {
		type: 'login',
		route: { name: 'Login', query: { redirect: destination } },
	};
}

const DASHBOARD_ORIGIN = 'https://press-dashboard.invalid';
const BLOCKED_POST_SETUP_PATHS = new Set([
	'/dashboard/login',
	'/dashboard/signup',
	'/dashboard/f-login',
	'/dashboard/setup-account',
]);

function getSafeDashboardDestination(destination) {
	if (
		typeof destination !== 'string' ||
		!destination ||
		destination.length > 2048 ||
		destination !== destination.trim() ||
		!destination.startsWith('/') ||
		destination.startsWith('//') ||
		destination.includes('\\')
	) {
		return null;
	}

	try {
		const url = new URL(destination, DASHBOARD_ORIGIN);
		if (
			url.origin !== DASHBOARD_ORIGIN ||
			!(url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/')) ||
			[...BLOCKED_POST_SETUP_PATHS].some(
				(path) => url.pathname === path || url.pathname.startsWith(`${path}/`),
			)
		) {
			return null;
		}

		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return null;
	}
}

export function getPostSignupDestination({ redirect, product, isInvitation }) {
	if (isInvitation) return '/dashboard/sites';

	const safeDestination = getSafeDashboardDestination(redirect);
	if (safeDestination) return safeDestination;

	if (typeof product === 'string' && product.trim()) {
		return `/dashboard/create-site/${encodeURIComponent(product.trim())}/setup`;
	}

	return '/dashboard/create-site/app-selector';
}

export function getSignupLoginRedirect({ redirect, product }) {
	const safeDestination = getSafeDashboardDestination(redirect);
	if (safeDestination) return safeDestination;

	if (typeof product === 'string' && product.trim()) {
		return `/dashboard/create-site/${encodeURIComponent(product.trim())}/setup`;
	}

	return null;
}
