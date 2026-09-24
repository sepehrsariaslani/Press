import { useEffect, useState } from 'react';
import { SiteFooter } from '../components/site/SiteFooter';
import { SiteHeader } from '../components/site/SiteHeader';
import { PortalAdmin } from './PortalAdmin';
import { getPortalAdminAccess } from './portalApi';
import './customer-portal.css';

type Props = {
	onOpenCustomerPortal: () => void;
	onReturnToModules: () => void;
};

type AdminAccess = { can_manage_catalog: boolean; can_manage_support: boolean };

export function PortalAdminPage({ onOpenCustomerPortal, onReturnToModules }: Props) {
	const [access, setAccess] = useState<AdminAccess | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [reload, setReload] = useState(0);

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		getPortalAdminAccess(controller.signal)
			.then(result => { if (!controller.signal.aborted) { setAccess(result); setError(''); } })
			.catch(caught => { if (!controller.signal.aborted) setError(messageOf(caught)); })
			.finally(() => { if (!controller.signal.aborted) setLoading(false); });
		return () => controller.abort();
	}, [reload]);

	const hasAccess = Boolean(access?.can_manage_catalog || access?.can_manage_support);
	const loginRequired = error === 'برای ادامه وارد حساب آسومی شو.';

	return <main className="customer-portal customer-portal--admin" dir="rtl" aria-labelledby="customer-portal-title">
		<SiteHeader variant="paper" onReturnToModules={onReturnToModules} showSiteNavigation={false} showEntryLink={false} actions={<span className="customer-portal-header-label">مدیریت پلتفرم آسومی</span>} />
		<div className="customer-portal-inner">
			<nav className="customer-portal-breadcrumb" aria-label="مسیر صفحه">
				<button type="button" onClick={onOpenCustomerPortal}>پنل مشتری</button><span aria-hidden="true">/</span><span aria-current="page">مدیریت آسومی</span>
			</nav>
			<header className="customer-portal-heading">
				<div><p className="customer-portal-eyebrow"><span aria-hidden="true" />فضای داخلی تیم آسومی</p><h1 id="customer-portal-title">مدیریت کاتالوگ، <span>پشتیبانی و دسترسی‌ها.</span></h1><p>کاتالوگ و درخواست‌های مشتریان را از محیط مدیریتی جداگانه پیگیری کن.</p></div>
				<button className="customer-portal-refresh" type="button" onClick={onOpenCustomerPortal}>بازگشت به پنل مشتری</button>
			</header>
			{loading ? <section className="customer-portal-state" role="status">در حال بررسی دسترسی مدیریتی…</section>
				: error ? <section className="customer-portal-state customer-portal-state--error" role="alert"><h2>{loginRequired ? 'برای مدیریت آسومی وارد حساب شو' : 'دسترسی مدیریتی دریافت نشد'}</h2><p>{error}</p><div className="customer-portal-state-actions">{loginRequired && <a className="customer-portal-primary" href="/login?redirect-to=%2F%23admin">ورود به حساب آسومی</a>}<button type="button" onClick={() => setReload(value => value + 1)}>تلاش دوباره</button></div></section>
				: !access || !hasAccess ? <section className="customer-portal-state customer-portal-state--error" role="alert"><h2>این بخش فقط برای تیم آسومی است</h2><p>حساب تو دسترسی مدیریت کاتالوگ یا پشتیبانی را ندارد.</p><button type="button" onClick={onOpenCustomerPortal}>بازگشت به پنل مشتری</button></section>
				: <PortalAdmin canManageCatalog={access.can_manage_catalog} canManageSupport={access.can_manage_support} />}
		</div>
		<SiteFooter customerPortal label="مدیریت آسومی" />
	</main>;
}

function messageOf(error: unknown) {
	return error instanceof Error ? error.message : 'دسترسی مدیریتی دریافت نشد.';
}
