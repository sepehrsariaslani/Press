import { ModuleMark } from '../ModuleMark';
import { productModules } from '../modules';
import { moduleAddonPrices, type PricingTier } from './catalog';
import { formatToman } from './PricingTierCards';
import type { ModuleId } from './selection';

type ModuleChooserProps = {
	tier: PricingTier;
	selectedIds: readonly ModuleId[];
	total: number;
	status: string;
	activeId: ModuleId;
	onActivate: (id: ModuleId) => void;
	onToggle: (id: ModuleId) => void;
	onClearAddons: () => void;
	onSave: () => void;
	onRequestPurchase: () => void;
	saved: boolean;
};

export function ModuleChooser({ tier, selectedIds, total, status, activeId, onActivate, onToggle, onClearAddons, onSave, onRequestPurchase, saved }: ModuleChooserProps) {
	const selectedCount = selectedIds.length;
	return <aside className="pricing-module-selector" aria-labelledby="pricing-module-list-title">
		<div className="pricing-selector-heading">
			<div><p>پیکربندی انتخاب تو</p><h2 id="pricing-module-list-title">ماژول‌ها</h2></div>
			<button type="button" onClick={onClearAddons} disabled={!selectedIds.some(id => !tier.includedModuleIds.includes(id))}>حذف افزونه‌ها</button>
		</div>
		<p className="pricing-selector-hint">هر ماژول را انتخاب کن تا امکاناتش را ببینی. موارد داخل بسته از قبل فعال‌اند.</p>
		<div className="pricing-module-list" role="group" aria-label="انتخاب ماژول‌های آسومی">
			{productModules.map((module, index) => {
				const selected = selectedIds.includes(module.id);
				const included = tier.includedModuleIds.includes(module.id);
				return <div className="pricing-module-option" key={module.id} data-selected={selected} data-active={activeId === module.id}>
					<button className="pricing-module-open" type="button" onClick={() => onActivate(module.id)} aria-current={activeId === module.id ? 'true' : undefined}>
						<span className="pricing-module-index">{String(index + 1).replace(/\d/g, n => '۰۱۲۳۴۵۶۷۸۹'[+n])}</span>
						<span className="pricing-module-icon"><ModuleMark icon={module.icon} /></span>
						<span className="pricing-module-name">{module.shortTitle}</span>
					</button>
					{included ? <span className="pricing-included-tag" title={`شامل بسته‌ی ${tier.title}`}>در بسته</span> : <button
						className="pricing-module-toggle"
						type="button"
						aria-pressed={selected}
						aria-label={`${selected ? 'حذف' : 'افزودن'} ماژول ${module.title}`}
						onClick={() => onToggle(module.id)}
					>
						{selected ? <><span className="pricing-toggle-check" aria-hidden="true">✓</span><span>{formatToman(moduleAddonPrices[module.id])}</span></> : <><span aria-hidden="true">+</span><span>{formatToman(moduleAddonPrices[module.id])}</span></>}
					</button>}
				</div>;
			})}
		</div>
		<div className="pricing-selection-status" role="status" aria-live="polite">{status || `${selectedCount} ماژول انتخاب شده`}</div>
		<div className="pricing-estimate" aria-live="polite">
		<div className="pricing-estimate-line"><span>بسته‌ی {tier.title}</span><strong>{formatToman(tier.monthlyPrice)}</strong></div>
			<div className="pricing-estimate-line"><span>افزونه‌ها</span><strong>{formatToman(total - tier.monthlyPrice)}</strong></div>
			<div className="pricing-selected-modules" aria-label="ماژول‌های فعال">{selectedIds.map(id => productModules.find(module => module.id === id)?.shortTitle).filter(Boolean).join(' · ')}</div>
			<div className="pricing-estimate-total"><span>جمع ماهانه‌ی پیشنهادی</span><strong>{formatToman(total)}</strong></div>
			<p>{selectedCount} ماژول · تا {String(tier.userLimit).replace(/\d/g, n => '۰۱۲۳۴۵۶۷۸۹'[+n])} کاربر</p>
			<button className="pricing-save-button" type="button" onClick={onSave}>{saved ? 'ترکیب ذخیره شد ✓' : 'ذخیره‌ی ترکیب انتخابی'}</button>
			<button className="pricing-request-button" type="button" onClick={onRequestPurchase}>درخواست بررسی و خرید این ترکیب</button>
		</div>
	</aside>;
}
