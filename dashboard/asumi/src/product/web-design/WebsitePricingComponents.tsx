import { monthlyServices, websiteAddons, websiteTiers, type MonthlyService, type WebsiteAddon, type WebsiteTier } from './catalog';
import { formatToman } from './estimator';

function dependencyNames(codes: string[]) {
	return codes.map(code => websiteAddons.find(item => item.code === code)?.name || code).join('، ');
}

function displayAddonPrice(item: WebsiteAddon) {
	if (item.billing === 'market') return 'با نرخ روز';
	if (item.billing === 'range') return `${formatToman(item.price || 0)} تا ${formatToman(item.priceMax || item.price || 0)}`;
	return item.price === null ? 'استعلام قیمت' : formatToman(item.price);
}

export function TierCard({ tier, index, selected, onSelect }: { tier: WebsiteTier; index: number; selected: boolean; onSelect: () => void }) {
	return <button className="web-design-tier-card" type="button" data-selected={selected} aria-pressed={selected} onClick={onSelect}>
		<span className="web-design-tier-topline"><span>{tier.position}</span><span className="web-design-tier-mark" aria-hidden="true">{selected ? '✓' : String(index + 1).padStart(2, '0')}</span></span>
		<span className="web-design-tier-name">بسته‌ی {tier.name}</span>
		<span className="web-design-tier-fit">{tier.fit}</span>
		<span className="web-design-tier-price"><strong>{formatToman(tier.price)}</strong><small>هزینه‌ی پایه · یک‌باره</small></span>
		<span className="web-design-tier-specs"><span>{tier.pages}</span><span>{tier.forms}</span><span>{tier.revisions}</span><span>{tier.support}</span><span>{tier.delivery}</span></span>
		<span className="web-design-tier-design">{tier.design}</span>
		<span className="web-design-tier-features">{tier.features.map(feature => <span key={feature}>{feature}</span>)}</span>
	</button>;
}

export function AddonCard({ item, tier, selectedCount, selectedAddonIds, onToggle, onCount }: {
	item: WebsiteAddon;
	tier: WebsiteTier;
	selectedCount: number;
	selectedAddonIds: Set<string>;
	onToggle: () => void;
	onCount: (delta: number) => void;
}) {
	const selected = selectedCount > 0;
	const availableForTier = item.availableTiers.includes(tier.id);
	const needs = item.requires?.filter(code => !selectedAddonIds.has(code)) || [];
	return <article className="web-design-addon-card" data-selected={selected} data-blocked={Boolean(item.blockedReason)}>
		<div className="web-design-addon-meta"><span>{item.code}</span><span>{item.category}</span></div>
		<h3>{item.name}</h3>
		<p>{item.description}</p>
		<div className="web-design-addon-price"><strong>{displayAddonPrice(item)}</strong><small>{item.billing === 'market' ? 'هزینه‌ی سرویس‌دهنده جداست' : item.billing === 'range' ? 'برآورد وابسته به سطح اجرا' : `${item.unit} · یک‌باره`}</small></div>
		{item.blockedReason
			? <p className="web-design-addon-prereq web-design-addon-prereq--blocked">{item.blockedReason}</p>
			: !availableForTier
				? <p className="web-design-addon-prereq">فقط در بسته‌ی {item.availableTiers.map(id => websiteTiers.find(candidate => candidate.id === id)?.name).join(' و ')} ارائه می‌شود.</p>
				: needs.length > 0 && <p className="web-design-addon-prereq">با انتخاب، پیش‌نیاز {dependencyNames(needs)} هم افزوده می‌شود.</p>}
		<div className="web-design-addon-actions">
			<button type="button" className="web-design-addon-toggle" aria-pressed={selected} disabled={Boolean(item.blockedReason)} onClick={onToggle}>
				{item.blockedReason ? 'نیازمند بازبینی' : selected ? 'افزوده شد · حذف' : availableForTier ? 'افزودن به برآورد' : `انتخاب بسته‌ی ${websiteTiers.find(candidate => item.availableTiers.includes(candidate.id))?.name || 'مناسب'}`}
			</button>
			{selected && item.quantity && <QuantityControl label={`تعداد ${item.name}`} count={selectedCount} onChange={onCount} />}
		</div>
	</article>;
}

