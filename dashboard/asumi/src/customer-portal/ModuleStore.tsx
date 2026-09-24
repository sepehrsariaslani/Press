import { useEffect, useMemo, useState } from 'react';
import { productModules } from '../product/modules';
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
	canManageBilling: boolean;
	onSelectSite: (site: string) => void;
	onRequestPurchase: (moduleIds: string[]) => void;
	onRequestBillingSupport: (subject: string, context: string) => void;
	onOpenBilling: () => void;
	onOpenPricing: () => void;
	onRefresh: () => void;
};

type PendingJob = { site: string; job: string; app: string; title: string; status: string };

export function ModuleStore({ currency, teamName, sites, selectedSite, siteStatus, canManageBilling, onSelectSite, onRequestPurchase, onRequestBillingSupport, onOpenBilling, onOpenPricing, onRefresh }: Props) {
	const [catalog, setCatalog] = useState<{ apps: MarketplaceApp[]; mappings: ModuleMapping[] } | null>(null);
	const [siteApps, setSiteApps] = useState<SiteAppState>({ installed: [], available: [] });
	const [loadingCatalog, setLoadingCatalog] = useState(true);
	const [loadingSiteApps, setLoadingSiteApps] = useState(false);
	const [error, setError] = useState('');
	const [query, setQuery] = useState('');
	const [selectedApps, setSelectedApps] = useState<Record<string, string>>({});
	const [planChoices, setPlanChoices] = useState<Record<string, string>>({});
	const [busyApp, setBusyApp] = useState('');
	const [statusMessage, setStatusMessage] = useState('');
	const [needsCreditTopUp, setNeedsCreditTopUp] = useState(false);
	const [billingSupportContext, setBillingSupportContext] = useState('');
	const [pendingJob, setPendingJob] = useState<PendingJob | null>(() => readPendingJob());
	const mappingByModule = useMemo(() => new Map((catalog?.mappings || []).map(mapping => [mapping.module_id, mapping])), [catalog]);
	const mappedSlugs = useMemo(() => new Set((catalog?.mappings || []).map(mapping => mapping.marketplace_app_slug).filter((slug): slug is string => Boolean(slug))), [catalog]);
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
					setStatusMessage(result.status === 'Success'
						? `افزونهٔ «${pendingJob.title}» با موفقیت نصب شد.`
						: `نصب «${pendingJob.title}» کامل نشد؛ وضعیت سرویس را بررسی کن.`);
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
		const slug = app.app;
		if (!canManageBilling) {
			setStatusMessage('برای ثبت خرید یا تغییر پلن، از مدیر مالی تیم بخواه این کار را انجام دهد.');
			return;
		}
		const installed = siteApps.installed.find(item => item.app === slug);
		const available = siteApps.available.find(item => item.app === slug);
		if (!selectedSite) {
			setStatusMessage('برای نصب افزونه، اول یک سایت فعال انتخاب کن.');
			return;
		}
		if (siteStatus !== 'Active') {
			setStatusMessage('این سایت هنوز آمادهٔ نصب افزونه نیست.');
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
		const paidPlanRequired = available.team !== teamName
			&& (available.plans || []).some(plan => (plan.price_inr || 0) > 0 || (plan.price_usd || 0) > 0);
		if (paidPlanRequired && !selectedPlan) {
			setStatusMessage('برای نصب این افزونه یک پلن انتخاب کن.');
			return;
		}
		if (paidPlanRequired && selectedPlan && !window.confirm(`افزونهٔ «${app.title}» با پلن «${selectedPlan.title}» و مبلغ ${formatPrice(planPrice(selectedPlan, currency), currency)} در دورهٔ ${planPeriodLabel(selectedPlan.interval)} برای این سایت ثبت شود؟ مبلغ نهایی در فاکتور حساب نمایش داده می‌شود.`)) return;
		setBusyApp(slug);
		setError('');
		setNeedsCreditTopUp(false);
		setBillingSupportContext('');
		try {
			const job = await installMarketplaceApp(selectedSite, slug, paidPlanRequired ? selectedPlan?.name : undefined);
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
		return mapping?.published !== 0 && `${module.title} ${module.description}`.toLocaleLowerCase().includes(normalizedQuery);
	});
	const otherApps = (catalog?.apps || []).filter(app => !mappedSlugs.has(app.app) && `${app.title} ${app.description || ''}`.toLocaleLowerCase().includes(normalizedQuery));

	return <div className="customer-portal-workspace">
		<section className="customer-portal-panel" aria-labelledby="portal-store-title">
			<div className="customer-portal-panel-heading">
				<div><p>کاتالوگ و خرید</p><h2 id="portal-store-title">ماژول‌ها و افزونه‌ها</h2></div>
				<span>{selectedSite ? `سایت مقصد: ${sites.find(site => site.name === selectedSite)?.label || selectedSite}` : 'سایت مقصد انتخاب نشده'}</span>
			</div>
			<p className="customer-portal-help-copy">ماژول‌های پایهٔ ERPNext جدا از افزونه‌های قابل خرید نشان داده می‌شوند. قیمت افزونه‌ها از پلن‌های فعال حساب می‌آید و هزینهٔ میزبانی جداگانه است.{!canManageBilling ? ' برآورد برای همهٔ اعضا در دسترس است؛ ثبت خرید را مدیر مالی تیم انجام می‌دهد.' : ''}</p>
			<div className="customer-portal-filter-row">
				<label className="customer-portal-search"><span>جست‌وجو</span><input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="نام ماژول یا افزونه" /></label>
				<label className="customer-portal-search"><span>سایت مقصد</span><select value={selectedSite} onChange={event => onSelectSite(event.target.value)}><option value="">انتخاب سایت</option>{sites.map(site => <option key={site.name} value={site.name}>{site.label} · {siteStatusLabel(site.status)}</option>)}</select></label>
				<button type="button" className="customer-portal-secondary-button" onClick={onOpenPricing}>محاسبهٔ تعرفهٔ آسومی</button>
			</div>
			{loadingCatalog || loadingSiteApps ? <div className="customer-portal-inline-state" role="status">در حال بارگذاری کاتالوگ و سازگاری سایت…</div> : null}
			{error && <div className="customer-portal-inline-error" role="alert"><span>{error}</span><div>{needsCreditTopUp && <button type="button" onClick={onOpenBilling}>افزایش اعتبار</button>}{billingSupportContext && <button type="button" onClick={() => onRequestBillingSupport('بررسی دورهٔ پرداخت اشتراک', billingSupportContext)}>درخواست بررسی دوره</button>}<button type="button" onClick={() => { setError(''); setNeedsCreditTopUp(false); setBillingSupportContext(''); void reloadSiteApps(); }}>تلاش دوباره</button></div></div>}
			{statusMessage && <p className="customer-portal-inline-status" role="status">{statusMessage}</p>}
			{pendingJob?.site === selectedSite && <div className="customer-portal-install-progress" role="status"><span className="customer-portal-spinner" aria-hidden="true" /><div><strong>در حال نصب {pendingJob.title}</strong><p>پس از آماده‌شدن، نتیجه به‌صورت خودکار به‌روز می‌شود.</p></div></div>}
			<div className="customer-portal-module-grid">
				{visibleModules.map(module => {
					const mode = modeForModule(module.id);
					const app = appForModule(module.id);
					const available = app ? siteApps.available.find(item => item.app === app.app) : undefined;
					const installed = app ? siteApps.installed.find(item => item.app === app.app) : undefined;
					const plans = (available?.plans || (installed as AppInstallOption | undefined)?.plans || app?.plans || []) as PortalPlan[];
					const selectedPlanName = planChoices[app?.app || ''] || selectedApps[app?.app || ''] || installed?.subscription?.plan || plans[0]?.name || '';
					const plan = findPlan(plans, selectedPlanName);
					return <article className="customer-portal-module-card" key={module.id}>
						<div className="customer-portal-module-card-head"><div><span className="customer-portal-module-icon" aria-hidden="true">{module.shortTitle.slice(0, 1)}</span><div><h3>{module.title}</h3><p>{module.description}</p></div></div><StatusPill label={mode === 'Included' ? 'شامل ERPNext' : mode === 'Marketplace app' ? 'افزونهٔ قابل خرید' : 'درخواست خرید'} status={installed ? 'Active' : mode === 'Included' ? 'Free' : 'Pending'} /></div>
						<ul className="customer-portal-module-features">{module.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
						{mode === 'Included' ? <div className="customer-portal-free-note">بدون هزینهٔ جداگانهٔ افزونه؛ هزینهٔ میزبانی یا پلن سایت جداست.</div>
							: mode === 'Marketplace app' && app ? <>
								<div className="customer-portal-linked-app">متصل به: <strong>{app.title}</strong>{installed && <span> · روی سایت نصب است</span>}</div>
						{plans.length > 0 && <label className="customer-portal-plan-select"><span>پلن</span><select value={selectedPlanName} onChange={event => { const next = event.target.value; setPlanChoices(current => ({ ...current, [app.app]: next })); setSelectedApps(current => current[app.app] ? { ...current, [app.app]: next } : current); }}>{plans.map(item => <option key={item.name} value={item.name}>{item.title} · {formatPrice(planPrice(item, currency), currency)} · {planPeriodLabel(item.interval)}</option>)}</select></label>}
								{!selectedSite ? <p className="customer-portal-card-hint">برای نصب، ابتدا سایت مقصد را انتخاب کن.</p> : !available && !installed ? <p className="customer-portal-card-hint">این افزونه در نسخهٔ فعلی سایت در دسترس نیست.</p> : null}
								<div className="customer-portal-card-actions">
									<button type="button" className="customer-portal-secondary-button" aria-pressed={Boolean(selectedApps[app.app])} onClick={() => toggleEstimate(app, plans)}>{selectedApps[app.app] ? 'حذف از برآورد' : 'افزودن به برآورد'}</button>
									<button type="button" className="customer-portal-primary-button" disabled={!canManageBilling || Boolean(busyApp) || Boolean(pendingJob && !isTerminalJob(pendingJob.status)) || (!installed && (!available || siteStatus !== 'Active')) || Boolean(installed && (!installed.subscription?.name || !plan || installed.subscription.plan === plan.name))} onClick={() => void activateApp(app, plan)}>{!canManageBilling ? 'فقط مدیر مالی می‌تواند ثبت کند' : busyApp === app.app ? 'در حال ثبت…' : installed?.subscription?.name && plan && installed.subscription.plan !== plan.name ? 'تغییر پلن' : installed ? 'فعال روی سایت' : 'خرید و نصب'}</button>
								</div>
							</> : mode === 'Marketplace app' ? <><p className="customer-portal-card-hint">این ماژول به افزونهٔ منتشرشدهٔ قابل نمایش در کاتالوگ متصل نیست؛ برای بررسی، درخواست بفرست.</p><div className="customer-portal-card-actions"><button type="button" className="customer-portal-secondary-button" onClick={() => onRequestPurchase([module.id])}>درخواست بررسی اتصال</button></div></>
							: <div className="customer-portal-card-actions"><button type="button" className="customer-portal-secondary-button" onClick={() => onRequestPurchase([module.id])}>درخواست خرید این ماژول</button></div>}
					</article>;
				})}
			</div>
		</section>

		<section className="customer-portal-panel" aria-labelledby="portal-marketplace-title">
			<div className="customer-portal-panel-heading"><div><p>افزونه‌های منتشرشده</p><h2 id="portal-marketplace-title">سایر افزونه‌های قابل نصب</h2></div><span>{otherApps.length} مورد</span></div>
			{otherApps.length ? <div className="customer-portal-marketplace-list">{otherApps.map(app => {
				const available = siteApps.available.find(item => item.app === app.app);
				const installed = siteApps.installed.find(item => item.app === app.app);
				const plans = (available?.plans || (installed as AppInstallOption | undefined)?.plans || app.plans || []) as PortalPlan[];
				const selectedPlan = findPlan(plans, planChoices[app.app] || selectedApps[app.app] || installed?.subscription?.plan || plans[0]?.name || '');
				return <article className="customer-portal-marketplace-card" key={app.name}>
					<div className="customer-portal-marketplace-copy"><h3>{app.title}</h3><p>{app.description || 'افزونهٔ منتشرشده در Marketplace'}</p><small>{(app.categories || []).join(' · ')}</small></div>
						{plans.length ? <label className="customer-portal-plan-select"><span>پلن</span><select value={selectedPlan?.name || ''} onChange={event => { const next = event.target.value; setPlanChoices(current => ({ ...current, [app.app]: next })); setSelectedApps(current => current[app.app] ? { ...current, [app.app]: next } : current); }}>{plans.map(plan => <option key={plan.name} value={plan.name}>{plan.title} · {formatPrice(planPrice(plan, currency), currency)} · {planPeriodLabel(plan.interval)}</option>)}</select></label> : <span className="customer-portal-price">قیمت اعلام نشده</span>}
					<div className="customer-portal-card-actions">
						<button type="button" className="customer-portal-secondary-button" aria-pressed={Boolean(selectedApps[app.app])} onClick={() => toggleEstimate(app, plans)}>{selectedApps[app.app] ? 'حذف از برآورد' : 'افزودن به برآورد'}</button>
						<button type="button" className="customer-portal-primary-button" disabled={!canManageBilling || Boolean(busyApp) || Boolean(pendingJob && !isTerminalJob(pendingJob.status)) || (installed ? (!installed.subscription?.name || !selectedPlan || installed.subscription.plan === selectedPlan.name) : (!available || siteStatus !== 'Active'))} onClick={() => void activateApp(app, selectedPlan)}>{!canManageBilling ? 'فقط مدیر مالی می‌تواند ثبت کند' : installed?.subscription?.name && selectedPlan && installed.subscription.plan !== selectedPlan.name ? 'تغییر پلن' : installed ? 'فعال روی سایت' : 'خرید و نصب'}</button>
					</div>
				</article>;
			})}</div> : <div className="customer-portal-inline-state">افزونه‌ای مطابق جست‌وجوی تو پیدا نشد.</div>}
		</section>

		<aside className="customer-portal-estimate">
			<div><span>برآورد پلن‌های افزونه</span>{Object.keys(selectedTotals).length ? <div className="customer-portal-estimate-totals">{Object.entries(selectedTotals).map(([period, total]) => <strong key={period}>{formatPrice(total, currency)} <small>/ {planPeriodLabel(period)}</small></strong>)}</div> : <strong>ماژولی انتخاب نشده</strong>}<p>{Object.keys(selectedApps).length} انتخاب · {selectedUnpriced} مورد بدون قیمت قابل‌محاسبه</p></div>
			<p>این جمع نرخ مبنا را نشان می‌دهد. در پلن‌های روزشمار، مبلغ صورتحساب بر اساس روزهای فعال محاسبه می‌شود؛ میزبانی سایت و هزینه‌های احتمالی جداست.</p>
		</aside>
	</div>;
}

function findPlan(plans: PortalPlan[], name: string) {
	return plans.find(plan => plan.name === name) || null;
}

function planPrice(plan: PortalPlan, currency: string) {
	const amount = currency === 'INR' ? plan.price_inr : plan.price_usd;
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
