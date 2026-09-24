import { useEffect, useMemo, useState } from 'react';
import { productModules } from '../product/modules';
import { modulePrerequisites } from '../product/pricing/catalog';
import {
	changeMarketplacePlan,
	getMarketplaceCatalog,
	getInstallStatus,
	getSiteAppState,
	installMarketplaceApp,
	type AppInstallOption,
	type InstalledApp,
	type MarketplaceApp,
	type PortalPlan,
	type PortalSite,
	type SiteAppState,
} from './portalApi';

type ModuleMapping = {
	module_id: string;
	mode: string;
	description?: string | null;
	marketplace_app?: string | null;
	marketplace_app_slug: string | null;
	marketplace_app_title: string | null;
	published?: number;
};

type Props = {
	currency: string;
	teamName: string;
	sites: PortalSite[];
	selectedSite: string;
	siteStatus: string | null;
	canManageApps: boolean;
	canManageBilling: boolean;
	onSelectSite: (site: string) => void;
	onRequestPurchase: (moduleIds: string[]) => void;
	onRequestSupport: (subject: string, context: string, site?: string) => void;
	onRequestBillingSupport: (subject: string, context: string) => void;
	onOpenBilling: () => void;
	onRefresh: () => void;
};

type PendingJob = { site: string; job: string; app: string; title: string; status: string };
type PricingFilter = 'all' | 'free' | 'paid' | 'unpriced';

const pricingFilters: Array<{ value: PricingFilter; label: string }> = [
	{ value: 'all', label: 'همه' },
	{ value: 'free', label: 'رایگان' },
	{ value: 'paid', label: 'دارای تعرفه' },
	{ value: 'unpriced', label: 'بدون قیمت' },
];

