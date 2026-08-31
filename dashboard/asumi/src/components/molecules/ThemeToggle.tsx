import { AsumiButton } from '../atoms/AsumiButton';
import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	const isDark = theme === 'dark';

	return (
		<AsumiButton
			aria-label={isDark ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره'}
			className="theme-toggle"
			onClick={toggleTheme}
		>
			{isDark ? (
				<svg aria-hidden="true" fill="none" height="19" viewBox="0 0 24 24" width="19">
					<circle cx="12" cy="12" r="4" stroke="currentColor" />
					<path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" stroke="currentColor" strokeLinecap="round" />
				</svg>
			) : (
				<svg aria-hidden="true" fill="none" height="19" viewBox="0 0 24 24" width="19">
					<path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z" stroke="currentColor" strokeLinejoin="round" />
				</svg>
			)}
		</AsumiButton>
	);
}