export function RecurringCard({ item, selectedCount, selectedAddonIds, selectedRecurringIds, onToggle, onCount, onAddAddon, onChooseService }: {
	item: MonthlyService;
	selectedCount: number;
	selectedAddonIds: Set<string>;
	selectedRecurringIds: Set<string>;
	onToggle: () => void;
	onCount: (delta: number) => void;
	onAddAddon: (code: string) => void;
	onChooseService: (code: string) => void;
}) {
	const selected = selectedCount > 0;
	const waitingForBot = item.requiresAny?.length && !item.requiresAny.some(code => selectedAddonIds.has(code));
	const waitingForSeoPlan = item.code === 'A57' && !['M01', 'M02', 'M03', 'M04'].some(code => selectedRecurringIds.has(code));
	const includedInSeoBundle = item.code === 'A57' && (selectedRecurringIds.has('M02') || selectedRecurringIds.has('M04'));
	const locked = Boolean(item.blockedReason);
	return <article className="web-design-monthly-card" data-selected={selected} data-blocked={locked}>
		<div className="web-design-addon-meta"><span>{item.code}</span><span>ماهانه</span></div>
		<h3>{item.name}</h3>
		<p>{item.description}</p>
		<div className="web-design-addon-price"><strong>{formatToman(item.price)}</strong><small>{item.unit || 'در ماه'}</small></div>
		{locked && <p className="web-design-addon-prereq web-design-addon-prereq--blocked">{item.blockedReason}</p>}
		{waitingForSeoPlan && <div className="web-design-prereq-actions"><span>این بسته به یکی از پلن‌های SEO نیاز دارد:</span>
			{monthlyServices.filter(service => service.code === 'M01' || service.code === 'M03').map(service => <button type="button" key={service.code} onClick={() => onChooseService(service.code)}>{service.name} · {formatToman(service.price)} در ماه</button>)}
		</div>}
		{includedInSeoBundle && <p className="web-design-addon-prereq">محتوای ۱۰ مقاله در بسته‌ی SEO انتخاب‌شده لحاظ شده؛ مبلغ دوباره محاسبه نمی‌شود.</p>}
		{waitingForBot && <div className="web-design-prereq-actions"><span>برای فعال‌سازی، یکی از این ربات‌ها را انتخاب کن:</span>
			{item.requiresAny?.map(code => {
				const bot = websiteAddons.find(candidate => candidate.code === code);
				return bot ? <button type="button" key={code} onClick={() => onAddAddon(code)}>{bot.name} · {formatToman(bot.price || 0)}</button> : null;
			})}
		</div>}
		{item.requires?.some(code => !selectedAddonIds.has(code)) && !locked && <p className="web-design-addon-prereq">با انتخاب، {dependencyNames(item.requires!.filter(code => !selectedAddonIds.has(code)))} هم اضافه می‌شود.</p>}
		<div className="web-design-addon-actions">
			<button type="button" className="web-design-addon-toggle" aria-pressed={selected} disabled={locked} onClick={onToggle}>{locked ? 'نیازمند اصلاح پیش‌نیاز' : selected ? 'در برآورد است · حذف' : 'افزودن ماهانه'}</button>
			{selected && item.quantity && <QuantityControl label={`تعداد ${item.name}`} count={selectedCount} onChange={onCount} />}
		</div>
	</article>;
}

export function QuantityControl({ label, count, onChange }: { label: string; count: number; onChange: (delta: number) => void }) {
	return <div className="web-design-quantity" aria-label={label}>
		<button type="button" aria-label={`کم‌کردن ${label}`} onClick={() => onChange(-1)}>−</button>
		<output aria-live="polite">{new Intl.NumberFormat('fa-IR').format(count)}</output>
		<button type="button" aria-label={`زیادکردن ${label}`} onClick={() => onChange(1)}>+</button>
	</div>;
}

export function EstimateLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
	return <div className={`web-design-estimate-line${strong ? ' web-design-estimate-line--strong' : ''}`}><span>{label}</span><strong>{value}</strong></div>;
}
