import { AsumiHero } from './components/organisms/AsumiHero';

export function AsumiApp() {
	return (
		<main className="asumi-app">
			<AsumiHero />
			<section className="build-preview" id="what-we-build">
				<div className="build-preview__eyebrow">WHAT WE BUILD</div>
				<h2>آنچه می سازیم</h2>
				<p>راهکارهای دیجیتال برای ساختن فردایی روشن تر</p>
				<div className="build-preview__grid" aria-label="خدمات آسومی">
					{['سایت سفارشی', 'سیستم جامع ERP', 'مدیریت منابع انسانی', 'مدیریت رستوران'].map((title, index) => (
						<article className="build-preview__card" key={title}>
							<span>0{index + 1}</span><h3>{title}</h3>
						</article>
					))}
				</div>
			</section>
		</main>
	);
}
