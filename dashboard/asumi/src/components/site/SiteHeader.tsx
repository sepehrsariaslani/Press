import { useState, type ReactNode } from 'react';
import { BrandSignal } from '../../story/BrandSignal';
import './site-shell.css';

type SiteHeaderProps = {
	variant: 'story' | 'paper';
	description?: string;
	entryHref?: string;
	entryLabel?: string;
	onOpenPricing?: () => void;
	onReturnToModules?: () => void;
	className?: string;
	actionsClassName?: string;
	actions?: ReactNode;
	showSiteNavigation?: boolean;
	showEntryLink?: boolean;
};

const siteLinks = [
	{ href: '#roles', label: 'داشبوردها' },
	{ href: '#modules', label: 'ماژول‌ها' },
	{ href: '#industries', label: 'صنایع' },
	{ href: '#portal', label: 'پنل مشتری' },
];

export function SiteHeader({ variant, description, entryHref = '/hesab', entryLabel = 'ورود به آسومی', onOpenPricing, onReturnToModules, className = '', actionsClassName = '', actions, showSiteNavigation = true, showEntryLink = true }: SiteHeaderProps) {
	const [menuOpen, setMenuOpen] = useState(false);
	const headerClass = variant === 'story' ? 'story-header' : 'module-page-header';
	const brandClass = variant === 'story' ? 'story-brand' : 'module-page-brand';

	return <header className={`${headerClass} asumi-site-header asumi-site-header--${variant} ${className}`.trim()}>
		<a className={brandClass} href={onReturnToModules ? '#modules' : '#chaos'} aria-label="آسومی؛ از داده تا تصمیم" onClick={onReturnToModules ? event => { event.preventDefault(); onReturnToModules(); } : undefined}>
			{variant === 'story' ? <BrandSignal /> : <span className="brand-signal" aria-hidden="true"><i /><i /><i /></span>}
			<span>آسومی<small>از داده تا تصمیم</small></span>
		</a>
		{description && <p className="header-description asumi-site-description">{description}</p>}
		{showSiteNavigation && <>
			<button className="asumi-site-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="asumi-site-navigation" onClick={() => setMenuOpen(!menuOpen)}>
				{menuOpen ? 'بستن' : 'فهرست'}
			</button>
			<nav id="asumi-site-navigation" className="asumi-site-navigation" data-open={menuOpen} aria-label="ناوبری اصلی آسومی">
				{siteLinks.map(link => <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</a>)}
				{onOpenPricing
					? <button type="button" onClick={() => { setMenuOpen(false); onOpenPricing(); }}>تعرفه‌ها</button>
					: <a href="#pricing" onClick={() => setMenuOpen(false)}>تعرفه‌ها</a>}
			</nav>
		</>}
		<div className={`header-actions asumi-site-actions ${actionsClassName}`.trim()}>
			{actions}
			{showEntryLink && <a className={variant === 'story' ? 'login-link' : 'module-page-login'} href={entryHref}>{entryLabel}<span aria-hidden="true">↗</span></a>}
		</div>
	</header>;
}
