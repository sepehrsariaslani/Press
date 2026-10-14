import { useEffect, useRef, useState } from 'react';
import { SiteFooter } from '../../components/site/SiteFooter';
import { SiteHeader } from '../../components/site/SiteHeader';
import { productModules } from '../modules';
import { ModuleChooser } from './ModuleChooser';
import { PricingPresets, formatToman } from './PricingPresets';
import { SelectedModuleDetail } from './SelectedModuleDetail';
import {
	pricingAddons,
	pricingNotice,
	pricingPresets,
	type PricingAddonId,
	type PricingPreset,
} from './catalog';
import { addModule, removeModule, validSavedModules, type ModuleId } from './selection';
import { estimateSelection } from './estimate';
import { loadServiceAddonCatalog, loadServiceCheckoutStatus, loadServicePrices, type SellableAddon, type ServicePriceMap } from './pricingApi';
import './module-pricing.css';

const storageKey = 'asumi-pricing-selection-v2';
type SavedSelection = { moduleIds: ModuleId[]; addonIds: PricingAddonId[] };

function initialSelection(): SavedSelection {
	try {
		const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null') as Partial<SavedSelection> | null;
		let moduleIds: ModuleId[] = [];
		for (const id of validSavedModules(saved?.moduleIds)) moduleIds = addModule(moduleIds, id).selected;
		const availableAddons = pricingAddons.filter(addon => moduleIds.includes(addon.moduleId)).map(addon => addon.id);
		const addonIds = availableAddons.filter(id => saved?.addonIds?.includes(id));
		return moduleIds.length ? { moduleIds, addonIds } : { moduleIds: ['finance'], addonIds: [] };
	} catch {
		return { moduleIds: ['finance'], addonIds: [] };
	}
}

function matchingPreset(moduleIds: readonly ModuleId[], addonIds: readonly PricingAddonId[]) {
	return pricingPresets.find(preset => sameItems(moduleIds, preset.moduleIds) && sameItems(addonIds, preset.addonIds))?.id || null;
}

function sameItems(left: readonly string[], right: readonly string[]) {
	return left.length === right.length && left.every(id => right.includes(id));
}

function persianNumber(value: number) {
	return String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[+digit]);
}

type ModulePricingPageProps = {
	isAuthenticated?: boolean;
	onOpenModule: (moduleId: string) => void;
	onReturnToModules: () => void;
	onPurchaseAddon?: (addonId: SellableAddon['id']) => void;
	onRequestPurchase: (moduleIds: string[], context: string, addonIds: string[], intent: 'request' | 'purchase') => void;
};

