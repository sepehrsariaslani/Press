ASUMI_HOSTS = frozenset({"asumi", "asumi.ir", "www.asumi.ir"})


def should_route_dashboard(
	path: str,
	*,
	host: str,
) -> bool:
	host = (host or "").split(":", 1)[0].lower()
	route = (path or "").split("?", 1)[0].strip("/ ").lower()

	if host not in ASUMI_HOSTS:
		return False

	return route == "dashboard" or route.startswith("dashboard/")
