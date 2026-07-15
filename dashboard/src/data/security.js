const hasPrivateSourceFlag =
	typeof window !== 'undefined' &&
	Object.prototype.hasOwnProperty.call(window, 'press_private_source_only');

// Private source mode defaults to enabled to prevent exposing source metadata.
export const privateSourceOnly = hasPrivateSourceFlag
	? Boolean(window.press_private_source_only)
	: true;