export function ModulePricingPage({ isAuthenticated = false, onOpenModule, onReturnToModules, onPurchaseAddon = () => {}, onRequestPurchase }: ModulePricingPageProps) {
	const heading = useRef<HTMLHeadingElement>(null);
	const [initial] = useState(initialSelection);
	const [selectedIds, setSelectedIds] = useState<ModuleId[]>(initial.moduleIds);
	const [selectedAddonIds, setSelectedAddonIds] = useState<PricingAddonId[]>(initial.addonIds);
	const [activeId, setActiveId] = useState<ModuleId>(initial.moduleIds[0] || 'finance');
	const [status, setStatus] = useState('');
	const [saved, setSaved] = useState(false);
	const [prices, setPrices] = useState<ServicePriceMap | null>(null);
	const [pricesLoading, setPricesLoading] = useState(true);
	const [checkoutEnabled, setCheckoutEnabled] = useState(false);
	const [checkoutStatusLoaded, setCheckoutStatusLoaded] = useState(false);
	const [pricesError, setPricesError] = useState('');
	const [pricingAttempt, setPricingAttempt] = useState(0);
	const [accountAddons, setAccountAddons] = useState<SellableAddon[]>([]);
	const [accountAddonsLoading, setAccountAddonsLoading] = useState(true);
	const [accountAddonsError, setAccountAddonsError] = useState('');
	const activeModule = productModules.find(module => module.id === activeId) || productModules[0];
	const selectedPresetId = matchingPreset(selectedIds, selectedAddonIds);

	useEffect(() => heading.current?.focus({ preventScroll: true }), []);
	useEffect(() => {
		let active = true;
		setPricesLoading(true);
		setPricesError('');
		setCheckoutStatusLoaded(false);
		Promise.all([
			loadServicePrices().then(value => ({ ok: true as const, value })).catch(() => ({ ok: false as const })),
			loadServiceCheckoutStatus().catch(() => false),
		]).then(([priceResult, canCheckout]) => {
			if (active) {
				setCheckoutEnabled(canCheckout);
				if (priceResult.ok) {
					setPrices(priceResult.value);
				} else {
					setPrices(null);
					setPricesError('تعرفهٔ زندهٔ آسومی در دسترس نیست. تا زمان دریافت قیمت معتبر، درخواست ثبت نمی‌شود.');
				}
			}
		}).finally(() => {
			if (active) {
				setPricesLoading(false);
				setCheckoutStatusLoaded(true);
			}
		});
		return () => { active = false; };
	}, [pricingAttempt]);

	useEffect(() => {
		let active = true;
		setAccountAddonsLoading(true);
		setAccountAddonsError('');
		loadServiceAddonCatalog().then(result => {
			if (active) setAccountAddons(result);
		}).catch(() => {
			if (active) {
				setAccountAddons([]);
				setAccountAddonsError('وضعیت افزونه‌های حسابیار فعلاً دریافت نشد؛ خریدی ثبت نشده است.');
			}
		}).finally(() => { if (active) setAccountAddonsLoading(false); });
		return () => { active = false; };
	}, [pricingAttempt]);

	function selectPreset(preset: PricingPreset) {
		let moduleIds: ModuleId[] = [];
		for (const id of preset.moduleIds) moduleIds = addModule(moduleIds, id).selected;
		const addonIds = preset.addonIds.filter(id => {
			const addon = pricingAddons.find(item => item.id === id);
			return addon && moduleIds.includes(addon.moduleId);
		});
		setSelectedIds(moduleIds);
		setSelectedAddonIds(addonIds);
		setActiveId(moduleIds[0] || 'finance');
		setStatus(`ترکیب «${preset.title}» انتخاب شد؛ حالا می‌توانی هر ماژول یا افزونه‌ای را تغییر بدهی.`);
		setSaved(false);
	}

	function toggleModule(moduleId: ModuleId) {
		setActiveId(moduleId);
		if (selectedIds.includes(moduleId)) return removeSelectedModule(moduleId);
		addSelectedModule(moduleId);
	}

	function removeSelectedModule(moduleId: ModuleId) {
		const result = removeModule(selectedIds, moduleId);
		if (result.blockedBy.length) {
			setStatus(`برای حذف ${moduleTitle(moduleId)}، ابتدا این ماژول‌های وابسته را حذف کن: ${result.blockedBy.map(moduleTitle).join('، ')}.`);
			return;
		}
		setSelectedIds(result.selected);
		const remainingModules = new Set(result.selected);
		setSelectedAddonIds(current => current.filter(addonId => {
			const addon = pricingAddons.find(item => item.id === addonId);
			return addon && remainingModules.has(addon.moduleId);
		}));
		setStatus(`ماژول «${moduleTitle(moduleId)}» از ترکیبت حذف شد.`);
		setSaved(false);
	}

	function addSelectedModule(moduleId: ModuleId) {
		const result = addModule(selectedIds, moduleId);
		setSelectedIds(result.selected);
		const prerequisiteNames = result.added.filter(id => id !== moduleId).map(moduleTitle);
		setStatus(prerequisiteNames.length
			? `برای ${moduleTitle(moduleId)}، پیش‌نیازش هم اضافه شد: ${prerequisiteNames.join('، ')}.`
			: `ماژول «${moduleTitle(moduleId)}» به ترکیبت اضافه شد.`);
		setSaved(false);
	}

	function toggleAddon(addonId: PricingAddonId) {
		const addon = pricingAddons.find(item => item.id === addonId);
		if (!addon || !selectedIds.includes(addon.moduleId)) return;
		setSelectedAddonIds(current => current.includes(addonId) ? current.filter(id => id !== addonId) : [...current, addonId]);
		setStatus(selectedAddonIds.includes(addonId) ? `افزونهٔ «${addon.title}» حذف شد.` : `افزونهٔ «${addon.title}» به ترکیبت اضافه شد.`);
		setSaved(false);
	}

	function clearSelection() {
		setSelectedIds([]);
		setSelectedAddonIds([]);
		setStatus('انتخاب پاک شد؛ حالا فقط موارد موردنیازت را روشن کن.');
		setSaved(false);
	}

	function saveSelection() {
		try {
			window.localStorage.setItem(storageKey, JSON.stringify({ moduleIds: selectedIds, addonIds: selectedAddonIds } satisfies SavedSelection));
			setSaved(true);
			setStatus('ترکیب انتخابی در همین مرورگر ذخیره شد و با بازگشت به صفحه باقی می‌ماند.');
		} catch {
			setSaved(false);
			setStatus('ذخیرهٔ انتخاب در این مرورگر در دسترس نیست؛ انتخاب‌های فعلی همچنان روی صفحه فعال‌اند.');
		}
	}

	function requestPurchase() {
		if (!selectedIds.length || !prices || pricesLoading) return;
		try {
			window.localStorage.setItem(storageKey, JSON.stringify({ moduleIds: selectedIds, addonIds: selectedAddonIds } satisfies SavedSelection));
		} catch { /* The request can continue with the current selection. */ }
		onRequestPurchase(selectedIds, '', selectedAddonIds, checkoutEnabled ? 'purchase' : 'request');
	}

	return <main className="module-pricing-page" dir="rtl" aria-labelledby="module-pricing-title">
		<SiteHeader variant="paper" onReturnToModules={onReturnToModules} />

		<div className="module-pricing-inner">
			<nav className="pricing-breadcrumb" aria-label="مسیر صفحه">
				<button type="button" onClick={onReturnToModules}>همه‌ی ماژول‌ها</button><span aria-hidden="true">/</span><span aria-current="page">تعرفه و انتخاب ماژول</span>
			</nav>
			<section className="pricing-page-intro">
				<div><p className="pricing-eyebrow"><span aria-hidden="true" />تعرفهٔ آسومی · انتخاب آزاد ماژول‌ها</p>
					<h1 id="module-pricing-title" ref={heading} tabIndex={-1}>فقط چیزهایی را بگیر<br /><span>که برای کارت لازم داری.</span></h1>
					<p>ماژول‌ها و افزونه‌های هر بخش را جداگانه انتخاب کن. تعداد کاربرها و شرکت‌ها روی هزینه تأثیر ندارد؛ قیمت ترکیب همان لحظه محاسبه می‌شود.</p>
				</div>
				{prices && <div className="pricing-page-stamp"><span>{formatToman(prices.packages.complete)}</span><small>برای تمام ماژول‌ها<br />و افزونهٔ مدیریت منو · ماهانه</small></div>}
			</section>

			{pricesLoading && <section className="pricing-load-state" role="status">در حال دریافت تعرفهٔ به‌روز آسومی…</section>}
			{!pricesLoading && pricesError && <section className="pricing-load-state pricing-load-error" role="alert">
				<p>{pricesError}</p><button type="button" onClick={() => setPricingAttempt(attempt => attempt + 1)}>تلاش دوباره</button>
			</section>}
			{prices && <>
				<PricingPresets prices={prices} selectedPresetId={selectedPresetId} onSelect={selectPreset} />
				<section className="pricing-workspace" aria-label="انتخاب ماژول‌ها و افزونه‌ها">
					<ModuleChooser
						selectedIds={selectedIds} selectedAddonIds={selectedAddonIds} prices={prices} status={status} activeId={activeId}
						checkoutEnabled={checkoutEnabled} checkoutStatusLoaded={checkoutStatusLoaded}
						onActivate={setActiveId} onToggle={toggleModule} onClearAddons={clearSelection} onSave={saveSelection} onRequestPurchase={requestPurchase} saved={saved}
					/>
					<SelectedModuleDetail module={activeModule} selected={selectedIds.includes(activeModule.id)} selectedAddonIds={selectedAddonIds} prices={prices} onToggleAddon={toggleAddon} onOpenModule={onOpenModule} />
				</section>
			</>}
			<section className="pricing-account-addons" aria-labelledby="pricing-account-addons-title">
				<div className="pricing-section-heading">
					<div><p>حسابیار · قابل تنظیم برای هر سایت</p><h2 id="pricing-account-addons-title">افزونه‌های هوش مصنوعی و چت</h2></div>
					<span>مستقل از ماژول‌ها · اعتبار یک‌ماهه</span>
				</div>
				{accountAddonsLoading && <p className="pricing-addon-state" role="status">در حال دریافت وضعیت فروش افزونه‌ها…</p>}
				{accountAddonsError && <p className="pricing-addon-state pricing-addon-state-error" role="status">{accountAddonsError}</p>}
				{!accountAddonsLoading && accountAddons.length > 0 && <div className="pricing-account-addon-grid">
					{accountAddons.map(addon => <article className="pricing-account-addon-card" key={addon.id}>
						<div><p className="pricing-account-addon-kicker">افزونهٔ مستقل حسابیار</p><h3>{addon.title}</h3></div>
						<p className="pricing-account-addon-price">{addon.status === 'Free' ? 'رایگان' : `${formatToman(addon.monthly_price_toman)} در ماه`}</p>
						<p className="pricing-account-addon-description">{addon.id === 'assistant_ai' ? 'دستیار هوش مصنوعی برای گفتگو و انجام کارهای مجاز در حسابیار.' : 'گفتگوی سازمانی و همکاری تیمی داخل حسابیار.'}</p>
						{addon.status === 'Free'
							? <p className="pricing-account-addon-note" role="status">این افزونه برای سایت‌های واجد شرایط رایگان و فعال است.</p>
							: checkoutEnabled
								? <button type="button" className="pricing-account-addon-button" onClick={() => onPurchaseAddon(addon.id)}>{isAuthenticated ? `خرید ${addon.title} برای یک ماه` : `ورود و خرید ${addon.title}`}</button>
								: <p className="pricing-account-addon-note">پس از فعال‌سازی پرداخت آنلاین آسومی، خرید یک‌ماهه در همین صفحه انجام می‌شود.</p>}
					</article>)}
				</div>}
			</section>

			<aside className="pricing-terms-note"><span aria-hidden="true">i</span><p>{pricingNotice}{prices && <> بستهٔ حرفه‌ای ماهانه {formatToman(prices.packages.professional)}، همهٔ ماژول‌ها بدون افزونهٔ منو {formatToman(prices.packages.completeWithoutMenu)} و با مدیریت منو {formatToman(prices.packages.complete)} است.</>}{checkoutEnabled ? ' پرداخت یک‌ماهه با زرین‌پال انجام می‌شود؛ پس از بررسی، مدیر آسومی افزونه را برای یک ماه فعال می‌کند و تمدید دستی است.' : ' پرداخت آنلاین هنوز فعال نیست؛ برای ماژول‌ها و افزونه‌های پولی فقط درخواست بررسی ثبت می‌شود.'}</p></aside>
		</div>
		<SiteFooter />
	</main>;
}

function moduleTitle(moduleId: ModuleId) {
	return productModules.find(module => module.id === moduleId)?.shortTitle || moduleId;
}
