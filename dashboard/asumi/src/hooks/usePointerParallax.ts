import { useEffect, useRef, useState } from 'react';
import type { PointerEvent, RefObject } from 'react';

type PointerParallax = {
	enabled: boolean;
	onPointerMove: (event: PointerEvent<HTMLElement>) => void;
};

export function usePointerParallax(
	containerRef: RefObject<HTMLElement | null>,
	reducedMotion: boolean,
): PointerParallax {
	const [enabled, setEnabled] = useState(false);
	const frame = useRef<number | null>(null);
	const nextPosition = useRef({ x: 0, y: 0 });

	useEffect(() => {
		const mediaQuery = window.matchMedia('(pointer: fine)');
		const updateEnabled = () => setEnabled(!reducedMotion && mediaQuery.matches);
		updateEnabled();
		mediaQuery.addEventListener?.('change', updateEnabled);

		return () => {
			mediaQuery.removeEventListener?.('change', updateEnabled);
			if (frame.current !== null) cancelAnimationFrame(frame.current);
		};
	}, [reducedMotion]);

	return {
		enabled,
		onPointerMove: (event) => {
			if (!enabled || !containerRef.current) return;
			const bounds = containerRef.current.getBoundingClientRect();
			nextPosition.current = {
				x: (event.clientX - bounds.left) / bounds.width - 0.5,
				y: (event.clientY - bounds.top) / bounds.height - 0.5,
			};
			if (frame.current !== null) return;
			frame.current = requestAnimationFrame(() => {
				const element = containerRef.current;
				if (element) {
					element.style.setProperty('--pointer-x', nextPosition.current.x.toFixed(3));
					element.style.setProperty('--pointer-y', nextPosition.current.y.toFixed(3));
				}
				frame.current = null;
			});
		},
	};
}
