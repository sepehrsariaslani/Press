import { useCallback, useEffect, useMemo, useState } from 'react';
import { SiteFooter } from '../components/site/SiteFooter';
import { SiteHeader } from '../components/site/SiteHeader';
import { BillingView } from './BillingView';
import { ModuleStore } from './ModuleStore';
import { PortalAdmin } from './PortalAdmin';
import { PurchasesView } from './PurchasesView';
import { SupportView } from './SupportView';
import { TeamView } from './TeamView';
import { getCustomerPortalData, type CustomerPortalData, type PortalSite, type PortalSubscription } from './portalApi';
import './customer-portal.css';

type CustomerPortalProps = {
	onOpenPricing: () => void;
	onReturnToModules: () => void;
};

type PortalView = 'overview' | 'modules' | 'purchases' | 'billing' | 'team' | 'support' | 'admin';
type PortalIntent = { moduleIds: string[]; context: string };

const subscriptionStatus: Record<string, string> = { Active: 'فعال', Inactive: 'متوقف', Disabled: 'غیرفعال' };
const siteStatus: Record<string, string> = { Active: 'فعال', Inactive: 'غیرفعال', Pending: 'در صف آماده‌سازی', Installing: 'در حال نصب', Suspended: 'متوقف', Broken: 'نیازمند پیگیری', Archived: 'بایگانی‌شده' };
const viewLabels: Record<PortalView, string> = {
	overview: 'نمای کلی', modules: 'ماژول‌ها', purchases: 'خریدها و اشتراک‌ها', billing: 'فاکتورها', team: 'اعضا و دسترسی', support: 'پشتیبانی', admin: 'مدیریت آسومی',
};

function readPortalIntent(): PortalIntent {
	try {
		const value = JSON.parse(window.localStorage.getItem('asumi-portal-intent') || 'null') as Partial<PortalIntent> | null;
		return { moduleIds: Array.isArray(value?.moduleIds) ? value.moduleIds.filter((id): id is string => typeof id === 'string') : [], context: typeof value?.context === 'string' ? value.context : '' };
	} catch {
		return { moduleIds: [], context: '' };
	}
}

function readSelectedSite() {
	try { return window.localStorage.getItem('asumi-portal-site') || ''; } catch { return ''; }
}

