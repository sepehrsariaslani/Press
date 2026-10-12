export function canManageAsumiCommerce(session) {
	return Boolean(session?.isSystemManager || session?.isPressAdmin);
}
