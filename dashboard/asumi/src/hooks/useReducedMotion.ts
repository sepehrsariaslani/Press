import { useEffect, useState } from 'react';

const query = '(prefers-reduced-motion: reduce)';

export function useReducedMotion() {
	const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia(query).matches);

	useEffect(() => {
		const mediaQuery = window.matchMedia(query);
		const updatePreference = () => setReducedMotion(mediaQuery.matches);
		mediaQuery.addEventListener('change', updatePreference);
		return () => mediaQuery.removeEventListener('change', updatePreference);
	}, []);

	return reducedMotion;
}