export function ModuleStore({ currency, teamName, sites, selectedSite, siteStatus, canManageApps, canManageBilling, onSelectSite, onRequestPurchase, onRequestSupport, onRequestBillingSupport, onOpenBilling, onRefresh }: Props) {
	const [catalog, setCatalog] = useState<{ apps: MarketplaceApp[]; mappings: ModuleMapping[] } | null>(null);
	const [siteApps, setSiteApps] = useState<SiteAppState>({ installed: [], available: [] });
	const [loadingCatalog, setLoadingCatalog] = useState(true);
	const [loadingSiteApps, setLoadingSiteApps] = useState(false);
	const [error, setError] = useState('');
	const [query, setQuery] = useState('');
	const [selectedCategory, setSelectedCategory] = useState('');
	const [pricingFilter, setPricingFilter] = useState<PricingFilter>('all');
	const [selectedApps, setSelectedApps] = useState<Record<string, string>>({});
	const [planChoices, setPlanChoices] = useState<Record<string, string>>({});
	const [busyApp, setBusyApp] = useState('');
	const [statusMessage, setStatusMessage] = useState('');
	const [failedInstall, setFailedInstall] = useState<PendingJob | null>(null);
	const [needsCreditTopUp, setNeedsCreditTopUp] = useState(false);
	const [billingSupportContext, setBillingSupportContext] = useState('');
	const [pendingJob, setPendingJob] = useState<PendingJob | null>(() => readPendingJob());
	const canBrowseCatalog = canManageApps || canManageBilling;
	const mappingByModule = useMemo(() => new Map((catalog?.mappings || []).map(mapping => [mapping.module_id, mapping])), [catalog]);
	const mappedSlugs = useMemo(() => new Set((catalog?.mappings || []).map(mapping => mapping.marketplace_app_slug).filter((slug): slug is string => Boolean(slug))), [catalog]);
	const categories = useMemo(() => [...new Set((catalog?.apps || []).flatMap(app => app.categories || []))].sort((a, b) => a.localeCompare(b)), [catalog]);
	const selectedTotals = useMemo(() => {
		const totals: Record<string, number> = {};
		for (const [slug, planName] of Object.entries(selectedApps)) {
			const app = catalog?.apps.find(item => item.app === slug);
			const siteApp = [...siteApps.available, ...siteApps.installed].find(item => item.app === slug);
			const plan = findPlan(siteApp?.plans || app?.plans || [], planName);
			const amount = plan ? planPrice(plan, currency) : null;
			if (amount === null) continue;
			const period = planPeriodKey(plan?.interval);
			totals[period] = (totals[period] || 0) + amount;
		}
		return totals;
	}, [catalog, currency, selectedApps, siteApps]);
	const selectedUnpriced = Object.keys(selectedApps).filter(slug => {
		const app = catalog?.apps.find(item => item.app === slug);
		const siteApp = [...siteApps.available, ...siteApps.installed].find(item => item.app === slug);
		const plan = findPlan(siteApp?.plans || app?.plans || [], selectedApps[slug]);
		return !plan || planPrice(plan, currency) === null;
	}).length;

	useEffect(() => {
		const controller = new AbortController();
		setLoadingCatalog(true);
		getMarketplaceCatalog(controller.signal).then(setCatalog).catch(caught => {
			if (!controller.signal.aborted) setError(messageOf(caught));
		}).finally(() => {
			if (!controller.signal.aborted) setLoadingCatalog(false);
		});
		return () => controller.abort();
	}, []);

	useEffect(() => {
		if (!selectedSite) {
			setSiteApps({ installed: [], available: [] });
			return;
		}
		const controller = new AbortController();
		setLoadingSiteApps(true);
		setError('');
		getSiteAppState(selectedSite, controller.signal).then(next => {
			setSiteApps(next);
			setSelectedApps(current => reconcileSelectedApps(current, catalog?.apps || [], next, currency));
		}).catch(caught => {
			if (!controller.signal.aborted) setError(messageOf(caught));
		}).finally(() => {
			if (!controller.signal.aborted) setLoadingSiteApps(false);
		});
		return () => controller.abort();
	}, [selectedSite, catalog, currency]);

	useEffect(() => {
		if (!pendingJob || pendingJob.site !== selectedSite || isTerminalJob(pendingJob.status)) return;
		const timer = window.setTimeout(() => {
			getInstallStatus(pendingJob.site, pendingJob.job).then(result => {
				const next = { ...pendingJob, status: result.status };
				if (isTerminalJob(result.status)) {
					setPendingJob(null);
					window.localStorage.removeItem('asumi-pending-install');
					setFailedInstall(result.status === 'Success' ? null : { ...pendingJob, status: result.status });
					setStatusMessage(result.status === 'Success' ? `افزونهٔ «${pendingJob.title}» با موفقیت نصب شد.` : `نصب «${pendingJob.title}» کامل نشد؛ از تاریخچهٔ خریدها دوباره تلاش کن یا با پشتیبانی در تماس باش.`);
					onRefresh();
					void reloadSiteApps();
				} else {
					setPendingJob(next);
					persistPendingJob(next);
				}
			}).catch(caught => {
				setStatusMessage(messageOf(caught));
				setPendingJob(current => current ? { ...current, status: 'Pending' } : null);
			});
		}, 6000);
		return () => window.clearTimeout(timer);
	}, [pendingJob, selectedSite, onRefresh]);

	async function reloadSiteApps() {
		if (!selectedSite) return;
		try { setSiteApps(await getSiteAppState(selectedSite)); } catch (caught) { setError(messageOf(caught)); }
	}

	function appForModule(moduleId: string) {
		const mapping = mappingByModule.get(moduleId);
		if (!mapping || mapping.mode !== 'Marketplace app' || !mapping.marketplace_app_slug) return null;
		return catalog?.apps.find(app => app.app === mapping.marketplace_app_slug) || null;
	}

	function modeForModule(moduleId: string) {
		const mapping = mappingByModule.get(moduleId);
		return mapping?.mode || (['finance', 'sales', 'crm', 'procurement', 'inventory', 'projects', 'quality', 'people', 'assets'].includes(moduleId) ? 'Included' : 'Purchase request');
	}

	function toggleEstimate(app: MarketplaceApp, plans: PortalPlan[]) {
		const installed = siteApps.installed.find(item => item.app === app.app);
		const currentPlan = installed?.subscription?.plan;
		const selected = selectedApps[app.app];
		if (selected) {
			setSelectedApps(current => { const next = { ...current }; delete next[app.app]; return next; });
			return;
		}
		const chosen = findPlan(plans, planChoices[app.app] || '') || plans.find(plan => plan.name === currentPlan) || [...plans].sort((a, b) => (planPrice(a, currency) ?? Number.POSITIVE_INFINITY) - (planPrice(b, currency) ?? Number.POSITIVE_INFINITY))[0];
		if (chosen) setSelectedApps(current => ({ ...current, [app.app]: chosen.name }));
	}

	async function activateApp(app: MarketplaceApp, selectedPlan: PortalPlan | null) {
		setFailedInstall(null);
		const slug = app.app;
		if (!canManageBilling) {
			setStatusMessage('برای ثبت خرید یا تغییر پلن، از مدیر مالی تیم بخواه این کار را انجام دهد.');
			return;
		}
		const installed = siteApps.installed.find(item => item.app === slug);
		const available = siteApps.available.find(item => item.app === slug);
		const isExternalApp = (available?.team || app.team) !== teamName;
		const selectedPlanPrice = selectedPlan ? planPrice(selectedPlan, currency) : null;
		if (!selectedSite) {
			setStatusMessage('برای نصب افزونه، اول یک سایت فعال انتخاب کن.');
			return;
		}
		if (siteStatus !== 'Active') {
			setStatusMessage('این سایت هنوز آمادهٔ نصب افزونه نیست.');
			return;
		}
		if (isExternalApp && selectedPlan && selectedPlanPrice === null) {
			setStatusMessage('تعرفهٔ این پلن برای ارز حساب مشخص نیست؛ پیش از خرید، از پشتیبانی استعلام بگیر.');
			return;
		}
		if (installed?.subscription?.name && selectedPlan && installed.subscription.plan !== selectedPlan.name) {
			if (!window.confirm(`پلن «${app.title}» به «${selectedPlan.title}» با مبلغ ${formatPrice(planPrice(selectedPlan, currency), currency)} در دورهٔ ${planPeriodLabel(selectedPlan.interval)} تغییر کند؟`)) return;
			setBusyApp(slug);
			setError('');
			setNeedsCreditTopUp(false);
			setBillingSupportContext('');
			try {
				await changeMarketplacePlan(installed.subscription.name, selectedPlan.name);
				setStatusMessage(`پلن «${app.title}» به‌روزرسانی شد.`);
				await reloadSiteApps();
				onRefresh();
			} catch (caught) {
				showActionError(caught);
			} finally { setBusyApp(''); }
			return;
		}
		if (installed) {
			setStatusMessage(`«${app.title}» از قبل روی این سایت نصب است.`);
			return;
		}
		if (!available) {
			setStatusMessage('این افزونه روی نسخهٔ فعلی این سایت قابل نصب نیست.');
			return;
		}
		const availablePlans = available.plans || [];
		const hasPaidPlans = isExternalApp && availablePlans.some(plan => (planPrice(plan, currency) ?? 0) > 0);
		const hasFreePlan = availablePlans.some(plan => {
			const amount = planPrice(plan, currency);
			return amount !== null && amount <= 0;
		});
		const requiresPlanSelection = hasPaidPlans && !hasFreePlan;
		if (requiresPlanSelection && !selectedPlan) {
			setStatusMessage('برای نصب این افزونه یک پلن انتخاب کن.');
			return;
		}
		const installPlan = isExternalApp ? selectedPlan?.name : undefined;
		if (installPlan && selectedPlanPrice !== null && selectedPlanPrice > 0 && !window.confirm(`افزونهٔ «${app.title}» با پلن «${selectedPlan.title}» و مبلغ ${formatPrice(selectedPlanPrice, currency)} در دورهٔ ${planPeriodLabel(selectedPlan.interval)} برای این سایت ثبت شود؟ این مبلغ در هر دوره تمدید می‌شود؛ با لغو اشتراک، تمدید متوقف و افزونه از سایت حذف می‌شود. مبلغ نهایی در فاکتور حساب نمایش داده می‌شود.`)) return;
		setBusyApp(slug);
		setError('');
		setNeedsCreditTopUp(false);
		setBillingSupportContext('');
		try {
			const job = await installMarketplaceApp(selectedSite, slug, installPlan);
			if (job) {
				const pending = { site: selectedSite, job, app: slug, title: app.title, status: 'Pending' };
				setPendingJob(pending);
				persistPendingJob(pending);
				setStatusMessage(`درخواست نصب «${app.title}» ثبت شد؛ وضعیت را همین‌جا پیگیری می‌کنیم.`);
			} else {
				setStatusMessage(`«${app.title}» از قبل نصب است.`);
			}
			onRefresh();
		} catch (caught) {
			showActionError(caught);
		} finally { setBusyApp(''); }
	}

	function showActionError(caught: unknown) {
		const message = messageOf(caught);
		setError(message);
		setNeedsCreditTopUp(canManageBilling && /credit|balance|fund|اعتبار|مانده|پرداخت/.test(message.toLocaleLowerCase()));
		setBillingSupportContext(/billing period|دورهٔ پرداخت|دوره/.test(message.toLocaleLowerCase()) ? message : '');
	}

	const normalizedQuery = query.trim().toLocaleLowerCase();
	const visibleModules = productModules.filter(module => {
		const mapping = mappingByModule.get(module.id);
		if (mapping?.published === 0) return false;
		const mode = modeForModule(module.id);
		const app = appForModule(module.id);
		const installed = app && siteApps.installed.some(item => item.app === app.app);
		if (!canBrowseCatalog && mode !== 'Included' && !installed) return false;
		const available = app && siteApps.available.find(item => item.app === app.app);
		const siteApp = available || (app && siteApps.installed.find(item => item.app === app.app));
		const plans = (siteApp?.plans || app?.plans || []) as PortalPlan[];
		const searchable = [module.title, module.description, mapping?.description, app?.title, ...(app?.categories || [])].filter(Boolean).join(' ').toLocaleLowerCase();
		return searchable.includes(normalizedQuery)
			&& (!selectedCategory || Boolean(app?.categories?.includes(selectedCategory)))
			&& matchesPricingFilter(mode, plans, pricingFilter, currency);
	});
	const otherApps = (catalog?.apps || []).filter(app => !mappedSlugs.has(app.app)
		&& (canBrowseCatalog || siteApps.installed.some(item => item.app === app.app))
		&& `${app.title} ${app.description || ''} ${(app.categories || []).join(' ')}`.toLocaleLowerCase().includes(normalizedQuery)
		&& (!selectedCategory || app.categories.includes(selectedCategory))
		&& matchesPricingFilter('Marketplace app', app.plans || [], pricingFilter, currency));

	return <div className="customer-portal-workspace">
		<section className="customer-portal-panel" aria-labelledby="portal-store-title">
			<div className="customer-portal-panel-heading">
				<div><p>{canBrowseCatalog ? 'کاتالوگ و خرید' : 'امکانات در دسترس'}</p><h2 id="portal-store-title">ماژول‌ها و افزونه‌ها</h2></div>
				<span>{selectedSite ? `سایت مقصد: ${sites.find(site => site.name === selectedSite)?.label || selectedSite}` : 'سایت مقصد انتخاب نشده'}</span>
			</div>
			<p className="customer-portal-help-copy">{canBrowseCatalog ? <>امکانات پایهٔ آسومی جدا از افزونه‌های قابل خرید نشان داده می‌شوند. قیمت افزونه‌ها از پلن‌های فعال حساب می‌آید و هزینهٔ میزبانی جداگانه است.{!canManageBilling ? ' برآورد در دسترس است؛ ثبت خرید را مدیر مالی تیم انجام می‌دهد.' : ''}</> : 'امکانات رایگان و ماژول‌های فعال این تیم را می‌بینی. برای دیدن تعرفه‌ها یا درخواست ماژول جدید، از مدیر تیم بخواه دسترسی ماژول‌ها را برای نقش تو فعال کند.'}</p>
			<div className="customer-portal-filter-row">
				<label className="customer-portal-search"><span>جست‌وجو</span><input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="نام ماژول یا افزونه" /></label>
				<label className="customer-portal-search"><span>سایت مقصد</span><select value={selectedSite} onChange={event => onSelectSite(event.target.value)}><option value="">انتخاب سایت</option>{sites.map(site => <option key={site.name} value={site.name}>{site.label} · {siteStatusLabel(site.status)}</option>)}</select></label>
				{canBrowseCatalog && categories.length > 0 && <label className="customer-portal-search"><span>دسته‌بندی</span><select value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)}><option value="">همهٔ دسته‌ها</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>}
			</div>
			{canBrowseCatalog && <div className="customer-portal-catalog-filters" role="group" aria-label="فیلتر بر اساس نوع تعرفه">
				{pricingFilters.map(filter => <button key={filter.value} type="button" data-selected={pricingFilter === filter.value} aria-pressed={pricingFilter === filter.value} onClick={() => setPricingFilter(filter.value)}>{filter.label}</button>)}
			</div>}
			{loadingCatalog || loadingSiteApps ? <div className="customer-portal-inline-state" role="status">در حال بارگذاری کاتالوگ و سازگاری سایت…</div> : null}
			{error && <div className="customer-portal-inline-error" role="alert"><span>{error}</span><div>{needsCreditTopUp && <button type="button" onClick={onOpenBilling}>افزایش اعتبار</button>}{billingSupportContext && <button type="button" onClick={() => onRequestBillingSupport('بررسی دورهٔ پرداخت اشتراک', billingSupportContext)}>درخواست بررسی دوره</button>}<button type="button" onClick={() => { setError(''); setNeedsCreditTopUp(false); setBillingSupportContext(''); void reloadSiteApps(); }}>تلاش دوباره</button></div></div>}
			{statusMessage && <div className={`customer-portal-inline-status${failedInstall ? ' customer-portal-inline-status--action' : ''}`} role="status"><span>{statusMessage}</span>{failedInstall && <button type="button" onClick={() => onRequestSupport(`پیگیری نصب ${failedInstall.title}`, `نصب ماژول «${failedInstall.title}» برای سایت ${sites.find(site => site.name === failedInstall.site)?.label || failedInstall.site} با وضعیت «${failedInstall.status}» کامل نشده است. لطفاً علت را بررسی و راهنمایی کنید.`, failedInstall.site)}>درخواست پشتیبانی نصب</button>}</div>}
			{pendingJob?.site === selectedSite && <div className="customer-portal-install-progress" role="status"><span className="customer-portal-spinner" aria-hidden="true" /><div><strong>در حال نصب {pendingJob.title}</strong><p>پس از آماده‌شدن، نتیجه به‌صورت خودکار به‌روز می‌شود.</p></div></div>}
			<div className="customer-portal-module-grid">
				{visibleModules.map(module => {
					const mode = modeForModule(module.id);
					const mapping = mappingByModule.get(module.id);
					const prerequisiteTitles = modulePrerequisites[module.id]
						.map(id => productModules.find(item => item.id === id)?.title)
						.filter((title): title is string => Boolean(title));
					const app = appForModule(module.id);
					const available = app ? siteApps.available.find(item => item.app === app.app) : undefined;
					const installed = app ? siteApps.installed.find(item => item.app === app.app) : undefined;
					const plans = (available?.plans || (installed as AppInstallOption | undefined)?.plans || app?.plans || []) as PortalPlan[];
					const selectedPlanName = planChoices[app?.app || ''] || selectedApps[app?.app || ''] || installed?.subscription?.plan || plans[0]?.name || '';
					const plan = findPlan(plans, selectedPlanName);
					const missingCurrencyPrice = Boolean(canBrowseCatalog && app && app.team !== teamName && plan && planPrice(plan, currency) === null);
					return <article className="customer-portal-module-card" key={module.id}>
						<div className="customer-portal-module-card-head"><div><span className="customer-portal-module-icon" aria-hidden="true">{module.shortTitle.slice(0, 1)}</span><div><h3>{module.title}</h3><p>{module.description}</p></div></div><StatusPill label={installed ? 'فعال روی سایت' : mode === 'Included' ? 'شامل امکانات پایه' : mode === 'Marketplace app' ? 'افزونهٔ قابل خرید' : 'درخواست خرید'} status={installed ? 'Active' : mode === 'Included' ? 'Free' : 'Pending'} /></div>
						<ul className="customer-portal-module-features">{module.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
						{(prerequisiteTitles.length > 0 || mapping?.description) && <div className="customer-portal-compatibility-note"><strong>پیش‌نیاز و سازگاری</strong><p>{[prerequisiteTitles.length ? `نیازمند: ${prerequisiteTitles.join('، ')}` : '', mapping?.description].filter(Boolean).join(' · ')}</p></div>}
						{mode === 'Included' ? <div className="customer-portal-free-note">شامل امکانات پایهٔ آسومی است و هزینهٔ جداگانهٔ افزونه ندارد؛ هزینهٔ میزبانی یا پلن سایت جداست.</div>
							: mode === 'Marketplace app' && app ? <>
								<div className="customer-portal-linked-app">متصل به: <strong>{app.title}</strong>{installed && <span> · روی سایت نصب است</span>}</div>
						{canBrowseCatalog && plans.length > 0 && <label className="customer-portal-plan-select"><span>پلن</span><select value={selectedPlanName} onChange={event => { const next = event.target.value; setPlanChoices(current => ({ ...current, [app.app]: next })); setSelectedApps(current => current[app.app] ? { ...current, [app.app]: next } : current); }}>{plans.map(item => <option key={item.name} value={item.name}>{item.title} · {formatPrice(planPrice(item, currency), currency)} · {planPeriodLabel(item.interval)}</option>)}</select></label>}
								{canBrowseCatalog && plan && (planPrice(plan, currency) ?? 0) > 0 && <p className="customer-portal-card-hint">این هزینه در پایان هر دوره تمدید می‌شود. با لغو اشتراک، تمدید متوقف و افزونه از سایت حذف می‌شود.</p>}
								{missingCurrencyPrice && <p className="customer-portal-card-hint">تعرفهٔ این پلن برای ارز حساب ثبت نشده؛ مبلغی نمایش داده نمی‌شود.</p>}
						{!canBrowseCatalog && installed && <div className="customer-portal-linked-app">پلن فعال: <strong>{plans.find(item => item.name === installed.subscription?.plan)?.title || 'اشتراک فعال'}</strong></div>}
								{canBrowseCatalog && plan?.features?.length ? <PlanFeatures features={plan.features} /> : null}
								{!selectedSite ? <p className="customer-portal-card-hint">برای نصب، ابتدا سایت مقصد را انتخاب کن.</p> : siteStatus !== 'Active' ? <p className="customer-portal-card-hint">بعد از فعال‌شدن سایت، امکان بررسی و نصب افزونه نمایش داده می‌شود.</p> : !available && !installed && !loadingSiteApps ? <p className="customer-portal-card-hint">این افزونه برای نسخه یا محیط سایت انتخاب‌شده در دسترس نیست.</p> : null}
								{canBrowseCatalog && <div className="customer-portal-card-actions">
									<button type="button" className="customer-portal-secondary-button" aria-pressed={Boolean(selectedApps[app.app])} onClick={() => toggleEstimate(app, plans)}>{selectedApps[app.app] ? 'حذف از برآورد' : 'افزودن به برآورد'}</button>
									{missingCurrencyPrice && <button type="button" className="customer-portal-secondary-button" onClick={() => onRequestBillingSupport('استعلام تعرفهٔ افزونه', `تعرفهٔ پلن «${plan?.title}» برای افزونهٔ «${app.title}» با ارز ${currency} ثبت نشده است؛ لطفاً مبلغ و روش خرید را اعلام کنید.`)}>استعلام تعرفه</button>}
									<button type="button" className="customer-portal-primary-button" disabled={!canManageBilling || Boolean(busyApp) || Boolean(pendingJob && !isTerminalJob(pendingJob.status)) || missingCurrencyPrice || (!installed && (!available || siteStatus !== 'Active')) || Boolean(installed && (!installed.subscription?.name || !plan || installed.subscription.plan === plan.name))} onClick={() => void activateApp(app, plan)}>{!canManageBilling ? 'فقط مدیر مالی می‌تواند ثبت کند' : busyApp === app.app ? 'در حال ثبت…' : installed?.subscription?.name && plan && installed.subscription.plan !== plan.name ? 'تغییر پلن' : installed ? 'فعال روی سایت' : 'خرید و نصب'}</button>
								</div>}
							</> : mode === 'Marketplace app' ? <><p className="customer-portal-card-hint">این ماژول به افزونهٔ منتشرشدهٔ قابل نمایش در کاتالوگ متصل نیست؛ برای بررسی، درخواست بفرست.</p><div className="customer-portal-card-actions"><button type="button" className="customer-portal-secondary-button" onClick={() => onRequestPurchase([module.id])}>درخواست بررسی اتصال</button></div></>
							: <div className="customer-portal-card-actions"><button type="button" className="customer-portal-secondary-button" onClick={() => onRequestPurchase([module.id])}>درخواست خرید این ماژول</button></div>}
					</article>;
				})}
			</div>
			{!visibleModules.length && <div className="customer-portal-inline-state">ماژولی با این جست‌وجو و فیلتر پیدا نشد.</div>}
		</section>

		{(canBrowseCatalog || otherApps.length > 0) && <section className="customer-portal-panel" aria-labelledby="portal-marketplace-title">
			<div className="customer-portal-panel-heading"><div><p>{canBrowseCatalog ? 'افزونه‌های منتشرشده' : 'امکانات فعال'}</p><h2 id="portal-marketplace-title">{canBrowseCatalog ? 'سایر افزونه‌های قابل نصب' : 'افزونه‌های فعال روی سایت'}</h2></div><span>{otherApps.length} مورد</span></div>
			{otherApps.length ? <div className="customer-portal-marketplace-list">{otherApps.map(app => {
				const available = siteApps.available.find(item => item.app === app.app);
				const installed = siteApps.installed.find(item => item.app === app.app);
				const plans = (available?.plans || (installed as AppInstallOption | undefined)?.plans || app.plans || []) as PortalPlan[];
				const selectedPlan = findPlan(plans, planChoices[app.app] || selectedApps[app.app] || installed?.subscription?.plan || plans[0]?.name || '');
				const missingCurrencyPrice = Boolean(canBrowseCatalog && app.team !== teamName && selectedPlan && planPrice(selectedPlan, currency) === null);
				return <article className="customer-portal-marketplace-card" key={app.name}>
					<div className="customer-portal-marketplace-copy"><h3>{app.title}</h3><p>{app.description || 'افزونهٔ منتشرشده در Marketplace'}</p><small>{(app.categories || []).join(' · ')}</small></div>
						{canBrowseCatalog ? plans.length ? <label className="customer-portal-plan-select"><span>پلن</span><select value={selectedPlan?.name || ''} onChange={event => { const next = event.target.value; setPlanChoices(current => ({ ...current, [app.app]: next })); setSelectedApps(current => current[app.app] ? { ...current, [app.app]: next } : current); }}>{plans.map(plan => <option key={plan.name} value={plan.name}>{plan.title} · {formatPrice(planPrice(plan, currency), currency)} · {planPeriodLabel(plan.interval)}</option>)}</select></label> : <span className="customer-portal-price">قیمت اعلام نشده</span> : <span className="customer-portal-status" data-status="active">فعال روی سایت</span>}
					{canBrowseCatalog && selectedPlan && (planPrice(selectedPlan, currency) ?? 0) > 0 && <p className="customer-portal-card-hint">این هزینه در پایان هر دوره تمدید می‌شود. با لغو اشتراک، تمدید متوقف و افزونه از سایت حذف می‌شود.</p>}
					{missingCurrencyPrice && <p className="customer-portal-card-hint">تعرفهٔ این پلن برای ارز حساب ثبت نشده؛ مبلغی نمایش داده نمی‌شود.</p>}
					{canBrowseCatalog && selectedPlan?.features?.length ? <PlanFeatures features={selectedPlan.features} /> : null}
					{canBrowseCatalog && selectedSite && siteStatus === 'Active' && !available && !installed && !loadingSiteApps && <p className="customer-portal-card-hint">این افزونه برای نسخه یا محیط سایت انتخاب‌شده در دسترس نیست.</p>}
					{canBrowseCatalog && <div className="customer-portal-card-actions">
						<button type="button" className="customer-portal-secondary-button" aria-pressed={Boolean(selectedApps[app.app])} onClick={() => toggleEstimate(app, plans)}>{selectedApps[app.app] ? 'حذف از برآورد' : 'افزودن به برآورد'}</button>
						{missingCurrencyPrice && <button type="button" className="customer-portal-secondary-button" onClick={() => onRequestBillingSupport('استعلام تعرفهٔ افزونه', `تعرفهٔ پلن «${selectedPlan?.title}» برای افزونهٔ «${app.title}» با ارز ${currency} ثبت نشده است؛ لطفاً مبلغ و روش خرید را اعلام کنید.`)}>استعلام تعرفه</button>}
						<button type="button" className="customer-portal-primary-button" disabled={!canManageBilling || Boolean(busyApp) || Boolean(pendingJob && !isTerminalJob(pendingJob.status)) || missingCurrencyPrice || (installed ? (!installed.subscription?.name || !selectedPlan || installed.subscription.plan === selectedPlan.name) : (!available || siteStatus !== 'Active'))} onClick={() => void activateApp(app, selectedPlan)}>{!canManageBilling ? 'فقط مدیر مالی می‌تواند ثبت کند' : installed?.subscription?.name && selectedPlan && installed.subscription.plan !== selectedPlan.name ? 'تغییر پلن' : installed ? 'فعال روی سایت' : 'خرید و نصب'}</button>
					</div>}
				</article>;
			})}</div> : <div className="customer-portal-inline-state">افزونه‌ای مطابق جست‌وجوی تو پیدا نشد.</div>}
		</section>}

		{canBrowseCatalog && <aside className="customer-portal-estimate">
			<div><span>برآورد پلن‌های افزونه</span>{Object.keys(selectedTotals).length ? <div className="customer-portal-estimate-totals">{Object.entries(selectedTotals).map(([period, total]) => <strong key={period}>{formatPrice(total, currency)} <small>/ {planPeriodLabel(period)}</small></strong>)}</div> : <strong>ماژولی انتخاب نشده</strong>}<p>{Object.keys(selectedApps).length} انتخاب · {selectedUnpriced} مورد بدون قیمت قابل‌محاسبه</p></div>
			<p>این جمع نرخ مبنا را نشان می‌دهد. در پلن‌های روزشمار، مبلغ صورتحساب بر اساس روزهای فعال محاسبه می‌شود؛ میزبانی سایت و هزینه‌های احتمالی جداست.</p>
		</aside>}
	</div>;
}

