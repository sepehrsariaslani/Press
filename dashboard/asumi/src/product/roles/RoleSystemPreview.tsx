import { useState } from 'react';
import './role-showcase.css';

type RoleSystemPreviewProps = {
	roleLabel: string;
	sectionLabel: string;
	entryHref: string;
	isAuthenticated: boolean;
};

function getLoginHref(entryHref: string) {
	const target = new URL(entryHref, window.location.origin);
	const nextPath = `${target.pathname.replace(/^\/hesab(?=\/|$)/, '') || '/'}${target.search}`;
	return `/hesab/login?next=${encodeURIComponent(nextPath)}`;
}

export function RoleSystemPreview({ roleLabel, sectionLabel, entryHref, isAuthenticated }: RoleSystemPreviewProps) {
	const [loadedHref, setLoadedHref] = useState('');
	const isLoading = isAuthenticated && loadedHref !== entryHref;
	const viewHref = isAuthenticated ? entryHref : getLoginHref(entryHref);

	return <section className="role-live-preview" aria-label={`نمای واقعی آسومی برای ${roleLabel}`}>
		<header className="role-live-preview-heading">
			<div>
				<p className="role-live-preview-eyebrow">محیط واقعی آسومی · Accounts</p>
				<h3>نمای کاری {roleLabel}</h3>
				<p>صفحه‌ی واقعی سامانه در قاب زیر باز می‌شود؛ منو و اطلاعات براساس حساب واردشده نمایش داده می‌شوند.</p>
			</div>
			<a href={viewHref} target="_blank" rel="noopener noreferrer" className="role-live-preview-open">
				{isAuthenticated ? 'بازکردن در صفحه‌ی کامل' : 'ورود به آسومی'} <span aria-hidden="true">↗</span>
			</a>
		</header>
		<div className="role-live-preview-frame">
			<div className="role-live-preview-bar" aria-hidden="true">
				<span className="role-live-preview-lights"><i /><i /><i /></span>
				<span className="role-live-preview-path">آسومی <b>/</b> {sectionLabel}</span>
				<span className="role-live-preview-status" aria-live="polite"><i /> {isAuthenticated ? (isLoading ? 'در حال اتصال' : 'نمای زنده') : 'ورود لازم است'}
				</span>
			</div>
			<div className="role-live-preview-stage">
				{isAuthenticated ? <>
					<iframe
						key={entryHref}
						className="role-live-preview-iframe"
						title={`محیط واقعی آسومی برای ${roleLabel}، ${sectionLabel}`}
						src={entryHref}
						loading="lazy"
						referrerPolicy="strict-origin-when-cross-origin"
						onLoad={() => setLoadedHref(entryHref)}
					/>
					{isLoading && <div className="role-live-preview-loading" role="status">در حال بارگذاری نمای واقعی Accounts…</div>}
				</> : <div className="role-live-preview-guest">
					<div className="role-live-preview-guest-card">
						<p className="role-live-preview-guest-eyebrow">محیط واقعی آسومی · Accounts</p>
						<h4>برای دیدن صفحه‌ی واقعی وارد شو</h4>
						<p>پس از ورود، همین قاب صفحه و دسترسی‌های حساب خودت را نشان می‌دهد.</p>
						<a href={viewHref} target="_blank" rel="noopener noreferrer" className="role-live-preview-login">ورود برای مشاهده‌ی پنل</a>
					</div>
				</div>}
			</div>
		</div>
		<p className="role-live-preview-note">
			این قاب از همان Accounts باز می‌شود و مجوزهای واقعی همان حساب را رعایت می‌کند. انتخاب نقش در این صفحه شما را به‌جای کاربر دیگری وارد نمی‌کند؛ برای دیدن دسترسی دقیق مدیر دیگر، باید با حساب همان نقش وارد شوید. اگر وارد نشده باشید، صفحه‌ی ورود نمایش داده می‌شود.
		</p>
	</section>;
}
