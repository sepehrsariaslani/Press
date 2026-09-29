import { pricingPresets, type PricingPreset } from './catalog';
import { productModules } from '../modules';
import { estimateSelection } from './estimate';

export function formatToman(amount: number) {
	return `${new Intl.NumberFormat('fa-IR').format(amount)} تومان`;
}

type PricingPresetsProps = {
	selectedPresetId: PricingPreset['id'] | null;
	onSelect: (preset: PricingPreset) => void;
};

function monthlyEstimate(preset: PricingPreset) {
	return estimateSelection(preset.moduleIds, preset.addonIds).total;
}

export function PricingPresets({ selectedPresetId, onSelect }: PricingPresetsProps) {
	return <section className="pricing-preset-section" aria-labelledby="pricing-presets-title">
		<div className="pricing-section-heading">
			<div><p>ترکیب‌های پیشنهادی · قابل ویرایش</p><h2 id="pricing-presets-title">از یک انتخاب آماده شروع کن</h2></div>
			<span>یا هر ماژول را جداگانه انتخاب کن</span>
		</div>
		<div className="pricing-preset-grid" role="group" aria-label="ترکیب‌های پیشنهادی ماژول‌ها">
			{pricingPresets.map(preset => <button
				key={preset.id}
				type="button"
				className="pricing-preset-card"
				data-selected={selectedPresetId === preset.id}
				aria-pressed={selectedPresetId === preset.id}
				onClick={() => onSelect(preset)}
			>
				<span className="pricing-preset-topline">
					<span>{preset.badge || preset.description}</span>
					<span className="pricing-preset-mark" aria-hidden="true">{selectedPresetId === preset.id ? '✓' : '+'}</span>
				</span>
				<strong className="pricing-preset-name">{preset.title}</strong>
				<span className="pricing-preset-price"><b>{formatToman(monthlyEstimate(preset))}</b><small> / ماه</small></span>
				<span className="pricing-preset-modules">{preset.moduleIds.map(id => productModules.find(module => module.id === id)?.shortTitle).filter(Boolean).join(' · ')}{preset.addonIds.length ? ' · مدیریت منو' : ''}</span>
			</button>)}
		</div>
	</section>;
}
