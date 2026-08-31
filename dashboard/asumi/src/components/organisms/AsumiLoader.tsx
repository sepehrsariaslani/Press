import { useEffect, useState } from 'react';
import { Strands } from '../effects/Strands';
import { useReducedMotion } from '../../hooks/useReducedMotion';

type AsumiLoaderProps = {
	onComplete: () => void;
};

export function AsumiLoader({ onComplete }: AsumiLoaderProps) {
	const reducedMotion = useReducedMotion();
	const [leaving, setLeaving] = useState(false);

	useEffect(() => {
		const hold = window.setTimeout(() => setLeaving(true), reducedMotion ? 120 : 1350);
		const complete = window.setTimeout(onComplete, reducedMotion ? 320 : 1900);
		return () => { window.clearTimeout(hold); window.clearTimeout(complete); };
	}, [onComplete, reducedMotion]);

	return (
		<div aria-label="در حال آماده سازی تجربه آسومی" className={`asumi-loader ${leaving ? 'asumi-loader--leaving' : ''}`} role="status">
			<Strands />
			<div aria-hidden="true" className="asumi-loader__horizon" />
			<div className="asumi-loader__brand">
				<span>ASUMI</span>
				<small>明日美</small>
			</div>
		</div>
	);
}
