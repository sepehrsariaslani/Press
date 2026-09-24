import { useEffect, useState } from 'react';
import { productModules } from '../product/modules';
import { getInstallHistory, getInstallStatus, uninstallMarketplaceApp, type PortalSite, type PortalSubscription } from './portalApi';

type Props = {
	subscriptions: PortalSubscription[];
	sites: PortalSite[];
	canManageBilling: boolean;
	onOpenModules: () => void;
	onOpenBilling: () => void;
	onRequestInstallationSupport: (site: string, siteLabel: string, app: string, status: string, attemptedAt: string) => void;
	onRequestCancellation: (subscription: PortalSubscription) => void;
	onRequestPeriodReview: (subscription: PortalSubscription) => void;
	onRefresh: () => void;
};

type AppActivity = {
	name: string;
	app: string;
	action: string;
	job: string | null;
	status: string;
	creation: string;
	app_title: string | null;
	site: string;
	siteLabel: string;
};

type PendingRemoval = { site: string; app: string; title: string; job: string };

const statusLabels: Record<string, string> = {
	Active: 'فعال', Inactive: 'متوقف', Disabled: 'غیرفعال', Provisioning: 'در حال نصب',
	'Cancellation Pending': 'در حال لغو', 'Needs Attention': 'نیازمند پیگیری',
	Pending: 'ثبت‌شده', Running: 'در حال آماده‌سازی', Success: 'کامل شد', Failure: 'کامل نشد', 'Delivery Failure': 'در انتظار تکمیل اتصال', Unknown: 'در انتظار بررسی',
};
const intervalLabel: Record<string, string> = { Hourly: 'ساعتی', Monthly: 'ماهانه', Annual: 'سالانه', Annually: 'سالانه', Daily: 'روزانه با نرخ ماهانه' };

