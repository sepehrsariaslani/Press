import { useEffect, useRef } from 'react';
import { SiteFooter } from '../../components/site/SiteFooter';
import { SiteHeader } from '../../components/site/SiteHeader';
import { monthlyAddons, monthlyServices, pricingSourceNote, websiteAddonCategories, websiteAddons, websiteTiers } from './catalog';
import { formatToman, quoteRange } from './estimator';
import { AddonCard, EstimateLine, RecurringCard, TierCard } from './WebsitePricingComponents';
import { useWebsitePricingSelection } from './useWebsitePricingSelection';
import './web-design-pricing.css';

type WebsiteDesignPricingPageProps = { onReturnToModules: () => void };

export function WebsiteDesignPricingPage({ onReturnToModules }: WebsiteDesignPricingPageProps) {
	const titleRef = useRef<HTMLHeadingElement>(null);
	const estimateRef = useRef<HTMLElement>(null);
	const pricing = useWebsitePricingSelection();
	const {
		selectedTier, addons, recurring, category, query, status, copyText, estimate,
		selectedAddonIds, selectedRecurringIds, visibleAddons, selectedNames,
		setCategory, setQuery, changeTier, toggleAddon, changeAddonCount, toggleRecurring,
		changeRecurringCount, copyEstimate, clearSelection,
	} = pricing;

	useEffect(() => titleRef.current?.focus({ preventScroll: true }), []);

	function chooseAddonPrerequisite(code: string) {
		const addon = websiteAddons.find(item => item.code === code);
		if (addon) toggleAddon(addon);
	}

	function chooseMonthlyPlan(code: string) {
		const service = monthlyServices.find(item => item.code === code);
		if (service) toggleRecurring(service);
	}

	return <main className="web-design-pricing-page" dir="rtl" aria-labelledby="website-pricing-title">
		<SiteHeader variant="paper" onReturnToModules={onReturnToModules} description="خدمات طراحی و توسعه‌ی وب‌سایت" />
		<div className="web-design-inner">
			<nav className="web-design-breadcrumb" aria-label="مسیر صفحه">
				<button type="button" onClick={onReturnToModules}>صفحه‌ی آسومی</button><span aria-hidden="true">/</span><span aria-current="page">طراحی سایت و تعرفه‌ها</span>
			</nav>
			<section className="web-design-hero">
				<div>
					<p className="web-design-eyebrow"><span aria-hidden="true" />طراحی سایت · بسته و افزونه‌های قابل انتخاب</p>
					<h1 id="website-pricing-title" ref={titleRef} tabIndex={-1}>یک سایت متناسب با<br /><span>اندازه‌ی مسیر رشدت.</span></h1>
					<p>از بسته‌ی پایه شروع کن، قابلیت‌های موردنیازت را اضافه کن و هم‌زمان هزینه‌ی راه‌اندازی و خدمات ماهانه را ببین. پیش‌نیاز هر قابلیت هم جلوی برآورد ناقص را می‌گیرد.</p>
				</div>
				<div className="web-design-hero-mark" aria-hidden="true"><span>۰۱</span><small>از ایده<br />تا حضور آنلاین</small></div>
			</section>

			<section className="web-design-tier-section" aria-labelledby="web-design-tiers-title">
				<div className="web-design-section-heading"><div><p>گام اول</p><h2 id="web-design-tiers-title">بسته‌ی مناسب را انتخاب کن</h2></div><span>تعرفه‌ی طراحی سایت · سال ۱۴۰۵</span></div>
				<div className="web-design-tier-grid" role="group" aria-label="انتخاب بسته‌ی طراحی سایت">
					{websiteTiers.map((tier, index) => <TierCard key={tier.id} tier={tier} index={index} selected={tier.id === pricing.selectedTier.id} onSelect={() => changeTier(tier)} />)}
				</div>
			</section>

			<div className="web-design-builder">
				<section className="web-design-options" aria-labelledby="web-design-addons-title">
					<div className="web-design-section-heading"><div><p>گام دوم</p><h2 id="web-design-addons-title">قابلیت‌های اضافه</h2></div><span>{selectedAddonIds.size} انتخاب</span></div>
					<p className="web-design-section-copy">هر افزونه را فقط یک‌بار انتخاب کن؛ پیش‌نیازهای لازم در صورت امکان خودکار به ترکیب اضافه می‌شوند.</p>
					<div className="web-design-addon-controls">
						<label className="web-design-search">جست‌وجوی قابلیت
							<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="مثلاً فروشگاه، فرم یا سه‌بعدی" />
						</label>
						<label className="web-design-category-select">دسته‌بندی
							<select value={category} onChange={event => setCategory(event.target.value)}>
								{websiteAddonCategories.map(item => <option key={item}>{item}</option>)}
							</select>
						</label>
					</div>
					<div className="web-design-addon-grid">
						{visibleAddons.map(item => <AddonCard key={item.code} item={item} tier={selectedTier} selectedCount={addons[item.code] || 0} selectedAddonIds={selectedAddonIds} onToggle={() => toggleAddon(item)} onCount={delta => changeAddonCount(item, delta)} />)}
						{visibleAddons.length === 0 && <p className="web-design-empty">چیزی با این عبارت پیدا نشد؛ املای دیگری را امتحان کن.</p>}
					</div>

					<section className="web-design-recurring" aria-labelledby="web-design-monthly-title">
						<div className="web-design-section-heading"><div><p>اختیاری · بعد از راه‌اندازی</p><h2 id="web-design-monthly-title">خدمات ماهانه و رشد</h2></div><span>{selectedRecurringIds.size} انتخاب</span></div>
						<p className="web-design-section-copy">پلن‌های SEO با هم جایگزین‌اند؛ برای تداوم یا پشتیبانی، خدمات مستقل را هم می‌توانی جدا انتخاب کنی.</p>
						<div className="web-design-monthly-grid">
							{monthlyServices.map(item => <RecurringCard key={item.code} item={item} selectedCount={recurring[item.code] || 0} selectedAddonIds={selectedAddonIds} selectedRecurringIds={selectedRecurringIds} onToggle={() => toggleRecurring(item)} onCount={delta => changeRecurringCount(item, delta)} onAddAddon={chooseAddonPrerequisite} onChooseService={chooseMonthlyPlan} />)}
							{monthlyAddons.map(item => <RecurringCard key={item.code} item={item} selectedCount={recurring[item.code] || 0} selectedAddonIds={selectedAddonIds} selectedRecurringIds={selectedRecurringIds} onToggle={() => toggleRecurring(item)} onCount={delta => changeRecurringCount(item, delta)} onAddAddon={chooseAddonPrerequisite} onChooseService={chooseMonthlyPlan} />)}
						</div>
					</section>
				</section>

				<aside ref={estimateRef} className="web-design-estimate" aria-labelledby="web-design-estimate-title">
					<div className="web-design-estimate-heading"><p>برآورد زنده</p><h2 id="web-design-estimate-title">خلاصه‌ی انتخاب</h2><span>{selectedTier.name} · {selectedTier.pages}</span></div>
					<div className="web-design-estimate-lines">
						<EstimateLine label="قیمت پایه‌ی بسته" value={formatToman(selectedTier.price)} />
						<EstimateLine label="هزینه‌ی راه‌اندازی" value={quoteRange(estimate.setupMin, estimate.setupMax)} strong />
						<EstimateLine label="خدمات ماهانه" value={quoteRange(estimate.monthlyMin, estimate.monthlyMax)} />
						<EstimateLine label="جمع ماه اول" value={quoteRange(estimate.firstMonthMin, estimate.firstMonthMax)} strong />
						<EstimateLine label="برآورد سال اول" value={quoteRange(estimate.yearOneMin, estimate.yearOneMax)} />
					</div>
					<p className="web-design-estimate-footnote">سال اول با فرض ادامه‌ی همین خدمات ماهانه برای ۱۲ ماه محاسبه شده است.</p>
					<div className="web-design-selected-list"><strong>افزوده‌های انتخابی</strong>
						{selectedNames.length ? <ul>{selectedNames.map(name => <li key={name}>{name}</li>)}</ul> : <p>فعلاً فقط بسته‌ی پایه انتخاب شده.</p>}
					</div>
					{estimate.marketRateCount > 0 && <p className="web-design-market-note">هزینه‌ی VPS با نرخ روز جدا از این جمع محاسبه می‌شود.</p>}
					<div className="web-design-estimate-actions">
						<button type="button" className="web-design-copy-button" onClick={copyEstimate}>کپی خلاصه‌ی برآورد</button>
						<button type="button" className="web-design-reset-button" onClick={clearSelection}>پاک‌کردن انتخاب‌ها</button>
					</div>
					{copyText && <label className="web-design-copy-fallback">خلاصه‌ی آماده برای کپی<textarea readOnly value={copyText} onFocus={event => event.currentTarget.select()} /></label>}
					<p className="web-design-live-status" role="status" aria-live="polite">{status}</p>
				</aside>
			</div>

			<div className="web-design-mobile-summary" aria-label="خلاصه‌ی سریع برآورد">
				<span>جمع ماه اول<strong>{quoteRange(estimate.firstMonthMin, estimate.firstMonthMax)}</strong></span>
				<button type="button" onClick={() => estimateRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })}>دیدن برآورد</button>
			</div>
			<aside className="web-design-terms"><span aria-hidden="true">i</span><p>{pricingSourceNote} زمان تحویل به آماده‌بودن محتوا و تأییدهای مشتری وابسته است. مبلغ نهایی بعد از بررسی محدوده‌ی پروژه و هزینه‌های سرویس‌دهندگان تأیید می‌شود.</p></aside>
		</div>
		<SiteFooter />
	</main>;
}
