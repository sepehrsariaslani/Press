ASUMI_HOSTS = frozenset({"asumi", "asumi.ir", "www.asumi.ir"})


def should_route_dashboard(
	path: str,
	*,
	host: str,
	is_guest: bool,
	can_manage_docker: bool,
) -> bool:
	host = (host or "").split(":", 1)[0].lower()
	route = (path or "").split("?", 1)[0].strip("/ ").lower()

	if host not in ASUMI_HOSTS:
		return False

	if route == "dashboard/login":
		return is_guest

	return route == "dashboard/docker-control" and not is_guest and can_manage_docker
