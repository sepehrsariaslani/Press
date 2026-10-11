import { createResource } from 'frappe-ui';

const api = 'press.api.docker_control';

export function callDockerControl(method, params = {}) {
	const resource = createResource({
		url: `${api}.${method}`,
		makeParams: () => params,
		auto: false,
	});
	return resource.submit();
}

export function fetchDockerControl(method, params = {}) {
	const resource = createResource({
		url: `${api}.${method}`,
		makeParams: () => params,
		auto: false,
	});
	return resource.fetch();
}
