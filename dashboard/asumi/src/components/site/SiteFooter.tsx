import './site-shell.css';

export function SiteFooter({ customerPortal = false, label = 'پنل مشتری' }: { customerPortal?: boolean; label?: string }) {
	return <footer className={`asumi-site-footer${customerPortal ? ' asumi-site-footer--portal' : ''}`} dir="rtl">
		{customerPortal ? <div className="asumi-site-footer-main"><div className="asumi-footer-brand"><span className="brand-signal" aria-hidden="true"><i /><i /><i /></span><div><strong>آسومی</strong><small>{label}</small></div></div></div> : <div className="asumi-site-footer-main">
			<div className="asumi-footer-brand"><span className="brand-signal" aria-hidden="true"><i /><i /><i /></span><div><strong>آسومی</strong><small>ERP یکپارچه‌ی کسب‌وکار</small></div></div>
			<p>از ثبت روزانه تا دید روشن‌تر برای تصمیم؛ بخش‌های کسب‌وکار را در یک مسیر متصل ببین.</p>
			<nav aria-label="پیوندهای پایین صفحه">
				<a href="#roles">داشبوردها</a>
				<a href="#modules">ماژول‌ها</a>
				<a href="#industries">صنایع</a>
				<a href="#pricing">تعرفه‌ها</a>
			</nav>
			<a className="asumi-footer-entry" href="/hesab">ورود به آسومی <span aria-hidden="true">↗</span></a>
		</div>}
		<div className="asumi-site-footer-bottom"><span>آسومی · به‌سوی آینده‌ی روشن</span><a href={customerPortal ? '#customer-portal-title' : '#chaos'}>بازگشت به ابتدای صفحه ↑</a></div>
	</footer>;
}
