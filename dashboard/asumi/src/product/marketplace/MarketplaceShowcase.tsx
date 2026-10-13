import './marketplace-showcase.css';
import { buildMarketplacePurchaseHref } from './marketplacePurchaseRoute';

export type MarketplacePrice = { currency: string; symbol: string; amount: number };
export type MarketplacePlan = {
	id: string;
	title: string;
	interval: string;
	interval_label: string;
	price_irr: number;
	price_usd: number;
	price_inr: number;
	prices: MarketplacePrice[];
	is_free: boolean;
	asumi_checkout_supported: boolean;
};
export type MarketplaceApp = {
	id: string;
	title: string;
	description: string;
	route: string;
	plans: MarketplacePlan[];
};

type MarketplaceShowcaseProps = {
	apps: MarketplaceApp[];
	canManagePrices?: boolean;
};

const formatAmount = (amount: number) => new Intl.NumberFormat('fa-IR').format(amount);

export function MarketplaceShowcase({ apps, canManagePrices = false }: MarketplaceShowcaseProps) {
	return <section className="marketplace-showcase" id="apps" aria-labelledby="marketplace-showcase-title" dir="rtl">
		<div className="marketplace-showcase-inner">
			<header className="marketplace-showcase-heading">
				<div>
					<p className="marketplace-eyebrow"><span aria-hidden="true" />اپلیکیشن‌های آسومی</p>
					<h2 id="marketplace-showcase-title">ابزارهای بیشتر،<br /><span>در همان مسیر روشن.</span></h2>
				</div>
				<div className="marketplace-showcase-intro">
					<p>تمام اپلیکیشن‌های منتشرشده و پلن‌های فعال در همین صفحه نمایش داده می‌شوند. قیمت‌ها از تعرفهٔ ثبت‌شدهٔ هر اپ خوانده می‌شوند.</p>
					<div className="marketplace-app-count"><strong>{formatAmount(apps.length)}</strong><span>اپلیکیشن در همین صفحه</span></div>
				</div>
			</header>

			{apps.length ? <div className="marketplace-app-grid">
				{apps.map((app, index) => {
					const hasCheckoutPlan = app.plans.some(plan => plan.asumi_checkout_supported);
					return <article className="marketplace-app-card" key={app.id}>
					<div className="marketplace-app-meta"><span>{String(index + 1).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])}</span><span className="marketplace-app-mark" aria-hidden="true">{app.title.slice(0, 1)}</span></div>
					<h3>{app.title}</h3>
					<p className="marketplace-app-description">{app.description || 'جزئیات این اپلیکیشن را در صفحهٔ خودش ببین.'}</p>
					<div className="marketplace-app-plans" aria-label={`پلن‌های ${app.title}`}>
						{app.plans.map(plan => <div className="marketplace-app-plan" key={plan.id}>
							<div className="marketplace-plan-heading"><strong>{plan.title}</strong><span>{plan.interval_label}</span></div>
							{plan.is_free
								? <p className="marketplace-plan-free">رایگان</p>
								: <div className="marketplace-plan-prices">{plan.prices.map(price => <p key={price.currency}><span>{price.currency}</span><strong>{price.amount === 0 ? 'رایگان' : `${formatAmount(price.amount)} ${price.symbol}`}</strong></p>)}</div>}
							{!plan.asumi_checkout_supported && <p className="marketplace-plan-checkout-note" role="note">پرداخت مستقیم آسومی فقط با ریال است؛ قیمت ریالی حداقل ۱۰٬۰۰۰ ریال لازم است.</p>}
						</div>)}
					</div>
					{hasCheckoutPlan
						? <a className="marketplace-app-details" href={buildMarketplacePurchaseHref(app)}>انتخاب سایت و ادامه خرید <span aria-hidden="true">↗</span></a>
						: <p className="marketplace-app-checkout-unavailable" role="note">فعلاً هیچ تعرفهٔ قابل خرید با پرداخت آسومی برای این اپ وجود ندارد.</p>}
					</article>;
				})}
			</div> : <div className="marketplace-app-empty"><span className="marketplace-empty-mark" aria-hidden="true">i</span><div><h3>فعلاً اپلیکیشنی با پلن فعال وجود ندارد</h3><p>وقتی یک اپ منتشر و پلنش فعال شود، در همین صفحه نمایش داده می‌شود.</p></div></div>}

			<footer className="marketplace-showcase-footer">
				<p>تعرفه و وضعیت انتشار از اطلاعات ثبت‌شده در مارکت‌پلیس می‌آید.</p>
				{canManagePrices && <a href="/dashboard/seller/apps">مدیریت اپ‌ها و قیمت‌ها <span aria-hidden="true">↗</span></a>}
			</footer>
		</div>
	</section>;
}

export function readMarketplaceApps(element: HTMLElement | null): MarketplaceApp[] {
	if (!element?.textContent) return [];
	try {
		const value: unknown = JSON.parse(element.textContent);
		if (!Array.isArray(value)) return [];
		return value.filter((app): app is MarketplaceApp => Boolean(
				app && typeof app === 'object' &&
				typeof app.id === 'string' && typeof app.title === 'string' &&
				typeof app.route === 'string' && app.route.startsWith('/marketplace/apps/') &&
				Array.isArray(app.plans) && app.plans.every((plan: MarketplacePlan) => typeof plan?.asumi_checkout_supported === 'boolean'),
		));
	} catch {
		return [];
	}
}
