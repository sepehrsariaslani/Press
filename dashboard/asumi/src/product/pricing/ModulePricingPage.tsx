import { useEffect, useRef, useState } from 'react';
import { SiteFooter } from '../../components/site/SiteFooter';
import { SiteHeader } from '../../components/site/SiteHeader';
import { productModules } from '../modules';
import { ModuleChooser } from './ModuleChooser';
import { PricingPresets, formatToman } from './PricingPresets';
import { SelectedModuleDetail } from './SelectedModuleDetail';
import {
	moduleAddonPrices,
	pricingAddonPrices,
	pricingNotice,
	pricingPresets,
	type PricingAddonId,
	type PricingPreset,
} from './catalog';
import { addModule, removeModule, validSavedModules, type ModuleId } from './selection';
import './module-pricing.css';

const storageKey = 'asumi-pricing-selection-v2';
type SavedSelection = { moduleIds: ModuleId[]; addonIds: PricingAddonId[] };

function initialSelection(): SavedSelection {
	try {
		const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null') as Partial<SavedSelection> | null;
		let moduleIds: ModuleId[] = [];
		for (const id of validSavedModules(saved?.moduleIds)) moduleIds = addModule(moduleIds, id).selected;
		const addonIds = moduleIds.includes('restaurant') && saved?.addonIds?.includes('restaurantMenu') ? ['restaurantMenu' as const] : [];
		return moduleIds.length ? { moduleIds, addonIds } : { moduleIds: ['restaurant'], addonIds: [] };
	} catch {
		return { moduleIds: ['restaurant'], addonIds: [] };
	}
}

function getEstimate(moduleIds: readonly ModuleId[], addonIds: readonly PricingAddonId[]) {
	const modulesTotal = moduleIds.reduce((sum, id) => sum + moduleAddonPrices[id], 0);
	const addonsTotal = addonIds.reduce((sum, id) => sum + pricingAddonPrices[id], 0);
	return modulesTotal + addonsTotal;
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
	onOpenModule: (moduleId: string) => void;
	onReturnToModules: () => void;
	onRequestPurchase: (moduleIds: string[], context: string) => void;
};

export function ModulePricingPage({ onOpenModule, onReturnToModules, onRequestPurchase }: ModulePricingPageProps) {
	const heading = useRef<HTMLHeadingElement>(null);
	const [initial] = useState(initialSelection);
	const [selectedIds, setSelectedIds] = useState<ModuleId[]>(initial.moduleIds);
	const [selectedAddonIds, setSelectedAddonIds] = useState<PricingAddonId[]>(initial.addonIds);
	const [activeId, setActiveId] = useState<ModuleId>(initial.moduleIds[0] || 'restaurant');
	const [status, setStatus] = useState('');
	const [saved, setSaved] = useState(false);
	const activeModule = productModules.find(module => module.id === activeId) || productModules[0];
	const total = getEstimate(selectedIds, selectedAddonIds);
	const selectedPresetId = matchingPreset(selectedIds, selectedAddonIds);

	useEffect(() => heading.current?.focus({ preventScroll: true }), []);

	function selectPreset(preset: PricingPreset) {
		let moduleIds: ModuleId[] = [];
		for (const id of preset.moduleIds) moduleIds = addModule(moduleIds, id).selected;
		const addonIds = moduleIds.includes('restaurant') ? [...preset.addonIds] : [];
		setSelectedIds(moduleIds);
		setSelectedAddonIds(addonIds);
		setActiveId(moduleIds[0] || 'restaurant');
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
		if (moduleId === 'restaurant') setSelectedAddonIds([]);
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
		if (!selectedIds.includes('restaurant')) return;
		setSelectedAddonIds(current => current.includes(addonId) ? current.filter(id => id !== addonId) : [...current, addonId]);
		setStatus(selectedAddonIds.includes(addonId) ? 'افزونهٔ مدیریت منو حذف شد.' : 'افزونهٔ مدیریت منو به ترکیبت اضافه شد.');
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
		if (!selectedIds.length) return;
		try {
			window.localStorage.setItem(storageKey, JSON.stringify({ moduleIds: selectedIds, addonIds: selectedAddonIds } satisfies SavedSelection));
		} catch { /* The request can continue with the current selection. */ }
		const moduleNames = selectedIds.map(moduleTitle).join('، ');
		const addonNames = selectedAddonIds.map(id => id === 'restaurantMenu' ? 'مدیریت منو و کاتالوگ' : id).join('، ') || 'بدون افزونه';
		const amount = new Intl.NumberFormat('fa-IR').format(total);
		onRequestPurchase(selectedIds, `ماژول‌های انتخاب‌شده: ${moduleNames}\nافزونه‌ها: ${addonNames}\nتعرفهٔ ماهانه: ${amount} تومان\nتعداد کاربر و شرکت محدودیتی ندارد. مالیات، استقرار، آموزش و انتقال داده جداگانه محاسبه می‌شوند. این درخواست سفارش مالی یا فعال‌سازی خودکار نیست و برای هماهنگی راه‌اندازی بررسی می‌شود.`);
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
					<p>ماژول‌ها و افزونه‌ها را جداگانه روشن یا خاموش کن. تعداد کاربرها و شرکت‌ها روی انتخابت محدودیت نمی‌گذارد؛ جمع هزینه همان لحظه به‌روزرسانی می‌شود.</p>
				</div>
				<div className="pricing-page-stamp"><span>{formatToman(50_000_000)}</span><small>برای تمام ماژول‌ها<br />و افزونهٔ مدیریت منو</small></div>
			</section>

			<PricingPresets selectedPresetId={selectedPresetId} onSelect={selectPreset} />

			<section className="pricing-workspace" aria-label="انتخاب ماژول‌ها و افزونه‌ها">
				<ModuleChooser
					selectedIds={selectedIds} selectedAddonIds={selectedAddonIds} total={total} status={status} activeId={activeId}
					onActivate={setActiveId} onToggle={toggleModule} onClearAddons={clearSelection} onSave={saveSelection} onRequestPurchase={requestPurchase} saved={saved}
				/>
				<SelectedModuleDetail module={activeModule} selected={selectedIds.includes(activeModule.id)} selectedAddonIds={selectedAddonIds} onToggleAddon={toggleAddon} onOpenModule={onOpenModule} />
			</section>

			<aside className="pricing-terms-note"><span aria-hidden="true">i</span><p>{pricingNotice} تعرفهٔ کامل شامل ۱۵ ماژول و افزونهٔ مدیریت منو دقیقاً ۵۰٬۰۰۰٬۰۰۰ تومان در ماه است؛ در این صفحه فاکتور یا پرداختی انجام نمی‌شود.</p></aside>
		</div>
		<SiteFooter />
	</main>;
}

function moduleTitle(moduleId: ModuleId) {
	return productModules.find(module => module.id === moduleId)?.shortTitle || moduleId;
}
