import { useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { productModules } from '../product/modules';
import { modulePrerequisites } from '../product/pricing/catalog';
import { SelectionCheckout, type CheckoutSelectionEntry } from './SelectionCheckout';
import { usePortalConfirmation } from './PortalConfirmation';
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
	customer_description?: string | null;
	marketplace_app?: string | null;
	marketplace_app_slug: string | null;
	marketplace_app_title: string | null;
	published?: number;
	prerequisites?: AsumiModuleId[] | null;
};
type AsumiModuleId = (typeof productModules)[number]['id'];

type Props = {
	currency: string;
	teamName: string;
	sites: PortalSite[];
	selectedSite: string;
	siteStatus: string | null;
	initialModuleIds: string[];
	initialContext: string;
	canManageApps: boolean;
	canManageBilling: boolean;
	onSelectSite: (site: string) => void;
	onRequestPurchase: (moduleIds: string[], context?: string) => void;
	onRequestSupport: (subject: string, context: string, site?: string) => void;
	onRequestBillingSupport: (subject: string, context: string) => void;
	onOpenBilling: () => void;
	onRefresh: () => void;
};

type PendingJob = { site: string; job: string; app: string; title: string; status: string };
type PricingFilter = 'all' | 'free' | 'paid' | 'unpriced';
type PendingJobState = { teamName: string; jobs: PendingJob[] };
type EstimateState = { teamName: string; selections: Record<string, string> };

const pricingFilters: Array<{ value: PricingFilter; label: string }> = [
	{ value: 'all', label: 'همه' },
	{ value: 'free', label: 'رایگان' },
	{ value: 'paid', label: 'دارای تعرفه' },
	{ value: 'unpriced', label: 'بدون قیمت' },
];
const INTERNAL_APP_PLAN = '__asumi_internal__';