export function CustomerPortal({ onOpenPricing, onReturnToModules }: CustomerPortalProps) {
	const [data, setData] = useState<CustomerPortalData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [intent, setIntent] = useState(readPortalIntent);
	const [view, setView] = useState<PortalView>(() => intent.moduleIds.length ? 'support' : 'overview');
	const [selectedSite, setSelectedSite] = useState(readSelectedSite);
	const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
	const activeSubscriptionCount = useMemo(() => (data?.subscriptions || []).filter(item => item.status === 'Active').length, [data]);
	const inactiveSubscriptionCount = data?.subscriptions.filter(item => item.status !== 'Active').length || 0;

	const refreshPortal = useCallback(async (signal?: AbortSignal) => {
		setLoading(true);
		setError('');
		try {
			const next = await getCustomerPortalData(signal);
			setData(next);
			setUpdatedAt(new Date());
		} catch (caught) {
			if (!signal?.aborted) setError(caught instanceof Error ? caught.message : 'اطلاعات پنل دریافت نشد.');
		} finally {
			if (!signal?.aborted) setLoading(false);
		}
	}, []);
	const refreshPortalFromChild = useCallback(() => { void refreshPortal(); }, [refreshPortal]);

	useEffect(() => {
		const controller = new AbortController();
		void refreshPortal(controller.signal);
		return () => controller.abort();
	}, [refreshPortal]);

	useEffect(() => {
		try { window.localStorage.removeItem('asumi-portal-intent'); } catch { /* The route is already open; storage cleanup is optional. */ }
	}, []);

	useEffect(() => {
		if (!data) return;
		const savedSiteExists = data.sites.some(site => site.name === selectedSite);
		if (savedSiteExists) return;
		const firstAvailableSite = data.sites.find(site => site.status === 'Active') || data.sites[0];
		const nextSite = firstAvailableSite?.name || '';
		setSelectedSite(nextSite);
		try {
			if (nextSite) window.localStorage.setItem('asumi-portal-site', nextSite);
			else window.localStorage.removeItem('asumi-portal-site');
		} catch { /* Site selection still works for the current visit. */ }
	}, [data, selectedSite]);

	useEffect(() => {
		if (data && !data.can_manage_billing && view === 'billing') setView('overview');
	}, [data, view]);

	function selectSite(site: string) {
		setSelectedSite(site);
		try {
			if (site) window.localStorage.setItem('asumi-portal-site', site);
			else window.localStorage.removeItem('asumi-portal-site');
		} catch { /* Site selection still works for the current visit. */ }
	}

	function openPricing() {
		try { window.localStorage.setItem('asumi-pricing-from-portal', '1'); } catch { /* Navigation can continue without the return hint. */ }
		onOpenPricing();
	}

	const selectedSiteData = data?.sites.find(site => site.name === selectedSite) || null;
	const canSeeAdmin = Boolean(data?.can_manage_catalog || data?.can_manage_support);

	return <main className="customer-portal" dir="rtl" aria-labelledby="customer-portal-title">
		<SiteHeader variant="paper" onReturnToModules={onReturnToModules} onOpenPricing={openPricing} actions={<span className="customer-portal-header-label">پنل مشتری آسومی</span>} />
		<div className="customer-portal-inner">
			<nav className="customer-portal-breadcrumb" aria-label="مسیر صفحه">
				<button type="button" onClick={onReturnToModules}>معرفی آسومی</button><span aria-hidden="true">/</span><span aria-current="page">پنل مشتری</span>
			</nav>

			<header className="customer-portal-heading">
				<div><p className="customer-portal-eyebrow"><span aria-hidden="true" />فضای اختصاصی مشتری</p><h1 id="customer-portal-title">خدمات آسومی، <span>روشن و در دسترس.</span></h1><p>سایت، ماژول، اشتراک، فاکتور و دسترسی تیم را از همین‌جا مدیریت کن.</p></div>
				<button className="customer-portal-refresh" type="button" onClick={() => void refreshPortal()} disabled={loading}>{loading ? 'در حال به‌روزرسانی…' : 'به‌روزرسانی وضعیت'}</button>
			</header>

			{!error && <nav className="customer-portal-tabs" aria-label="بخش‌های پنل">
				{(['overview', 'modules', 'purchases', ...(data?.can_manage_billing ? ['billing' as const] : []), 'team', 'support'] as PortalView[]).map(item => <button key={item} type="button" aria-current={view === item ? 'page' : undefined} onClick={() => { if (item === 'support' && view !== 'support') setIntent({ moduleIds: [], context: '' }); setView(item); }}>{viewLabels[item]}</button>)}
				{canSeeAdmin && <button className="customer-portal-admin-tab" type="button" aria-current={view === 'admin' ? 'page' : undefined} onClick={() => setView('admin')}>مدیریت آسومی</button>}
			</nav>}

			{error ? <section className="customer-portal-state customer-portal-state--error" role="alert"><h2>برای دیدن خدماتت وارد حساب آسومی شو</h2><p>{error}</p><div className="customer-portal-state-actions"><a className="customer-portal-primary" href="/hesab">ورود به حساب</a><button type="button" onClick={() => void refreshPortal()}>تلاش دوباره</button></div></section>
				: loading && !data ? <section className="customer-portal-state" aria-live="polite">در حال دریافت اطلاعات سرویس‌ها…</section>
				: data ? <>
					<div className="customer-portal-team-line">
						<div><span>فضای کاری</span><strong>{data.team?.title || 'حساب آسومی'}</strong></div>
						<div className="customer-portal-site-switcher"><label htmlFor="portal-current-site">سایت فعال</label><select id="portal-current-site" value={selectedSite} onChange={event => selectSite(event.target.value)}><option value="">انتخاب سایت</option>{data.sites.map(site => <option key={site.name} value={site.name}>{site.label} · {siteStatus[site.status] || site.status}</option>)}</select></div>
						{updatedAt && <small>آخرین بررسی: {formatDateTime(updatedAt)}</small>}
					</div>
					{view === 'overview' && <Overview data={data} activeSubscriptionCount={activeSubscriptionCount} inactiveSubscriptionCount={inactiveSubscriptionCount} onOpenView={setView} onOpenPricing={openPricing} />}
					{view === 'modules' && <ModuleStore currency={data.team.currency} teamName={data.team.name} sites={data.sites} selectedSite={selectedSite} siteStatus={selectedSiteData?.status || null} onSelectSite={selectSite} onRequestPurchase={moduleIds => { setIntent({ moduleIds, context: '' }); setView('support'); }} onOpenPricing={openPricing} onRefresh={refreshPortalFromChild} />}
					{view === 'purchases' && <PurchasesView subscriptions={data.subscriptions} sites={data.sites} onOpenModules={() => setView('modules')} />}
					{view === 'billing' && data.can_manage_billing && <BillingView onAskSupport={invoice => { setIntent({ moduleIds: [], context: invoice ? `درخواست پیگیری فاکتور ${invoice.name} به مبلغ ${formatCurrency(invoice.amount_due, invoice.currency)}.` : 'درخواست کمک برای صورتحساب و پرداخت.' }); setView('support'); }} />}
					{view === 'team' && <TeamView />}
					{view === 'support' && <SupportView key={`${intent.moduleIds.join(',')}:${intent.context}`} sites={data.sites} selectedSite={selectedSite} initialPurchaseModuleIds={intent.moduleIds} initialContext={intent.context} />}
					{view === 'admin' && canSeeAdmin && <PortalAdmin canManageCatalog={data.can_manage_catalog} canManageSupport={data.can_manage_support} />}
				</> : null}
		</div>
		<SiteFooter />
	</main>;
}

