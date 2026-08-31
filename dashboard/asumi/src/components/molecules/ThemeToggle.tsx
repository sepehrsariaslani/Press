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
			<span aria-hidden="true">{isDark ? '☼' : '☾'}</span>
		</AsumiButton>
	);
}
