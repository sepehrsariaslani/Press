import { useEffect } from 'react';
import { LoaderStrands } from '../effects/LoaderStrands';

type AsumiLoaderProps = {
	onComplete: () => void;
	onReveal: () => void;
};

export function AsumiLoader({ onComplete, onReveal }: AsumiLoaderProps) {
	useEffect(() => {
		const revealTimer = window.setTimeout(onReveal, 900);
		const completeTimer = window.setTimeout(onComplete, 1300);

		return () => {
			window.clearTimeout(revealTimer);
			window.clearTimeout(completeTimer);
		};
	}, [onComplete, onReveal]);

	return (
		<div className="asumi-loader" role="status" aria-label="در حال آماده سازی تجربه آسومی">
			<div className="asumi-loader__strands">
				<LoaderStrands />
			</div>
		</div>
	);
}