function Overview({ data, activeSubscriptionCount, inactiveSubscriptionCount, onOpenView, onOpenPricing }: { data: CustomerPortalData; activeSubscriptionCount: number; inactiveSubscriptionCount: number; onOpenView: (view: PortalView) => void; onOpenPricing: () => void }) {
	const activeSubscriptions = data.subscriptions.filter(item => item.status === 'Active');
	const attentionCount = data.sites.filter(site => ['Broken', 'Suspended', 'Pending', 'Installing'].includes(site.status)).length + inactiveSubscriptionCount;
	return <>
		<section className="customer-portal-metrics" aria-label="وضعیت فعلی">
			<Metric label="سایت‌های متصل" value={toPersian(data.sites.length)} detail="فضاهای کاری تیم" />
			<Metric label="اشتراک‌های فعال" value={toPersian(activeSubscriptionCount)} detail="سرویس‌های در حال ارائه" />
			<Metric label="خریدها و اشتراک‌ها" value={toPersian(data.subscriptions.length)} detail="ثبت‌شده برای تیم" />
			<Metric label="موارد نیازمند توجه" value={toPersian(attentionCount)} detail={attentionCount ? 'وضعیت سایت یا اشتراک را بررسی کن' : 'همه‌چیز به‌روز است'} />
		</section>

		<div className="customer-portal-content-grid">
			<section className="customer-portal-panel" aria-labelledby="portal-sites-title"><div className="customer-portal-panel-heading"><div><p>سرویس‌های میزبانی</p><h2 id="portal-sites-title">سایت‌های تو</h2></div><button type="button" onClick={() => onOpenView('modules')}>مدیریت ماژول‌ها</button></div>
				{data.sites.length ? <div className="customer-portal-site-list">{data.sites.slice(0, 5).map(site => <article className="customer-portal-site" key={site.name}><div><strong>{site.label}</strong><small>{site.name}</small></div><StatusPill status={site.status} label={siteStatus[site.status] || 'در حال آماده‌سازی'} /></article>)}</div> : <EmptyState title="هنوز سایتی متصل نیست" description="بعد از ثبت سایت، وضعیت میزبانی‌اش را همین‌جا می‌بینی." />}
			</section>

			<section className="customer-portal-panel" aria-labelledby="portal-modules-title"><div className="customer-portal-panel-heading"><div><p>اشتراک و دسترسی</p><h2 id="portal-modules-title">افزونه‌های متصل</h2></div><button type="button" onClick={() => onOpenView('purchases')}>مشاهده همه</button></div>
				{activeSubscriptions.length ? <div className="customer-portal-subscription-preview">{activeSubscriptions.slice(0, 3).map(subscription => <SubscriptionCard key={subscription.name} subscription={subscription} />)}</div> : <EmptyState title="هنوز افزونه‌ای متصل نیست" description="ماژول‌ها را ببین و موارد سازگار با سایتت را انتخاب کن." actionLabel="دیدن ماژول‌ها" onAction={() => onOpenView('modules')} />}
			</section>
		</div>

		<section className="customer-portal-quick-actions" aria-label="کارهای سریع"><div><p>از کجا شروع کنیم؟</p><h2>سرویس‌هایت را در چند قدم مدیریت کن</h2></div><button type="button" onClick={() => onOpenView('modules')}>نصب یا تغییر ماژول</button><button type="button" onClick={() => onOpenView('billing')}>دیدن فاکتورها</button><button type="button" onClick={() => onOpenView('team')}>دعوت همکار</button><button type="button" onClick={onOpenPricing}>برآورد تعرفه</button></section>
		<aside className="customer-portal-note"><div><strong>امکانات پایه و پلن‌های افزونه</strong><p>هزینهٔ میزبانی سایت جداست؛ مبلغ نهایی افزونهٔ خریداری‌شده در پلن و فاکتور حساب ثبت می‌شود.</p></div><button type="button" onClick={onOpenPricing}>مقایسهٔ تعرفه‌های آسومی</button></aside>
	</>;
}