function PlanFeatures({ features }: { features: string[] }) {
	return <details className="customer-portal-plan-features">
		<summary>ویژگی‌های این پلن ({new Intl.NumberFormat('fa-IR').format(features.length)})</summary>
		<ul>{features.map(feature => <li key={feature}>{feature}</li>)}</ul>
	</details>;
}

function findPlan(plans: PortalPlan[], name: string) {
	return plans.find(plan => plan.name === name) || null;
}

function planPrice(plan: PortalPlan, currency: string) {
	const amount = currency === 'INR' ? plan.price_inr : currency === 'USD' ? plan.price_usd : null;
	if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) return null;
	return Number(amount);
}

function planPeriodKey(interval?: string | null) {
	if (interval === 'Yearly' || interval === 'Annual' || interval === 'Annually') return 'Annually';
	return 'Monthly';
}

function planPeriodLabel(interval?: string | null) {
	if (interval === 'Yearly' || interval === 'Annual' || interval === 'Annually') return 'سالانه';
	return interval === 'Daily' ? 'ماهانه با محاسبهٔ روزشمار' : 'ماهانه';
}

function formatPrice(amount: number | null, currency: string) {
	if (amount === null) return 'قیمت اعلام نشده';
	try {
		return new Intl.NumberFormat('fa-IR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
	} catch {
		return `${new Intl.NumberFormat('fa-IR').format(amount)} ${currency}`;
	}
}

function matchesPricingFilter(mode: string, plans: PortalPlan[], filter: PricingFilter, currency: string) {
	if (filter === 'all') return true;
	if (mode === 'Included') return filter === 'free';
	if (mode === 'Purchase request') return filter === 'unpriced';
	const prices = plans.map(plan => planPrice(plan, currency))
		.filter((amount): amount is number => amount !== null && Number.isFinite(amount));
	if (filter === 'free') return prices.includes(0);
	if (filter === 'paid') return prices.some(price => price > 0);
	return prices.length === 0;
}

function reconcileSelectedApps(current: Record<string, string>, apps: MarketplaceApp[], state: SiteAppState, currency: string) {
	const available = new Map([...state.available, ...state.installed].map(item => [item.app, item]));
	return Object.fromEntries(Object.entries(current).map(([slug, planName]) => {
		const plans = (available.get(slug)?.plans || apps.find(app => app.app === slug)?.plans || []) as PortalPlan[];
		const plan = findPlan(plans, planName) || [...plans].sort((a, b) => (planPrice(a, currency) ?? Infinity) - (planPrice(b, currency) ?? Infinity))[0];
		return [slug, plan?.name || ''];
	}).filter(([, planName]) => Boolean(planName)));
}

function isTerminalJob(status: string) {
	return ['Success', 'Failure', 'Delivery Failure'].includes(status);
}

function readPendingJob(): PendingJob | null {
	try {
		const value = JSON.parse(window.localStorage.getItem('asumi-pending-install') || 'null') as PendingJob | null;
		return value && value.site && value.job ? value : null;
	} catch { return null; }
}

function persistPendingJob(job: PendingJob) {
	window.localStorage.setItem('asumi-pending-install', JSON.stringify(job));
}

function messageOf(error: unknown) {
	return error instanceof Error ? error.message : 'درخواست کامل نشد. دوباره تلاش کن.';
}

function StatusPill({ status, label }: { status: string; label: string }) {
	return <span className="customer-portal-status" data-status={status.toLowerCase()}>{label}</span>;
}

function siteStatusLabel(status: string) {
	if (status === 'Active') return 'فعال';
	if (status === 'Suspended') return 'متوقف';
	return 'در حال آماده‌سازی';
}
