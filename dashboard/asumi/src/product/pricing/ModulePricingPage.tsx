import { useEffect, useRef, useState } from 'react';
import { SiteFooter } from '../../components/site/SiteFooter';
import { SiteHeader } from '../../components/site/SiteHeader';
import { productModules } from '../modules';
import { ModuleChooser } from './ModuleChooser';
import { PricingTierCards } from './PricingTierCards';
import { SelectedModuleDetail } from './SelectedModuleDetail';
import { moduleAddonPrices, pricingNotice, pricingTiers, type PricingTier } from './catalog';
import { addModule, removeModule, validSavedModules, type ModuleId } from './selection';
import './module-pricing.css';

const storageKey = 'asumi-pricing-selection-v1';

type SavedSelection = { tierId: PricingTier['id']; moduleIds: ModuleId[] };

function findTier(tierId: unknown) {
	return pricingTiers.find(tier => tier.id === tierId) || pricingTiers[0];
}

function initialSelection() {
	const fallback = pricingTiers[0];
	try {
		const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null') as Partial<SavedSelection> | null;
		const tier = findTier(saved?.tierId);
		let moduleIds = [...tier.includedModuleIds];
		for (const id of validSavedModules(saved?.moduleIds)) moduleIds = addModule(moduleIds, id).selected;
		return { tier, moduleIds };
	} catch {
		return { tier: fallback, moduleIds: [...fallback.includedModuleIds] };
	}
}

