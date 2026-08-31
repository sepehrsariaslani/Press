export type SceneCapabilities = {
	reducedMotion: boolean;
	finePointer: boolean;
	viewportWidth: number;
	webglSupported: boolean;
};

export function canUseCinematicScene({
	reducedMotion,
	finePointer,
	viewportWidth,
	webglSupported,
}: SceneCapabilities) {
	return !reducedMotion && finePointer && viewportWidth >= 900 && webglSupported;
}

export function detectWebGLSupport() {
	try {
		if (!('WebGLRenderingContext' in window) && !('WebGL2RenderingContext' in window)) return false;
		const canvas = document.createElement('canvas');
		return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
	} catch {
		return false;
	}
}
