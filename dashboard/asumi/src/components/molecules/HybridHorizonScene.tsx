import { Component, lazy, Suspense, useEffect, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { canUseCinematicScene, detectWebGLSupport } from '../../scene/capabilities';
import { HorizonScene } from './HorizonScene';

const AsumiCanvas = lazy(() => import('../three/AsumiCanvas'));

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
	state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	componentDidCatch(_error: Error, _info: ErrorInfo) {
		this.props.onError();
	}

	render() {
		return this.state.failed ? null : this.props.children;
	}
}

type HybridHorizonSceneProps = {
	reducedMotion: boolean;
};

export function HybridHorizonScene({ reducedMotion }: HybridHorizonSceneProps) {
	const [cinematic, setCinematic] = useState(false);
	const [ready, setReady] = useState(false);
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		const media = window.matchMedia('(pointer: fine)');
		const update = () => {
			const enabled = canUseCinematicScene({
				finePointer: media.matches,
				reducedMotion,
				viewportWidth: window.innerWidth,
				webglSupported: detectWebGLSupport(),
			});
			setCinematic(enabled);
			if (!enabled) setReady(false);
		};
		update();
		window.addEventListener('resize', update, { passive: true });
		media.addEventListener?.('change', update);
		return () => {
			window.removeEventListener('resize', update);
			media.removeEventListener?.('change', update);
		};
	}, [reducedMotion]);

	useEffect(() => {
		const host = document.querySelector('[data-testid="hybrid-horizon"]');
		if (!host || !('IntersectionObserver' in window)) return;
		const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '120px' });
		observer.observe(host);
		return () => observer.disconnect();
	}, []);

	return (
		<div className="hybrid-horizon" data-cinematic={ready ? 'on' : 'off'} data-testid="hybrid-horizon">
			<div className="hybrid-horizon__fallback"><HorizonScene /></div>
			{cinematic && visible ? (
				<SceneBoundary onError={() => { setCinematic(false); setReady(false); }}>
					<Suspense fallback={null}><div className="hybrid-horizon__canvas"><AsumiCanvas onReady={() => setReady(true)} /></div></Suspense>
				</SceneBoundary>
			) : null}
		</div>
	);
}
