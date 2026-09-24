import { useEffect, useState } from 'react';
import { productModules } from '../product/modules';
import { getInstallHistory, type PortalSite, type PortalSubscription } from './portalApi';

type Props = { subscriptions: PortalSubscription[]; sites: PortalSite[]; canManageBilling: boolean; onOpenModules: () => void; onRequestCancellation: (subscription: PortalSubscription) => void; onRequestPeriodReview: (subscription: PortalSubscription) => void };
type InstallEvent = { name: string; app: string; job: string | null; status: string; creation: string; site: string; siteLabel: string };

const statusLabels: Record<string, string> = { Active: 'فعال', Inactive: 'متوقف', Disabled: 'غیرفعال', Provisioning: 'در حال نصب', 'Needs Attention': 'نیازمند پیگیری', Pending: 'در صف', Running: 'در حال اجرا', Success: 'موفق', Failure: 'ناموفق', 'Delivery Failure': 'خطای ارتباط' };

export function PurchasesView({ subscriptions, sites, canManageBilling, onOpenModules, onRequestCancellation, onRequestPeriodReview }: Props) {
	const [history, setHistory] = useState<InstallEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		Promise.all(sites.map(async site => {
			try {
				const events = await getInstallHistory(site.name, controller.signal);
				return events.map(event => ({ ...event, site: site.name, siteLabel: site.label }));
			} catch (caught) {
				if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'تاریخچهٔ نصب دریافت نشد.');
				return [];
			}
		})).then(groups => {
			if (!controller.signal.aborted) setHistory(groups.flat().sort((a, b) => b.creation.localeCompare(a.creation)));
		}).finally(() => { if (!controller.signal.aborted) setLoading(false); });
		return () => controller.abort();
	}, [sites]);

	return <div className="customer-portal-workspace">
		<section className="customer-portal-panel" aria-labelledby="portal-purchases-title">
			<div className="customer-portal-panel-heading"><div><p>خریدهای ثبت‌شده</p><h2 id="portal-purchases-title">اشتراک‌ها و پلن‌ها</h2></div><button type="button" onClick={onOpenModules}>مدیریت ماژول‌ها</button></div>
			{subscriptions.length ? <div className="customer-portal-subscription-list">{subscriptions.map(subscription => <SubscriptionItem key={subscription.name} subscription={subscription} canManageBilling={canManageBilling} onRequestCancellation={onRequestCancellation} onRequestPeriodReview={onRequestPeriodReview} />)}</div> : <div className="customer-portal-inline-state">هنوز خرید یا اشتراکی ثبت نشده است؛ از کاتالوگ، ماژول‌های قابل خرید را ببین.</div>}
		</section>
		<section className="customer-portal-panel" aria-labelledby="portal-install-history-title">
			<div className="customer-portal-panel-heading"><div><p>پیگیری نصب</p><h2 id="portal-install-history-title">تاریخچهٔ درخواست‌های نصب</h2></div><span>{new Intl.NumberFormat('fa-IR').format(history.length)} مورد</span></div>
			<p className="customer-portal-help-copy">درخواست نصب، در صف، در حال اجرا و نتیجهٔ نهایی هر سایت را از همین‌جا دنبال کن.</p>
			{error && <div className="customer-portal-inline-error" role="alert">{error}</div>}
			{loading ? <div className="customer-portal-inline-state" role="status">در حال دریافت سابقهٔ نصب…</div> : history.length ? <div className="customer-portal-install-history">{history.map(item => <article className="customer-portal-install-row" key={`${item.site}:${item.name}`}><div><strong>{appTitle(item.app)}</strong><small>{item.siteLabel} · {formatDateTime(item.creation)}</small></div><span className="customer-portal-status" data-status={item.status.toLowerCase().replaceAll(' ', '-')}>{statusLabels[item.status] || item.status}</span></article>)}</div> : <div className="customer-portal-inline-state">برای سایت‌های این تیم سابقهٔ نصبی پیدا نشد.</div>}
		</section>
	</div>;
}

function SubscriptionItem({ subscription, canManageBilling, onRequestCancellation, onRequestPeriodReview }: { subscription: PortalSubscription; canManageBilling: boolean; onRequestCancellation: (subscription: PortalSubscription) => void; onRequestPeriodReview: (subscription: PortalSubscription) => void }) {
	return <article className="customer-portal-subscription-card"><div className="customer-portal-subscription-head"><div><small>{subscription.site_label || subscription.site || 'بدون سایت مشخص'}</small><h3>{subscription.app_title}</h3></div><span className="customer-portal-status" data-status={subscription.status.toLowerCase().replaceAll(' ', '-')}>{statusLabels[subscription.status] || subscription.status}</span></div><div className="customer-portal-plan-line"><span>پلن</span><strong>{subscription.selected_plan?.title || 'پلن ثبت‌شده'}</strong><small>{subscription.interval ? intervalLabel[subscription.interval] || subscription.interval : ''}</small></div><div className="customer-portal-subscription-dates"><span>شروع: {formatDate(subscription.start_date)}</span><span>پایان دوره: {formatDate(subscription.end_date)}</span></div>{subscription.billing_period_mismatch && <div className="customer-portal-period-review"><span>دورهٔ قیمت پلن ({intervalLabel[subscription.plan_interval || ''] || subscription.plan_interval}) با دورهٔ صورتحساب فعلی ({intervalLabel[subscription.interval || ''] || subscription.interval}) یکی نیست.</span><button type="button" onClick={() => onRequestPeriodReview(subscription)}>درخواست بررسی</button></div>}{canManageBilling && ['Active', 'Provisioning', 'Needs Attention'].includes(subscription.status) && <div className="customer-portal-subscription-actions"><button type="button" className="customer-portal-text-button" onClick={() => onRequestCancellation(subscription)}>درخواست لغو اشتراک</button><small>لغو پس از بررسی و تأیید آسومی انجام می‌شود.</small></div>}</article>;
}

function appTitle(slug: string) { return productModules.find(module => module.id === slug)?.title || slug; }
function formatDate(value: string | null) { if (!value) return '—'; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'short', day: 'numeric' }).format(date); }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date); }
const intervalLabel: Record<string, string> = { Hourly: 'ساعتی', Monthly: 'ماهانه', Annual: 'سالانه', Annually: 'سالانه', Daily: 'روزانه با نرخ ماهانه' };
