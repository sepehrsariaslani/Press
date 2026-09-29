import { ModuleMark } from '../ModuleMark';
import { productModules } from '../modules';
import { moduleAddonPrices, pricingAddons, type PricingAddonId } from './catalog';
import { estimateSelection } from './estimate';
import { formatToman } from './PricingPresets';
import type { ModuleId } from './selection';

type ModuleChooserProps = {
	selectedIds: readonly ModuleId[];
	selectedAddonIds: readonly PricingAddonId[];
	status: string;
	activeId: ModuleId;
	onActivate: (id: ModuleId) => void;
	onToggle: (id: ModuleId) => void;
	onClearAddons: () => void;
	onSave: () => void;
	onRequestPurchase: () => void;
	saved: boolean;
};

export function ModuleChooser({ selectedIds, selectedAddonIds, status, activeId, onActivate, onToggle, onClearAddons, onSave, onRequestPurchase, saved }: ModuleChooserProps) {
	const estimate = estimateSelection(selectedIds, selectedAddonIds);
	return <aside className="pricing-module-selector" aria-labelledby="pricing-module-list-title">
		<div className="pricing-selector-heading">
			<div><p>پیکربندی انتخاب تو</p><h2 id="pricing-module-list-title">ماژول‌ها</h2></div>
			<button type="button" onClick={onClearAddons} disabled={!selectedIds.length && !selectedAddonIds.length}>پاک‌کردن انتخاب</button>
		</div>
		<p className="pricing-selector-hint">هر ماژول را که لازم داری روشن کن؛ قیمت ماهانه کنار همان ماژول آمده است.</p>
		<div className="pricing-module-list" role="group" aria-label="انتخاب ماژول‌های آسومی">
			{productModules.map((module, index) => {
				const selected = selectedIds.includes(module.id);
				return <div className="pricing-module-option" key={module.id} data-selected={selected} data-active={activeId === module.id}>
					<button className="pricing-module-open" type="button" onClick={() => onActivate(module.id)} aria-current={activeId === module.id ? 'true' : undefined}>
						<span className="pricing-module-index">{String(index + 1).replace(/\d/g, n => '۰۱۲۳۴۵۶۷۸۹'[+n])}</span>
						<span className="pricing-module-icon"><ModuleMark icon={module.icon} /></span>
						<span className="pricing-module-name">{module.shortTitle}</span>
					</button>
					<button
						className="pricing-module-toggle"
						type="button"
						aria-pressed={selected}
						aria-label={`${selected ? 'حذف' : 'افزودن'} ماژول ${module.title} با قیمت ${formatToman(moduleAddonPrices[module.id])} در ماه`}
						onClick={() => onToggle(module.id)}
					>
						{selected ? <><span className="pricing-toggle-check" aria-hidden="true">✓</span><span>{formatToman(moduleAddonPrices[module.id])}</span></> : <><span aria-hidden="true">+</span><span>{formatToman(moduleAddonPrices[module.id])}</span></>}
					</button>
				</div>;
			})}
		</div>
		<div className="pricing-selection-status" role="status" aria-live="polite">{status || `${selectedIds.length} ماژول انتخاب شده`}</div>
		<div className="pricing-estimate" aria-live="polite">
			<div className="pricing-estimate-line"><span>ماژول‌ها با قیمت مستقل</span><strong>{formatToman(estimate.moduleTotal)}</strong></div>
			<div className="pricing-estimate-line"><span>افزونه‌ها</span><strong>{formatToman(estimate.addonTotal)}</strong></div>
			<div className="pricing-selected-modules" aria-label="موارد انتخاب‌شده">{[
				...selectedIds.map(id => productModules.find(module => module.id === id)?.shortTitle).filter(Boolean),
				...selectedAddonIds.map(id => pricingAddons.find(addon => addon.id === id)?.title || id),
			].join(' · ')}</div>
			{estimate.bundleDiscount > 0 && <div className="pricing-estimate-line pricing-estimate-discount"><span>تخفیف بستهٔ کامل</span><strong>−{formatToman(estimate.bundleDiscount)}</strong></div>}
			<div className="pricing-estimate-total"><span>جمع تعرفهٔ ماهانه</span><strong>{formatToman(estimate.total)}</strong></div>
			<p>{selectedIds.length} ماژول · بدون محدودیت تعداد کاربر و شرکت</p>
			<button className="pricing-save-button" type="button" onClick={onSave}>{saved ? 'ترکیب ذخیره شد ✓' : 'ذخیره‌ی ترکیب انتخابی'}</button>
			<button className="pricing-request-button" type="button" onClick={onRequestPurchase} disabled={!selectedIds.length}>ادامه برای درخواست این ترکیب</button>
		</div>
	</aside>;
}
