export function canAccessSellerDashboard({ owner, admin, isSystemUser }) {
	return Boolean(owner || admin || isSystemUser);
}