export function PurchasesView({ subscriptions, sites, canManageBilling, onOpenModules, onOpenBilling, onRequestInstallationSupport, onRequestCancellation, onRequestPeriodReview, onRefresh }: Props) {
	const [history, setHistory] = useState<AppActivity[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [reloadToken, setReloadToken] = useState(0);
	const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
	const [busyApp, setBusyApp] = useState('');

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		Promise.all(sites.map(async site => {
			try {
				const events = await getInstallHistory(site.name, controller.signal);
				return events.map(event => ({ ...event, site: site.name, siteLabel: site.label }));
			} catch (caught) {
				if (!controller.signal.aborted) setError(messageOf(caught, 'تاریخچهٔ عملیات دریافت نشد.'));
				return [];
			}
		})).then(groups => {
			if (controller.signal.aborted) return;
			const events = groups.flat().sort((a, b) => b.creation.localeCompare(a.creation));
			setHistory(events);
			const pending = events.find(event => event.action === 'Uninstall App' && event.job && ['Pending', 'Running'].includes(event.status));
			if (pending?.job) setPendingRemoval(current => current || { site: pending.site, app: pending.app, title: appTitle(pending.app, pending.app_title), job: pending.job as string });
		}).finally(() => { if (!controller.signal.aborted) setLoading(false); });
		return () => controller.abort();
	}, [sites, reloadToken]);

	useEffect(() => {
		if (!pendingRemoval) return;
		const timer = window.setTimeout(() => {
			getInstallStatus(pendingRemoval.site, pendingRemoval.job).then(result => {
				if (['Success', 'Failure', 'Delivery Failure'].includes(result.status)) {
					setPendingRemoval(null);
					setNotice(result.status === 'Success'
						? `«${pendingRemoval.title}» از سایت حذف شد و اشتراکش غیرفعال شد.`
						: 'حذف کامل نشد؛ از تاریخچه می‌توانی دوباره تلاش کنی یا از پشتیبانی کمک بگیری.');
					setReloadToken(value => value + 1);
					onRefresh();
				} else setPendingRemoval({ ...pendingRemoval });
			}).catch(caught => {
				setError(messageOf(caught, 'وضعیت حذف دریافت نشد.'));
				setPendingRemoval(current => current ? { ...current } : null);
			});
		}, 5000);
		return () => window.clearTimeout(timer);
	}, [pendingRemoval, onRefresh]);

	async function cancelSubscription(subscription: PortalSubscription) {
		if (!subscription.site || subscription.site_status !== 'Active') {
			onRequestCancellation(subscription);
			return;
		}
		const siteLabel = subscription.site_label || subscription.site;
		const confirmed = window.confirm(`ماژول «${subscription.app_title}» از سایت ${siteLabel} حذف و اشتراک آن غیرفعال شود؟ پس از تأیید، کاربران آن سایت دیگر به این ماژول دسترسی نخواهند داشت.`);
		if (!confirmed) return;
		await removeApp(subscription.site, subscription.app, subscription.app_title);
	}

	async function retryRemoval(item: AppActivity) {
		if (!window.confirm(`حذف «${appTitle(item.app, item.app_title)}» از سایت ${item.siteLabel} دوباره اجرا شود؟`)) return;
		await removeApp(item.site, item.app, appTitle(item.app, item.app_title));
	}

	async function removeApp(site: string, app: string, title: string) {
		setBusyApp(app); setError(''); setNotice('');
		try {
			const job = await uninstallMarketplaceApp(site, app);
			setPendingRemoval({ site, app, title, job });
			setNotice(`درخواست حذف «${title}» ثبت شد؛ وضعیت را در همین صفحه پیگیری می‌کنیم.`);
			setReloadToken(value => value + 1);
			onRefresh();
		} catch (caught) { setError(messageOf(caught, 'درخواست حذف ثبت نشد.')); }
		finally { setBusyApp(''); }
	}

	return <div className="customer-portal-workspace">
		<section className="customer-portal-panel" aria-labelledby="portal-purchases-title">
			<div className="customer-portal-panel-heading"><div><p>خریدهای ثبت‌شده</p><h2 id="portal-purchases-title">اشتراک‌ها و پلن‌ها</h2></div><button type="button" onClick={onOpenModules}>مدیریت ماژول‌ها</button></div>
			{error && <div className="customer-portal-inline-error" role="alert"><span>{error}</span><button type="button" onClick={() => { setError(''); setReloadToken(value => value + 1); }}>تلاش دوباره</button></div>}
			{notice && <p className="customer-portal-inline-status" role="status">{notice}</p>}
			{pendingRemoval && <div className="customer-portal-install-progress" role="status"><span className="customer-portal-spinner" aria-hidden="true" /><div><strong>در حال حذف {pendingRemoval.title}</strong><p>اشتراک متوقف شده؛ منتظر تأیید نتیجهٔ حذف سایت هستیم.</p></div></div>}
			{subscriptions.length ? <div className="customer-portal-subscription-list">{subscriptions.map(subscription => <SubscriptionItem key={subscription.name} subscription={subscription} canManageBilling={canManageBilling} onOpenBilling={onOpenBilling} busy={busyApp === subscription.app || pendingRemoval?.app === subscription.app} onCancel={() => void cancelSubscription(subscription)} onRequestPeriodReview={onRequestPeriodReview} />)}</div> : <div className="customer-portal-inline-state">هنوز خرید یا اشتراکی ثبت نشده است؛ از کاتالوگ، ماژول‌های قابل خرید را ببین.</div>}
		</section>

		<section className="customer-portal-panel" aria-labelledby="portal-install-history-title">
			<div className="customer-portal-panel-heading"><div><p>پیگیری عملیات</p><h2 id="portal-install-history-title">تاریخچهٔ نصب و حذف</h2></div><span>{new Intl.NumberFormat('fa-IR').format(history.length)} مورد</span></div>
			<p className="customer-portal-help-copy">وضعیت نصب یا حذف ماژول‌ها را ببین؛ اگر نصب کامل نشد، جزئیات همان تلاش را برای تیم پشتیبانی بفرست.</p>
			{loading ? <div className="customer-portal-inline-state" role="status">در حال دریافت سابقهٔ عملیات…</div> : history.length ? <div className="customer-portal-install-history">{history.map(item => <article className="customer-portal-install-row" key={`${item.site}:${item.name}`}><div><strong>{item.action === 'Uninstall App' ? 'حذف' : 'نصب'} · {appTitle(item.app, item.app_title)}</strong><small>{item.siteLabel} · {formatDateTime(item.creation)}</small></div><span className="customer-portal-status" data-status={item.status.toLowerCase().replaceAll(' ', '-')}>{statusLabels[item.status] || item.status}</span>{canManageBilling && item.action === 'Uninstall App' && ['Failure', 'Delivery Failure'].includes(item.status) && <button type="button" className="customer-portal-text-button" disabled={busyApp === item.app} onClick={() => void retryRemoval(item)}>تلاش دوباره</button>}{item.action === 'Install App' && ['Failure', 'Delivery Failure'].includes(item.status) && <button type="button" className="customer-portal-text-button" onClick={() => onRequestInstallationSupport(item.site, item.siteLabel, appTitle(item.app, item.app_title), statusLabels[item.status] || item.status, item.creation)}>پیگیری با پشتیبانی</button>}</article>)}</div> : <div className="customer-portal-inline-state">برای سایت‌های این تیم سابقهٔ نصب یا حذف پیدا نشد.</div>}
		</section>
	</div>;
}