function getEstimate(tier: PricingTier, moduleIds: readonly ModuleId[]) {
	return tier.monthlyPrice + moduleIds.reduce((sum, id) =>
		tier.includedModuleIds.includes(id) ? sum : sum + moduleAddonPrices[id], 0);
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
	const [tier, setTier] = useState(initial.tier);
	const [selectedIds, setSelectedIds] = useState<ModuleId[]>(initial.moduleIds);
	const [activeId, setActiveId] = useState<ModuleId>(initial.moduleIds[0] || 'finance');
	const [status, setStatus] = useState('');
	const [saved, setSaved] = useState(false);
	const activeModule = productModules.find(module => module.id === activeId) || productModules[0];
	const total = getEstimate(tier, selectedIds);

	useEffect(() => heading.current?.focus({ preventScroll: true }), []);

	function changeTier(nextTier: PricingTier) {
		const previousAddons = selectedIds.filter(id => !tier.includedModuleIds.includes(id));
		let nextIds = [...nextTier.includedModuleIds];
		for (const id of previousAddons) nextIds = addModule(nextIds, id).selected;
		setTier(nextTier);
		setSelectedIds(nextIds);
		if (!nextIds.includes(activeId)) setActiveId(nextIds[0] || 'finance');
		setStatus(`بسته‌ی ${nextTier.title} انتخاب شد؛ افزونه‌های قبلی‌ات حفظ شدند.`);
		setSaved(false);
	}

	function toggleModule(moduleId: ModuleId) {
		setActiveId(moduleId);
		if (tier.includedModuleIds.includes(moduleId)) {
			setStatus(`«${moduleTitle(moduleId)}» از قبل در بسته‌ی ${tier.title} قرار دارد.`);
			return;
		}
		if (selectedIds.includes(moduleId)) return removeSelectedModule(moduleId);
		addSelectedModule(moduleId);
	}

	function removeSelectedModule(moduleId: ModuleId) {
		const result = removeModule(selectedIds, moduleId);
		if (result.blockedBy.length) {
			setStatus(`برای حذف ${moduleTitle(moduleId)}، ابتدا این وابسته‌ها را حذف کن: ${result.blockedBy.map(moduleTitle).join('، ')}.`);
			return;
		}
		setSelectedIds(result.selected);
		setStatus(`افزونه‌ی «${moduleTitle(moduleId)}» از انتخابت حذف شد.`);
		setSaved(false);
	}

	function addSelectedModule(moduleId: ModuleId) {
		const result = addModule(selectedIds, moduleId);
		setSelectedIds(result.selected);
		const newlyAdded = result.added.filter(id => !tier.includedModuleIds.includes(id));
		const prerequisiteNames = newlyAdded.filter(id => id !== moduleId).map(moduleTitle);
		setStatus(prerequisiteNames.length
			? `برای ${moduleTitle(moduleId)}، پیش‌نیازش هم اضافه شد: ${prerequisiteNames.join('، ')}.`
			: `افزونه‌ی «${moduleTitle(moduleId)}» به ترکیبت اضافه شد.`);
		setSaved(false);
	}

	function clearAddons() {
		setSelectedIds([...tier.includedModuleIds]);
		setActiveId(tier.includedModuleIds[0] || 'finance');
		setStatus('افزونه‌ها حذف شدند؛ ماژول‌های اصلی بسته سر جایشان ماندند.');
		setSaved(false);
	}

	function saveSelection() {
		try {
			window.localStorage.setItem(storageKey, JSON.stringify({ tierId: tier.id, moduleIds: selectedIds } satisfies SavedSelection));
			setSaved(true);
			setStatus('ترکیب انتخابی در همین مرورگر ذخیره شد و با بازگشت به صفحه باقی می‌ماند.');
		} catch {
			setSaved(false);
			setStatus('ذخیره‌ی انتخاب در این مرورگر در دسترس نیست؛ انتخاب‌های فعلی همچنان روی صفحه فعال‌اند.');
		}
	}

	function requestPurchase() {
		try {
			window.localStorage.setItem(storageKey, JSON.stringify({ tierId: tier.id, moduleIds: selectedIds } satisfies SavedSelection));
		} catch { /* The request can still continue with the current selection. */ }
		const moduleNames = selectedIds.map(moduleTitle).join('، ');
		onRequestPurchase(selectedIds, `بستهٔ انتخابی: ${tier.title}\nماژول‌ها: ${moduleNames}\nبرآورد صفحهٔ تعرفه: ${new Intl.NumberFormat('fa-IR').format(total)} تومان در ماه\nاین مبلغ برآورد پیشنهادی است؛ مبلغ و شرایط پرداخت پس از بررسی درخواست اعلام می‌شود.`);
	}

	return <main className="module-pricing-page" dir="rtl" aria-labelledby="module-pricing-title">
		<SiteHeader variant="paper" onReturnToModules={onReturnToModules} />

		<div className="module-pricing-inner">
			<nav className="pricing-breadcrumb" aria-label="مسیر صفحه">
				<button type="button" onClick={onReturnToModules}>همه‌ی ماژول‌ها</button><span aria-hidden="true">/</span><span aria-current="page">تعرفه و انتخاب ماژول</span>
			</nav>
			<section className="pricing-page-intro">
				<div><p className="pricing-eyebrow"><span aria-hidden="true" />تعرفه‌ی آسومی · پیکربندی زنده</p>
					<h1 id="module-pricing-title" ref={heading} tabIndex={-1}>سیستمی را انتخاب کن<br /><span>که اندازه‌ی کار توست.</span></h1>
					<p>یک بسته را انتخاب کن، ماژول‌های دلخواهت را اضافه کن و اثر هر انتخاب را روی برآورد ماهانه ببین. پیش‌نیازها هم خودشان جلوی انتخاب ناقص را می‌گیرند.</p>
				</div>
			<div className="pricing-page-stamp"><span>{persianNumber(productModules.length)}</span><small>ماژول متصل<br />در یک سیستم</small></div>
			</section>

			<PricingTierCards selectedTierId={tier.id} onSelect={changeTier} />

			<section className="pricing-workspace" aria-label="انتخاب جزئیات بسته">
				<ModuleChooser
					tier={tier} selectedIds={selectedIds} total={total} status={status} activeId={activeId}
					onActivate={setActiveId} onToggle={toggleModule} onClearAddons={clearAddons} onSave={saveSelection} onRequestPurchase={requestPurchase} saved={saved}
				/>
				<SelectedModuleDetail module={activeModule} tier={tier} onOpenModule={onOpenModule} />
			</section>

			<aside className="pricing-terms-note"><span aria-hidden="true">i</span><p>{pricingNotice} برای تیم‌های بزرگ‌تر یا استقرار اختصاصی، برآورد جداگانه ارائه می‌شود. اعداد این صفحه به‌تنهایی فاکتور یا پرداخت نیستند؛ مبلغ قابل خرید بعد از بررسی و اتصال به پلن معتبر اعلام می‌شود.</p></aside>
		</div>
		<SiteFooter />
	</main>;
}

function moduleTitle(moduleId: ModuleId) {
	return productModules.find(module => module.id === moduleId)?.shortTitle || moduleId;
}
