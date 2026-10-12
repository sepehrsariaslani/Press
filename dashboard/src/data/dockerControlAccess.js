export function canAccessDockerControl(session) {
	return Boolean(session?.isSystemManager || session?.canAccessDockerControl);
}

export function isDockerControlOnlyUser(session) {
	return Boolean(
		session?.canAccessDockerControl &&
		!session?.canManageDockerControlHost &&
		!session?.isSystemManager,
	);
}
