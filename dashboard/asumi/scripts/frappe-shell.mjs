export function stripFrappeCsrfPlaceholder(html) {
	return html.replace(/<!-- csrf_token -->/g, '');
}