function SubscriptionItem({ subscription, canManageBilling, onOpenBilling, busy, onCancel, onRequestPeriodReview }: { subscription: PortalSubscription; canManageBilling: boolean; onOpenBilling: () => void; busy: boolean; onCancel: () => void; onRequestPeriodReview: (subscription: PortalSubscription) => void }) {
	return <article className="customer-portal-subscription-card">
		<div className="customer-portal-subscription-head"><div><small>{subscription.site_label || subscription.site || 'بدون سایت مشخص'}</small><h3>{subscription.app_title}</h3></div><span className="customer-portal-status" data-status={subscription.status.toLowerCase().replaceAll(' ', '-')}>{statusLabels[subscription.status] || subscription.status}</span></div>
		<div className="customer-portal-plan-line"><span>پلن</span><strong>{subscription.selected_plan?.title || 'پلن ثبت‌شده'}</strong><small>{subscription.interval ? intervalLabel[subscription.interval] || subscription.interval : ''}</small></div>
		{subscription.payment_status === 'Unpaid' && <div className="customer-portal-payment-alert"><span>فاکتور {subscription.pending_invoice} پرداخت‌نشده است.</span>{canManageBilling ? <button type="button" onClick={onOpenBilling}>دیدن فاکتور و پرداخت</button> : <small>برای پیگیری پرداخت با مدیر مالی تیم تماس بگیر.</small>}</div>}
		<div className="customer-portal-subscription-dates"><span>شروع: {formatDate(subscription.start_date)}</span><span>{['Active', 'Provisioning'].includes(subscription.status) ? `چرخهٔ جاری تا: ${formatDate(subscription.end_date)}` : subscription.status === 'Cancellation Pending' ? 'در حال حذف از سایت' : 'اشتراک فعال نیست'}</span></div>
		{subscription.billing_period_mismatch && <div className="customer-portal-period-review"><span>دورهٔ قیمت پلن ({intervalLabel[subscription.plan_interval || ''] || subscription.plan_interval}) با دورهٔ صورتحساب فعلی ({intervalLabel[subscription.interval || ''] || subscription.interval}) یکی نیست.</span><button type="button" onClick={() => onRequestPeriodReview(subscription)}>درخواست بررسی</button></div>}
		{canManageBilling && ['Active', 'Provisioning', 'Needs Attention'].includes(subscription.status) && <div className="customer-portal-subscription-actions"><button type="button" className="customer-portal-text-button" disabled={busy} onClick={onCancel}>{busy ? 'در حال ثبت…' : 'لغو و حذف ماژول'}</button><small>{subscription.site_status === 'Active' ? 'با تأیید، ماژول از سایت حذف و تمدید اشتراک متوقف می‌شود.' : 'سایت آمادهٔ حذف مستقیم نیست؛ درخواست به پشتیبانی فرستاده می‌شود.'}</small></div>}
	</article>;
}

function appTitle(slug: string, title?: string | null) { return productModules.find(module => module.id === slug)?.title || title || 'افزونهٔ سایت'; }
function formatDate(value: string | null) { if (!value) return '—'; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'short', day: 'numeric' }).format(date); }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date); }
function messageOf(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }
