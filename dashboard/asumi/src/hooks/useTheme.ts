import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const storageKey = 'asumi-theme';

function getInitialTheme(): Theme {
	const savedTheme = localStorage.getItem(storageKey);
	if (savedTheme === 'dark' || savedTheme === 'light') {
		return savedTheme;
	}

	return window.matchMedia('(prefers-color-scheme: light)').matches
		? 'light'
		: 'dark';
}

export function useTheme() {
	const [theme, updateTheme] = useState<Theme>(getInitialTheme);

	useEffect(() => {
		document.documentElement.dataset.theme = theme;
		localStorage.setItem(storageKey, theme);
	}, [theme]);

	return {
		theme,
		setTheme: updateTheme,
		toggleTheme: () => updateTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark')),
	};
}
