import { pricingTiers, type PricingTier, type PricingTierId } from './catalog';

export function formatToman(amount: number) {
	return `${new Intl.NumberFormat('fa-IR').format(amount)} تومان`;
}

type PricingTierCardsProps = {
	selectedTierId: PricingTierId;
	onSelect: (tier: PricingTier) => void;
};

export function PricingTierCards({ selectedTierId, onSelect }: PricingTierCardsProps) {
	return <section className="pricing-tier-section" aria-labelledby="pricing-tiers-title">
		<div className="pricing-section-heading">
			<div><p>سه سطح برای سه مسیر رشد</p><h2 id="pricing-tiers-title">از کدام بسته شروع می‌کنی؟</h2></div>
			<span>مبلغ ماهانه · به تومان</span>
		</div>
		<div className="pricing-tier-grid" role="group" aria-label="انتخاب بسته‌ی تعرفه">
			{pricingTiers.map(tier => <button
				key={tier.id}
				type="button"
				className="pricing-tier-card"
				data-selected={selectedTierId === tier.id}
				aria-pressed={selectedTierId === tier.id}
				onClick={() => onSelect(tier)}
			>
				<span className="pricing-tier-topline">
					<span>{tier.recommended ? 'پیشنهاد آسومی' : tier.fit}</span>
					<span className="pricing-tier-mark" aria-hidden="true">{selectedTierId === tier.id ? '✓' : '+'}</span>
				</span>
				<strong className="pricing-tier-name">{tier.title}</strong>
				<span className="pricing-tier-price"><b>{formatToman(tier.monthlyPrice)}</b><small> / ماه</small></span>
				<span className="pricing-tier-perks">{tier.perks.map(perk => <span key={perk}>{perk}</span>)}</span>
			</button>)}
		</div>
	</section>;
}