export function ModuleStore({ currency, teamName, sites, selectedSite, siteStatus, initialModuleIds, initialContext, canManageApps, canManageBilling, onSelectSite, onRequestPurchase, onRequestSupport, onRequestBillingSupport, onOpenBilling, onRefresh }: Props) {
	const [catalog, setCatalog] = useState<{ apps: MarketplaceApp[]; mappings: ModuleMapping[]; hidden_module_ids: string[] } | null>(null);
	const [siteApps, setSiteApps] = useState<SiteAppState>({ installed: [], available: [] });
	const [loadingCatalog, setLoadingCatalog] = useState(true);
	const [loadingSiteApps, setLoadingSiteApps] = useState(false);
	const [error, setError] = useState('');
	const [query, setQuery] = useState('');
	const [selectedCategory, setSelectedCategory] = useState('');
	const [pricingFilter, setPricingFilter] = useState<PricingFilter>('all');
	const [estimateState, setEstimateState] = useState<EstimateState>(() => ({ teamName, selections: readSelectedPlans(teamName) }));
	const selectedApps = estimateState.teamName === teamName ? estimateState.selections : {};
	const [planChoices, setPlanChoices] = useState<Record<string, string>>({});
	const [busyApp, setBusyApp] = useState('');
	const [statusMessage, setStatusMessage] = useState('');
	const [failedInstall, setFailedInstall] = useState<PendingJob | null>(null);
	const [needsCreditTopUp, setNeedsCreditTopUp] = useState(false);
	const [billingSupportContext, setBillingSupportContext] = useState('');
	const [pendingJobState, setPendingJobState] = useState<PendingJobState>(() => ({ teamName, jobs: readPendingJobs(teamName) }));
	const pendingJobs = pendingJobState.teamName === teamName ? pendingJobState.jobs : [];
	const [checkoutBusy, setCheckoutBusy] = useState(false);
	const { confirm, dialog: confirmationDialog } = usePortalConfirmation();
	const appliedInitialSelection = useRef('');
	const canBrowseCatalog = canManageApps || canManageBilling;
	function setSelectedApps(update: SetStateAction<Record<string, string>>) {
		setEstimateState(current => {
			const selection = current.teamName === teamName ? current.selections : readSelectedPlans(teamName);
			return { teamName, selections: typeof update === 'function' ? update(selection) : update };
		});
	}
	const mappingByModule = useMemo(() => new Map((catalog?.mappings || []).map(mapping => [mapping.module_id, mapping])), [catalog]);
	const categories = useMemo(() => [...new Set((catalog?.apps || []).flatMap(app => app.categories || []))].sort((a, b) => a.localeCompare(b)), [catalog]);
	const selectedTotals = useMemo(() => {
		const totals: Record<string, number> = {};
		for (const [slug, planName] of Object.entries(selectedApps)) {
			const app = catalog?.apps.find(item => item.app === slug);
			const siteApp = [...siteApps.available, ...siteApps.installed].find(item => item.app === slug);
			const installed = siteApps.installed.find(item => item.app === slug);
			if (installed?.subscription?.plan === planName) continue;
			const plan = findPlan(plansForApp(siteApp?.plans, app?.plans), planName);
			const amount = (siteApp?.team || app?.team) === teamName ? 0 : plan ? planPrice(plan, currency) : null;
			if (amount === null) continue;
			const period = planPeriodKey(plan?.interval);
			totals[period] = (totals[period] || 0) + amount;
		}
		return totals;
	}, [catalog, currency, selectedApps, siteApps, teamName]);
	const selectedUnpriced = Object.keys(selectedApps).filter(slug => {
		const app = catalog?.apps.find(item => item.app === slug);
		const siteApp = [...siteApps.available, ...siteApps.installed].find(item => item.app === slug);
		const installed = siteApps.installed.find(item => item.app === slug);
		if (installed?.subscription?.plan === selectedApps[slug]) return false;
		if ((siteApp?.team || app?.team) === teamName) return false;
		const plan = findPlan(plansForApp(siteApp?.plans, app?.plans), selectedApps[slug]);
		return !plan || planPrice(plan, currency) === null;
	}).length;
	const checkoutEntries = Object.entries(selectedApps).map(([slug, planName]): CheckoutSelectionEntry => {
		const app = catalog?.apps.find(item => item.app === slug);
		const siteApp = [...siteApps.available, ...siteApps.installed].find(item => item.app === slug);
		const installed = siteApps.installed.find(item => item.app === slug);
		const available = siteApps.available.find(item => item.app === slug);
		const plans = plansForApp(siteApp?.plans, app?.plans);
		const plan = findPlan(plans, planName);
		const internalApp = Boolean((siteApp?.team || app?.team) === teamName);
		const amount = internalApp ? 0 : plan ? planPrice(plan, currency) : null;
		const moduleId = productModules.find(module => catalog?.mappings.some(mapping => mapping.marketplace_app_slug === slug && mapping.module_id === module.id))?.id;
		const missingDependencies = moduleId ? missingPrerequisiteTitles(moduleId) : [];
		const ready = Boolean(app && (internalApp || (plan && amount !== null)) && !missingDependencies.length && (installed || (available && selectedSite && siteStatus === 'Active')));
		const state = !app ? 'نیازمند اتصال' : !internalApp && !plan ? 'پلن در دسترس نیست' : missingDependencies.length ? `پیش‌نیاز: ${missingDependencies.join('، ')}` : installed ? !installed.subscription?.plan || installed.subscription.plan === plan?.name ? 'فعال است' : 'تغییر پلن' : !selectedSite || siteStatus !== 'Active' ? 'سایت فعال انتخاب نشده' : !available ? 'با این سایت سازگار نیست' : 'آمادهٔ نصب';
		return { slug, title: app?.title || slug, planTitle: plan?.title || (internalApp ? 'دسترسی داخلی' : 'پلن نامشخص'), amount, interval: plan?.interval || 'Monthly', state, ready };
	});
	const unavailableSelectionCount = checkoutEntries.filter(entry => !entry.ready).length;
	const orderedCheckoutEntries = orderCheckoutEntries(checkoutEntries, mappingByModule, prerequisitesForModule);
	const activePendingJobs = pendingJobs.filter(job => job.site === selectedSite && !isTerminalJob(job.status));
	const canCheckout = Boolean(selectedSite && siteStatus === 'Active' && !loadingCatalog && !loadingSiteApps && !error && !checkoutBusy && !activePendingJobs.length && !selectedUnpriced && !unavailableSelectionCount);
	const purchaseRequestModuleIds = catalog ? initialModuleIds.filter(moduleId => {
		const module = productModules.find(item => item.id === moduleId);
		if (!module) return false;
		const mode = modeForModule(module.id);
		return mode === 'Purchase request' || (mode === 'Marketplace app' && !appForModule(module.id));
	}) : [];

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
		setPendingJobState({ teamName, jobs: readPendingJobs(teamName) });
	}, [teamName]);

	useEffect(() => {
		setEstimateState({ teamName, selections: readSelectedPlans(teamName) });
		setPlanChoices({});
		setError('');
		setStatusMessage('');
		setFailedInstall(null);
	}, [teamName]);

	useEffect(() => {
		if (estimateState.teamName !== teamName) return;
		const key = `asumi-module-estimate:${teamName}`;
		try {
			if (Object.keys(estimateState.selections).length) window.localStorage.setItem(key, JSON.stringify(estimateState.selections));
			else window.localStorage.removeItem(key);
		} catch { /* The estimate remains available for the current visit. */ }
	}, [estimateState, teamName]);

	useEffect(() => {
		if (!selectedSite) {
			setSiteApps({ installed: [], available: [] });
			setLoadingSiteApps(false);
			setError('');
			return;
		}
		const controller = new AbortController();
		setLoadingSiteApps(true);
		setError('');
		getSiteAppState(selectedSite, controller.signal).then(next => {
			setSiteApps(next);
			setSelectedApps(current => reconcileSelectedApps(current, catalog?.apps || [], next, currency, teamName));
		}).catch(caught => {
			if (!controller.signal.aborted) setError(messageOf(caught));
		}).finally(() => {
			if (!controller.signal.aborted) setLoadingSiteApps(false);
		});
		return () => controller.abort();
	}, [selectedSite, catalog, currency, teamName]);

	useEffect(() => {
		const selectionKey = initialModuleIds.join(',');
		if (!catalog || !selectionKey || appliedInitialSelection.current === selectionKey) return;
		const selected: Record<string, string> = {};
		for (const moduleId of initialModuleIds) {
			const mapping = mappingByModule.get(moduleId);
			if (mapping?.mode !== 'Marketplace app' || !mapping.marketplace_app_slug) continue;
			const app = catalog.apps.find(item => item.app === mapping.marketplace_app_slug);
			if (!app) continue;
			const installed = siteApps.installed.find(item => item.app === app.app);
			const siteApp = [...siteApps.available, ...siteApps.installed].find(item => item.app === app.app);
			const plans = plansForApp(siteApp?.plans, app.plans);
			const plan = findPlan(plans, installed?.subscription?.plan || '') || [...plans].sort((left, right) =>
				(planPrice(left, currency) ?? Number.POSITIVE_INFINITY) - (planPrice(right, currency) ?? Number.POSITIVE_INFINITY),
			)[0];
			if (plan) selected[app.app] = plan.name;
			else if ((siteApp?.team || app.team) === teamName) selected[app.app] = INTERNAL_APP_PLAN;
		}
		if (Object.keys(selected).length) setSelectedApps(current => ({ ...current, ...selected }));
		appliedInitialSelection.current = selectionKey;
	}, [catalog, currency, initialModuleIds, mappingByModule, siteApps, teamName]);

	useEffect(() => {
		const jobsToCheck = pendingJobs.filter(job => job.site === selectedSite && !isTerminalJob(job.status));
		if (!jobsToCheck.length) return;
		const timer = window.setTimeout(() => {
			void Promise.allSettled(jobsToCheck.map(async job => ({ job, result: await getInstallStatus(job.site, job.job) }))).then(results => {
				const statuses = new Map(results.flatMap(result => result.status === 'fulfilled' ? [[result.value.job.job, result.value.result.status] as const] : []));
				const finished = jobsToCheck.map(job => ({ ...job, status: statuses.get(job.job) || job.status })).filter(job => isTerminalJob(job.status));
				setPendingJobState(current => {
					const currentJobs = current.teamName === teamName ? current.jobs : readPendingJobs(teamName);
					const next = currentJobs.map(job => ({ ...job, status: statuses.get(job.job) || job.status })).filter(job => !isTerminalJob(job.status));
					persistPendingJobs(teamName, next);
					return { teamName, jobs: next };
				});
				if (finished.length) {
					const failed = finished.filter(job => job.status !== 'Success');
					setFailedInstall(failed[failed.length - 1] || null);
					const succeeded = finished.length - failed.length;
					setStatusMessage(failed.length
						? `${new Intl.NumberFormat('fa-IR').format(succeeded)} نصب کامل شد و ${new Intl.NumberFormat('fa-IR').format(failed.length)} مورد نیازمند پیگیری است؛ تاریخچهٔ خریدها را ببین.`
						: `${new Intl.NumberFormat('fa-IR').format(succeeded)} ماژول با موفقیت فعال شد.`);
					onRefresh();
					void reloadSiteApps();
				}
			});
		}, 6000);
		return () => window.clearTimeout(timer);
	}, [pendingJobs, selectedSite, teamName, onRefresh]);

	async function reloadSiteApps() {
		if (!selectedSite) return;
		try { setSiteApps(await getSiteAppState(selectedSite)); } catch (caught) { setError(messageOf(caught)); }
	}

	function updatePendingJobs(update: (current: PendingJob[]) => PendingJob[]) {
		setPendingJobState(current => {
			const jobs = update(current.teamName === teamName ? current.jobs : readPendingJobs(teamName));
			persistPendingJobs(teamName, jobs);
			return { teamName, jobs };
		});
	}

	function appForModule(moduleId: string) {
		const mapping = mappingByModule.get(moduleId);
		if (!mapping || mapping.mode !== 'Marketplace app' || !mapping.marketplace_app_slug) return null;
		return catalog?.apps.find(app => app.app === mapping.marketplace_app_slug) || null;
	}

	function modeForModule(moduleId: string) {
		const mapping = mappingByModule.get(moduleId);
		return mapping?.mode || 'Purchase request';
	}

	function prerequisitesForModule(moduleId: AsumiModuleId) {
		return mappingByModule.get(moduleId)?.prerequisites ?? modulePrerequisites[moduleId];
	}

	function missingPrerequisiteTitles(moduleId: AsumiModuleId, selection: Record<string, string> = selectedApps) {
		return prerequisitesForModule(moduleId).filter(prerequisiteId => {
			if (modeForModule(prerequisiteId) === 'Included') return false;
			const mapping = mappingByModule.get(prerequisiteId);
			if (mapping?.mode !== 'Marketplace app' || !mapping.marketplace_app_slug) return true;
			const prerequisiteSlug = mapping.marketplace_app_slug;
			return !selection[prerequisiteSlug] && !siteApps.installed.some(item => item.app === prerequisiteSlug);
		}).map(prerequisiteId => productModules.find(module => module.id === prerequisiteId)?.title || prerequisiteId);
	}

	function toggleEstimate(app: MarketplaceApp, plans: PortalPlan[], moduleId?: AsumiModuleId) {
		const installed = siteApps.installed.find(item => item.app === app.app);
		const currentPlan = installed?.subscription?.plan;
		const selected = selectedApps[app.app];
		if (selected) {
			setSelectedApps(current => { const next = { ...current }; delete next[app.app]; return next; });
			return;
		}
		const internalApp = (siteApps.available.find(item => item.app === app.app)?.team || app.team) === teamName;
		const chosen = findPlan(plans, planChoices[app.app] || '') || plans.find(plan => plan.name === currentPlan) || [...plans].sort((a, b) => (planPrice(a, currency) ?? Number.POSITIVE_INFINITY) - (planPrice(b, currency) ?? Number.POSITIVE_INFINITY))[0];
		if (!chosen && !internalApp) return;
		const prerequisiteSelections: Record<string, string> = {};
		const missingPrerequisites: string[] = [];
		for (const prerequisiteId of moduleId ? prerequisitesForModule(moduleId) : []) {
			if (modeForModule(prerequisiteId) === 'Included') continue;
			const mapping = mappingByModule.get(prerequisiteId);
			if (mapping?.mode !== 'Marketplace app' || !mapping.marketplace_app_slug) {
				missingPrerequisites.push(productModules.find(module => module.id === prerequisiteId)?.title || prerequisiteId);
				continue;
			}
			const slug = mapping.marketplace_app_slug;
			if (selectedApps[slug] || siteApps.installed.some(item => item.app === slug)) continue;
			const prerequisiteApp = catalog?.apps.find(item => item.app === slug);
			const siteApp = [...siteApps.available, ...siteApps.installed].find(item => item.app === slug);
			if ((siteApp?.team || prerequisiteApp?.team) === teamName) {
				prerequisiteSelections[slug] = INTERNAL_APP_PLAN;
				continue;
			}
			const prerequisitePlans = plansForApp(siteApp?.plans, prerequisiteApp?.plans);
			const selectedPlan = findPlan(prerequisitePlans, planChoices[slug] || '') || [...prerequisitePlans].sort((a, b) => (planPrice(a, currency) ?? Number.POSITIVE_INFINITY) - (planPrice(b, currency) ?? Number.POSITIVE_INFINITY))[0];
			if (selectedPlan) prerequisiteSelections[slug] = selectedPlan.name;
			else missingPrerequisites.push(productModules.find(module => module.id === prerequisiteId)?.title || prerequisiteId);
		}
		if (missingPrerequisites.length) {
			setStatusMessage(`برای انتخاب «${productModules.find(module => module.id === moduleId)?.title || app.title}»، اول وضعیت این پیش‌نیازها را مشخص کن: ${missingPrerequisites.join('، ')}.`);
			return;
		}
		setSelectedApps(current => ({ ...current, ...prerequisiteSelections, [app.app]: chosen?.name || INTERNAL_APP_PLAN }));
		if (Object.keys(prerequisiteSelections).length) setStatusMessage('پلن کم‌هزینه‌ترِ پیش‌نیازها هم به برآورد اضافه شد؛ قبل از ثبت، همهٔ انتخاب‌ها را مرور کن.');
	}

	async function activateApp(app: MarketplaceApp, selectedPlan: PortalPlan | null) {
		setFailedInstall(null);
		const slug = app.app;
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
			if (!canManageBilling) {
				setStatusMessage('تغییر پلن روی صورتحساب اثر می‌گذارد؛ از مدیر مالی تیم بخواه آن را ثبت کند.');
				return;
			}
			const confirmed = await confirm({
				title: 'تأیید تغییر پلن',
				description: `پلن «${app.title}» برای سایت ${sites.find(site => site.name === selectedSite)?.label || selectedSite} به‌روزرسانی شود؟`,
				details: [`پلن جدید: ${selectedPlan.title}`, `مبلغ: ${formatPrice(planPrice(selectedPlan, currency), currency)}`, `دورهٔ تمدید: ${planPeriodLabel(selectedPlan.interval)}`],
				note: 'مبلغ نهایی و هر تعدیل دوره در صورتحساب حساب ثبت می‌شود.',
				confirmLabel: 'تأیید تغییر پلن',
			});
			if (!confirmed) return;
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
		const availablePlans = plansForApp(available.plans, app.plans);
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
		const requiresBillingPermission = Boolean(installPlan && selectedPlanPrice !== null && selectedPlanPrice > 0);
		if (requiresBillingPermission ? !canManageBilling : !canManageApps) {
			setStatusMessage(requiresBillingPermission
				? 'برای خرید پلن پولی، از مدیر مالی تیم بخواه ثبت سفارش را انجام دهد.'
				: 'برای نصب ماژول رایگان، دسترسی مدیر ماژول‌های تیم لازم است.');
			return;
		}
		if (installPlan && selectedPlan && selectedPlanPrice !== null && selectedPlanPrice > 0) {
			const confirmed = await confirm({
				title: 'تأیید خرید و فعال‌سازی',
				description: `افزونهٔ «${app.title}» برای سایت ${sites.find(site => site.name === selectedSite)?.label || selectedSite} ثبت شود؟`,
				details: [`پلن: ${selectedPlan.title}`, `مبلغ هر دوره: ${formatPrice(selectedPlanPrice, currency)}`, `دورهٔ تمدید: ${planPeriodLabel(selectedPlan.interval)}`],
				note: 'مبلغ نهایی در فاکتور حساب ثبت می‌شود. با لغو اشتراک، تمدید متوقف و افزونه از سایت حذف خواهد شد.',
				confirmLabel: 'ثبت خرید و نصب',
			});
			if (!confirmed) return;
		}
		setBusyApp(slug);
		setError('');
		setNeedsCreditTopUp(false);
		setBillingSupportContext('');
		try {
			const job = await installMarketplaceApp(selectedSite, slug, installPlan);
			if (job) {
				const pending = { site: selectedSite, job, app: slug, title: app.title, status: 'Pending' };
				updatePendingJobs(current => [...current.filter(item => item.job !== job), pending]);
				setStatusMessage(`درخواست نصب «${app.title}» ثبت شد؛ وضعیت را همین‌جا پیگیری می‌کنیم.`);
			} else {
				setStatusMessage(`«${app.title}» از قبل نصب است.`);
			}
			onRefresh();
		} catch (caught) {
			showActionError(caught);
		} finally { setBusyApp(''); }
	}

	async function activateSelectedApps() {
		if (!canCheckout || !catalog || !selectedSite) {
			setStatusMessage(unavailableSelectionCount ? 'موارد ناسازگار را از انتخاب‌ها بردار یا سایت دیگری انتخاب کن.' : 'برای ثبت انتخاب‌ها، یک سایت فعال و قیمت قابل‌محاسبه لازم است.');
			return;
		}
		const siteLabel = sites.find(site => site.name === selectedSite)?.label || selectedSite;
		const plannedEntries = orderedCheckoutEntries.filter(entry => entry.state !== 'فعال است');
		if (!plannedEntries.length) {
			setSelectedApps({});
			setStatusMessage('همهٔ موارد انتخاب‌شده با همین پلن روی سایت فعال هستند.');
			return;
		}
		const needsBilling = plannedEntries.some(entry => entry.state === 'تغییر پلن' || (entry.amount ?? 0) > 0);
		const needsAppAccess = plannedEntries.some(entry => entry.state !== 'تغییر پلن' && entry.amount === 0);
		if ((needsBilling && !canManageBilling) || (needsAppAccess && !canManageApps)) {
			setStatusMessage(needsBilling && needsAppAccess
				? 'برای این ترکیب، دسترسی مدیر مالی و مدیر ماژول‌ها لازم است. انتخاب‌ها را با مدیران تیم هماهنگ کن.'
				: needsBilling
					? 'برای خرید پلن پولی یا تغییر اشتراک، مدیر مالی تیم باید اقدام کند.'
					: 'برای نصب ماژول رایگان، مدیر ماژول‌های تیم باید اقدام کند.');
			return;
		}
		const actionTotals = plannedEntries.reduce<Record<string, number>>((totals, entry) => {
			if (entry.amount !== null) totals[planPeriodKey(entry.interval)] = (totals[planPeriodKey(entry.interval)] || 0) + entry.amount;
			return totals;
		}, {});
		const totalLines = Object.entries(actionTotals).map(([period, total]) => `${formatPrice(total, currency)} · جمع ${planPeriodLabel(period)}`).join('، ');
		const confirmed = await confirm({
			title: 'مرور و ثبت انتخاب‌ها',
			description: `${new Intl.NumberFormat('fa-IR').format(plannedEntries.length)} ماژول یا تغییر پلن برای سایت ${siteLabel} ثبت شود؟`,
			details: [...plannedEntries.map(entry => `${entry.title} · ${entry.planTitle} · ${formatPrice(entry.amount, currency)} در ${planPeriodLabel(entry.interval)}`), ...totalLines],
			note: 'هر ماژول در اشتراک خودش ثبت می‌شود. این جمع بر اساس قیمت پلن‌هاست؛ مالیات احتمالی، اعتبار حساب و محاسبهٔ روزشمار در فاکتور نهایی اعمال می‌شود.',
			confirmLabel: 'ثبت انتخاب‌ها',
		});
		if (!confirmed) return;

		setCheckoutBusy(true);
		setBusyApp('checkout');
		setError('');
		setFailedInstall(null);
		setNeedsCreditTopUp(false);
		setBillingSupportContext('');
		setStatusMessage('');
		const completedSlugs: string[] = [];
		let installationsStarted = 0;
		let plansChanged = 0;
		let alreadyActive = 0;
		let failure: { app: string; message: string } | null = null;
		try {
			for (const entry of orderedCheckoutEntries) {
				const app = catalog.apps.find(item => item.app === entry.slug);
				const installed = siteApps.installed.find(item => item.app === entry.slug);
				const available = siteApps.available.find(item => item.app === entry.slug);
				const plans = plansForApp(available?.plans, (installed as AppInstallOption | undefined)?.plans, app?.plans);
				const plan = findPlan(plans, selectedApps[entry.slug] || '');
				const internalApp = (available?.team || app?.team) === teamName;
				if (!app || (!plan && !internalApp) || !entry.ready) {
					failure = { app: entry.title, message: 'سازگاری یا پلن یکی از انتخاب‌ها تغییر کرده است؛ فهرست را تازه‌سازی کن.' };
					break;
				}
				if (installed && (!installed.subscription?.name || internalApp || (plan && installed.subscription.plan === plan.name))) {
					completedSlugs.push(entry.slug);
					alreadyActive += 1;
					continue;
				}
				try {
					if (installed?.subscription?.name && plan) {
						await changeMarketplacePlan(installed.subscription.name, plan.name);
						plansChanged += 1;
					} else {
						const job = await installMarketplaceApp(selectedSite, app.app, internalApp ? undefined : plan?.name);
						if (job) {
							const pending = { site: selectedSite, job, app: app.app, title: app.title, status: 'Pending' };
							updatePendingJobs(current => [...current.filter(item => item.job !== job), pending]);
							installationsStarted += 1;
						} else alreadyActive += 1;
					}
					completedSlugs.push(entry.slug);
				} catch (caught) {
					failure = { app: app.title, message: messageOf(caught) };
					break;
				}
			}
		} finally {
			setCheckoutBusy(false);
			setBusyApp('');
		}

		if (completedSlugs.length) setSelectedApps(current => Object.fromEntries(Object.entries(current).filter(([slug]) => !completedSlugs.includes(slug))));
		if (failure) {
			setError(`${failure.message} مورد مشکل‌دار: ${failure.app}. انتخاب‌های ثبت‌نشده در فهرست باقی ماندند.`);
			setNeedsCreditTopUp(canManageBilling && /credit|balance|fund|اعتبار|مانده|پرداخت/i.test(failure.message));
			setStatusMessage(completedSlugs.length ? `${new Intl.NumberFormat('fa-IR').format(completedSlugs.length)} مورد ثبت یا فعال بود؛ موارد بعد از خطا ثبت نشدند.` : 'هیچ موردی از انتخاب‌ها ثبت نشد.');
		} else {
			setStatusMessage(`${new Intl.NumberFormat('fa-IR').format(installationsStarted)} نصب ثبت شد، ${new Intl.NumberFormat('fa-IR').format(plansChanged)} پلن به‌روزرسانی شد و ${new Intl.NumberFormat('fa-IR').format(alreadyActive)} مورد از قبل فعال بود. وضعیت نصب را در همین صفحه یا خریدها ببین.`);
		}
		if (completedSlugs.length) {
			onRefresh();
			void reloadSiteApps();
		}
	}

	function showActionError(caught: unknown) {
		const message = messageOf(caught);
		setError(message);
		setNeedsCreditTopUp(canManageBilling && /credit|balance|fund|اعتبار|مانده|پرداخت/.test(message.toLocaleLowerCase()));
		setBillingSupportContext(/billing period|دورهٔ پرداخت|دوره/.test(message.toLocaleLowerCase()) ? message : '');
	}

	const normalizedQuery = query.trim().toLocaleLowerCase();
	const visibleModules = productModules.filter(module => {
		if (catalog?.hidden_module_ids.includes(module.id)) return false;
		const mapping = mappingByModule.get(module.id);
		if (mapping?.published === 0) return false;
		const mode = modeForModule(module.id);
		const app = appForModule(module.id);
		const installed = app && siteApps.installed.some(item => item.app === app.app);
		if (!canBrowseCatalog && mode !== 'Included' && !installed) return false;
		const available = app && siteApps.available.find(item => item.app === app.app);
		const siteApp = available || (app && siteApps.installed.find(item => item.app === app.app));
		const plans = plansForApp(siteApp?.plans, app?.plans);
		const searchable = [module.title, module.description, mapping?.customer_description, app?.title, ...(app?.categories || [])].filter(Boolean).join(' ').toLocaleLowerCase();
		return searchable.includes(normalizedQuery)
			&& (!selectedCategory || Boolean(app?.categories?.includes(selectedCategory)))
			&& matchesPricingFilter(mode, plans, pricingFilter, currency);
	});
	return <div className="customer-portal-workspace">
		<section className="customer-portal-panel" aria-labelledby="portal-store-title">
			<div className="customer-portal-panel-heading">
				<div><p>{canBrowseCatalog ? 'کاتالوگ و خرید' : 'امکانات در دسترس'}</p><h2 id="portal-store-title">ماژول‌ها و افزونه‌ها</h2></div>
				<span>{selectedSite ? `سایت مقصد: ${sites.find(site => site.name === selectedSite)?.label || selectedSite}` : 'سایت مقصد انتخاب نشده'}</span>
			</div>
			<p className="customer-portal-help-copy">{canBrowseCatalog ? <>امکانات پایهٔ آسومی جدا از افزونه‌های قابل خرید نشان داده می‌شوند. قیمت افزونه‌ها از پلن‌های فعال حساب می‌آید و هزینهٔ میزبانی جداگانه است.{!canManageBilling ? ' برآورد در دسترس است؛ ثبت خرید را مدیر مالی تیم انجام می‌دهد.' : ''}</> : 'امکانات رایگان و ماژول‌های فعال این تیم را می‌بینی. برای دیدن تعرفه‌ها یا درخواست ماژول جدید، از مدیر تیم بخواه دسترسی ماژول‌ها را برای نقش تو فعال کند.'}</p>
			{initialModuleIds.length > 0 && <div className={`customer-portal-inline-state${purchaseRequestModuleIds.length ? ' customer-portal-initial-selection' : ''}`}>
				<span role="status">ترکیب انتخابی به کاتالوگ منتقل شد؛ قیمت قابل خرید بر اساس پلن فعال هر افزونه محاسبه می‌شود.</span>
				{purchaseRequestModuleIds.length > 0 && <><span>برای {purchaseRequestModuleIds.map(id => productModules.find(module => module.id === id)?.shortTitle || id).join('، ')} هنوز خرید خودکار تعریف نشده.</span><button type="button" className="customer-portal-secondary-button" onClick={() => onRequestPurchase(purchaseRequestModuleIds, [initialContext, `درخواست بررسی خرید برای: ${purchaseRequestModuleIds.map(id => productModules.find(module => module.id === id)?.title || id).join('، ')}`].filter(Boolean).join('\n\n'))}>درخواست بررسی این ماژول‌ها</button></>}
			</div>}
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
			{statusMessage && <div className={`customer-portal-inline-status${failedInstall ? ' customer-portal-inline-status--action' : ''}`} role="status"><span>{statusMessage}</span>{failedInstall && <button type="button" onClick={() => onRequestSupport(`پیگیری نصب ${failedInstall.title}`, `نصب ماژول «${failedInstall.title}» برای سایت ${sites.find(site => site.name === failedInstall.site)?.label || failedInstall.site} با وضعیت «${installStatusLabel(failedInstall.status)}» کامل نشده است. لطفاً علت را بررسی و راهنمایی کنید.`, failedInstall.site)}>درخواست پشتیبانی نصب</button>}</div>}
			{activePendingJobs.map(job => <div className="customer-portal-install-progress" role="status" key={job.job}><span className="customer-portal-spinner" aria-hidden="true" /><div><strong>در حال آماده‌سازی {job.title}</strong><p>{installStatusLabel(job.status)} · نتیجه به‌صورت خودکار به‌روز می‌شود.</p></div></div>)}
			<div className="customer-portal-module-grid">
				{visibleModules.map(module => {
					const mode = modeForModule(module.id);
					const mapping = mappingByModule.get(module.id);
					const prerequisiteTitles = prerequisitesForModule(module.id)
						.map(id => productModules.find(item => item.id === id)?.title)
						.filter((title): title is string => Boolean(title));
					const missingDependencies = missingPrerequisiteTitles(module.id);
					const app = appForModule(module.id);
					const available = app ? siteApps.available.find(item => item.app === app.app) : undefined;
					const installed = app ? siteApps.installed.find(item => item.app === app.app) : undefined;
					const plans = plansForApp(available?.plans, (installed as AppInstallOption | undefined)?.plans, app?.plans);
					const selectedPlanName = planChoices[app?.app || ''] || selectedApps[app?.app || ''] || installed?.subscription?.plan || plans[0]?.name || '';
					const plan = findPlan(plans, selectedPlanName);
					const selectedPlanPrice = plan ? planPrice(plan, currency) : null;
					const changingPlan = Boolean(installed?.subscription?.name && plan && installed.subscription.plan !== plan.name);
					const isExternalApp = Boolean(app && (available?.team || app.team) !== teamName);
					const requiresBillingPermission = changingPlan || Boolean(!installed && isExternalApp && plan && (selectedPlanPrice === null || selectedPlanPrice > 0));
					const canManageAppAction = requiresBillingPermission ? canManageBilling : canManageApps;
					const missingCurrencyPrice = Boolean(canBrowseCatalog && isExternalApp && plan && selectedPlanPrice === null);
					return <article className="customer-portal-module-card" key={module.id}>
						<div className="customer-portal-module-card-head"><div><span className="customer-portal-module-icon" aria-hidden="true">{module.shortTitle.slice(0, 1)}</span><div><h3>{module.title}</h3><p>{module.description}</p></div></div><StatusPill label={installed ? 'فعال روی سایت' : mode === 'Included' ? 'شامل امکانات پایه' : mode === 'Marketplace app' ? 'افزونهٔ قابل خرید' : 'درخواست خرید'} status={installed ? 'Active' : mode === 'Included' ? 'Free' : 'Pending'} /></div>
						<ul className="customer-portal-module-features">{module.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
						{(prerequisiteTitles.length > 0 || mapping?.customer_description) && <div className="customer-portal-compatibility-note"><strong>پیش‌نیاز و سازگاری</strong><p>{[prerequisiteTitles.length ? `نیازمند: ${prerequisiteTitles.join('، ')}` : '', mapping?.customer_description].filter(Boolean).join(' · ')}</p></div>}
						{missingDependencies.length > 0 && <p className="customer-portal-card-hint">برای ثبت این ماژول، ابتدا این پیش‌نیازها را به انتخاب‌ها اضافه کن: {missingDependencies.join('، ')}.</p>}
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
									<button type="button" className="customer-portal-secondary-button" aria-pressed={Boolean(selectedApps[app.app])} onClick={() => toggleEstimate(app, plans, module.id)}>{selectedApps[app.app] ? 'حذف از برآورد' : 'افزودن به برآورد'}</button>
									{missingCurrencyPrice && <button type="button" className="customer-portal-secondary-button" onClick={() => onRequestBillingSupport('استعلام تعرفهٔ افزونه', `تعرفهٔ پلن «${plan?.title}» برای افزونهٔ «${app.title}» با ارز ${currency} ثبت نشده است؛ لطفاً مبلغ و روش خرید را اعلام کنید.`)}>استعلام تعرفه</button>}
									<button type="button" className="customer-portal-primary-button" disabled={!canManageAppAction || Boolean(busyApp) || activePendingJobs.length > 0 || missingDependencies.length > 0 || missingCurrencyPrice || (!installed && (!available || siteStatus !== 'Active')) || Boolean(installed && (!installed.subscription?.name || !plan || installed.subscription.plan === plan.name))} onClick={() => void activateApp(app, plan)}>{!canManageAppAction ? requiresBillingPermission ? 'فقط مدیر مالی می‌تواند ثبت کند' : 'دسترسی مدیر ماژول لازم است' : busyApp === app.app || checkoutBusy ? 'در حال ثبت…' : installed?.subscription?.name && plan && installed.subscription.plan !== plan.name ? 'تغییر پلن' : installed ? 'فعال روی سایت' : 'خرید و نصب'}</button>
								</div>}
							</> : mode === 'Marketplace app' ? <><p className="customer-portal-card-hint">این ماژول به افزونهٔ منتشرشدهٔ قابل نمایش در کاتالوگ متصل نیست؛ برای بررسی، درخواست بفرست.</p><div className="customer-portal-card-actions"><button type="button" className="customer-portal-secondary-button" onClick={() => onRequestPurchase([module.id])}>درخواست بررسی اتصال</button></div></>
							: <div className="customer-portal-card-actions"><button type="button" className="customer-portal-secondary-button" onClick={() => onRequestPurchase([module.id])}>درخواست خرید این ماژول</button></div>}
					</article>;
				})}
			</div>
			{!visibleModules.length && <div className="customer-portal-inline-state">ماژولی با این جست‌وجو و فیلتر پیدا نشد.</div>}
		</section>

		{canBrowseCatalog && <SelectionCheckout entries={checkoutEntries} totals={selectedTotals} currency={currency} unpricedCount={selectedUnpriced} unavailableCount={unavailableSelectionCount} canManageApps={canManageApps} canManageBilling={canManageBilling} canCheckout={canCheckout} busy={checkoutBusy || busyApp === 'checkout'} pendingCount={activePendingJobs.length} onClear={() => setSelectedApps({})} onCheckout={() => void activateSelectedApps()} />}
		{confirmationDialog}
		</div>;
}

