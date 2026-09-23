import { BrandMark } from '../atoms/BrandMark';
import { ThemeToggle } from '../molecules/ThemeToggle';

type AsumiHeaderProps = { compact: boolean };

export function AsumiHeader({ compact }: AsumiHeaderProps) {
	return (
		<header className={`asumi-header ${compact ? 'asumi-header--compact' : ''}`}>
			<BrandMark className="asumi-header__brand" />
			<ThemeToggle />
		</header>
	);
}
