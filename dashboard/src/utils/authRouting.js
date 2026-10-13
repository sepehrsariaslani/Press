export function getProtectedRouteRedirect({ isLoggedIn, hasTeamPrivileges, destination }) {
	if (isLoggedIn && !hasTeamPrivileges) {
		return { type: 'invalid-team' };
	}

	return {
		type: 'login',
		route: { name: 'Login', query: { redirect: destination } },
	};
}
