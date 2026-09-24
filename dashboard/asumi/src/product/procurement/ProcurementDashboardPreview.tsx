import './procurement-dashboard-preview.css';

type ProcurementDashboardPreviewProps = {
	entryHref: string;
};

export function getAccountsPreviewHref(entryHref: string, pagePath = window.location.pathname) {
	if (!pagePath.startsWith('/assets/press/asumi_site/')) return entryHref;
	return new URL(entryHref, 'http://asumi:8000').toString();
}

export function ProcurementDashboardPreview({ entryHref }: ProcurementDashboardPreviewProps) {
	const accountsHref = getAccountsPreviewHref(entryHref);

	return <section className="procurement-dashboard-preview" aria-labelledby="procurement-dashboard-preview-title">
		<header className="procurement-preview-intro">
			<div>
				<p className="procurement-guide-eyebrow">خودِ محصول، نه تصویر نمونه</p>
				<h2 id="procurement-dashboard-preview-title">داشبورد خرید در Accounts</h2>
				<p>این همان صفحه‌ی برنامه‌ی آسومیه است؛ اطلاعات، ابزارها و دسترسی‌ها را خودِ Accounts نمایش می‌دهد.</p>
			</div>
			<a className="procurement-preview-open" href={accountsHref} target="_blank" rel="noreferrer">
				بازکردن در صفحه‌ی کامل <span aria-hidden="true">↗</span>
			</a>
		</header>

		<div className="procurement-preview-frame-wrap">
			<div className="procurement-preview-frame-bar" aria-hidden="true">
				<span className="procurement-preview-frame-lights"><i /><i /><i /></span>
				<span className="procurement-preview-frame-label">Accounts <b>/</b> خرید و تدارکات</span>
				<span className="procurement-preview-live"><i /> برنامه‌ی واقعی</span>
			</div>
			<iframe
				className="procurement-preview-frame"
				title="پیش‌نمایش زنده‌ی داشبورد خرید در برنامه‌ی Accounts"
				src={accountsHref}
				loading="lazy"
				referrerPolicy="strict-origin-when-cross-origin"
			/>
		</div>

		<p className="procurement-preview-note">
			برای دیدن داده‌های شرکت، باید در Accounts وارد شده باشید؛ اطلاعات این قاب مطابق حساب و سطح دسترسی شماست.
		</p>
	</section>;
}
