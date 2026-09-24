import { productModules } from '../modules';
import { industryPaths } from './industryData';
import './industry-showcase.css';

function persianNumber(value: number) {
	return String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

export function IndustryShowcase({ onOpenModule, onOpenPricing }: { onOpenModule: (moduleId: string) => void; onOpenPricing: () => void }) {
	return <section className="industry-showcase" id="industries" aria-labelledby="industry-showcase-title" dir="rtl">
		<div className="industry-showcase-inner">
			<header className="industry-showcase-heading">
				<div><p className="industry-eyebrow"><span aria-hidden="true" /> مسیرهای پیشنهادی بر پایه‌ی ماژول‌های آسومی</p>
					<h2 id="industry-showcase-title">هر صنعت، <span>ترتیب کار خودش.</span></h2>
				</div>
				<p>به‌جای ادعای یک نسخه برای همه، از گردش‌کار صنعتت شروع کن و ماژول‌های موردنیاز را ببین.</p>
			</header>
			<div className="industry-path-grid">
				{industryPaths.map((industry, index) => {
					const modules = industry.moduleIds
						.map(id => productModules.find(module => module.id === id))
						.filter((module): module is (typeof productModules)[number] => Boolean(module));
					return <article className="industry-path-card" key={industry.id}>
						<div className="industry-card-topline"><span>{persianNumber(index + 1)} / {industry.label}</span><span className="industry-file-mark" aria-hidden="true" /></div>
						<h3>{industry.title}</h3>
						<p>{industry.intro}</p>
						<div className="industry-workflow" aria-label={industry.challenge}>
							<small>{industry.challenge}</small>
							<ol>{industry.workflow.map((step, stepIndex) => <li key={step}><span>{persianNumber(stepIndex + 1)}</span>{step}</li>)}</ol>
						</div>
						<div className="industry-module-list" aria-label="ماژول‌های پیشنهادی">
							{modules.map(module => <button type="button" key={module.id} onClick={() => onOpenModule(module.id)}>{module.shortTitle}<span aria-hidden="true">↗</span></button>)}
						</div>
					</article>;
				})}
			</div>
			<div className="industry-notes">
				<p><strong>صنعتت اینجا نیست؟</strong> این مسیرها ترکیب پیشنهادی از ماژول‌های فعلی‌اند؛ برای سنجش تناسب با فرآیند واقعی کسب‌وکارت، ماژول‌ها و تعرفه را مرور کن.</p>
				<button type="button" onClick={onOpenPricing}>ساخت ترکیب ماژول‌ها <span aria-hidden="true">←</span></button>
			</div>
		</div>
	</section>;
}