function SubscriptionCard({ subscription, detailed = false }: { subscription: PortalSubscription; detailed?: boolean }) {
	return <article className="customer-portal-subscription-card"><div className="customer-portal-subscription-head"><div><small>{subscription.site_label || subscription.site || 'بدون سایت مشخص'}</small><h3>{subscription.app_title}</h3></div><StatusPill status={subscription.status} label={subscriptionStatus[subscription.status] || 'در حال آماده‌سازی'} /></div>
		<div className="customer-portal-plan-line"><span>پلن فعلی</span><strong>{subscription.selected_plan?.title || 'پلن ثبت‌شده'}</strong><small>{subscription.interval ? intervalLabel[subscription.interval] || subscription.interval : ''}</small></div>
		{detailed && <div className="customer-portal-subscription-dates"><span>شروع: {formatDate(subscription.start_date)}</span><span>پایان دوره: {formatDate(subscription.end_date)}</span></div>}
		{subscription.selected_plan?.features?.length ? <ul className="customer-portal-feature-list">{subscription.selected_plan.features.slice(0, detailed ? subscription.selected_plan.features.length : 3).map(feature => <li key={feature}>{feature}</li>)}</ul> : null}
	</article>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="customer-portal-metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
function StatusPill({ status, label }: { status: string; label: string }) { return <span className="customer-portal-status" data-status={status.toLowerCase()}>{label}</span>; }
function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void }) { return <div className="customer-portal-empty"><h3>{title}</h3><p>{description}</p>{actionLabel && onAction && <button type="button" onClick={onAction}>{actionLabel}</button>}</div>; }

const intervalLabel: Record<string, string> = { Monthly: 'ماهانه', Annual: 'سالانه', Annually: 'سالانه', Daily: 'روزانه' };
function formatDate(value: string | null) { if (!value) return '—'; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'short', day: 'numeric' }).format(date); }
function formatDateTime(value: Date) { return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(value); }
function toPersian(value: number) { return new Intl.NumberFormat('fa-IR').format(value); }
function formatCurrency(value: number, currency: string) { try { return new Intl.NumberFormat('fa-IR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value); } catch { return `${toPersian(value)} ${currency}`; } }