function orderCheckoutEntries(
	entries: CheckoutSelectionEntry[],
	mappings: Map<string, ModuleMapping>,
	getPrerequisites: (moduleId: AsumiModuleId) => readonly AsumiModuleId[],
) {
	const entriesBySlug = new Map(entries.map(entry => [entry.slug, entry]));
	const moduleIdBySlug = new Map<string, AsumiModuleId>();
	for (const module of productModules) {
		const slug = mappings.get(module.id)?.marketplace_app_slug;
		if (slug && !moduleIdBySlug.has(slug)) moduleIdBySlug.set(slug, module.id);
	}
	const ordered: CheckoutSelectionEntry[] = [];
	const visited = new Set<string>();
	const visiting = new Set<string>();
	function visit(entry: CheckoutSelectionEntry) {
		if (visited.has(entry.slug) || visiting.has(entry.slug)) return;
		visiting.add(entry.slug);
		const moduleId = moduleIdBySlug.get(entry.slug);
		if (moduleId) {
			for (const prerequisiteId of getPrerequisites(moduleId)) {
				const prerequisiteSlug = mappings.get(prerequisiteId)?.marketplace_app_slug;
				const prerequisite = prerequisiteSlug ? entriesBySlug.get(prerequisiteSlug) : undefined;
				if (prerequisite) visit(prerequisite);
			}
		}
		visiting.delete(entry.slug);
		visited.add(entry.slug);
		ordered.push(entry);
	}
	for (const entry of entries) visit(entry);
	return ordered;
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

function plansForApp(...sources: Array<PortalPlan[] | undefined>) {
	return sources.find(source => source?.length) || [];
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

function reconcileSelectedApps(current: Record<string, string>, apps: MarketplaceApp[], state: SiteAppState, currency: string, teamName: string) {
	const available = new Map([...state.available, ...state.installed].map(item => [item.app, item]));
	return Object.fromEntries(Object.entries(current).map(([slug, planName]) => {
		const siteApp = available.get(slug);
		const app = apps.find(item => item.app === slug);
		const plans = plansForApp(siteApp?.plans, app?.plans);
		if ((siteApp?.team || app?.team) === teamName && !plans.length) return [slug, INTERNAL_APP_PLAN];
		const plan = findPlan(plans, planName) || [...plans].sort((a, b) => (planPrice(a, currency) ?? Infinity) - (planPrice(b, currency) ?? Infinity))[0];
		return [slug, plan?.name || ''];
	}).filter(([, planName]) => Boolean(planName)));
}

function isTerminalJob(status: string) {
	return ['Success', 'Failure', 'Delivery Failure'].includes(status);
}

function installStatusLabel(status: string) {
	return { Pending: 'در صف آماده‌سازی', Running: 'در حال آماده‌سازی', Failure: 'کامل نشد', 'Delivery Failure': 'در انتظار تکمیل اتصال' }[status] || 'نیازمند پیگیری';
}

function readPendingJobs(teamName: string): PendingJob[] {
	try {
		const key = `asumi-pending-install:${teamName}`;
		const stored = window.localStorage.getItem(key);
		const value = JSON.parse(stored || window.localStorage.getItem('asumi-pending-install') || 'null') as PendingJob | PendingJob[] | null;
		const jobs = (Array.isArray(value) ? value : value ? [value] : []).filter(job => job.site && job.job && !isTerminalJob(job.status));
		if (!stored && jobs.length) persistPendingJobs(teamName, jobs);
		return jobs;
	} catch { return []; }
}

function readSelectedPlans(teamName: string) {
	try {
		const value = JSON.parse(window.localStorage.getItem(`asumi-module-estimate:${teamName}`) || '{}') as Record<string, unknown>;
		return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
	} catch { return {}; }
}

function persistPendingJobs(teamName: string, jobs: PendingJob[]) {
	try {
		const key = `asumi-pending-install:${teamName}`;
		if (jobs.length) window.localStorage.setItem(key, JSON.stringify(jobs));
		else window.localStorage.removeItem(key);
		window.localStorage.removeItem('asumi-pending-install');
	} catch { /* The server-side installation history remains authoritative. */ }
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
