import { ModuleMark } from '../ModuleMark';
import { productModuleDetails } from '../moduleDetails';
import { productModules, type ProductModule } from '../modules';
import { moduleAddonPrices, modulePrerequisites, type PricingTier } from './catalog';
import { formatToman } from './PricingTierCards';
import type { ModuleId } from './selection';

type SelectedModuleDetailProps = {
	module: ProductModule;
	tier: PricingTier;
	onOpenModule: (moduleId: string) => void;
};

function toPersianNumber(value: number) {
	return String(value).replace(/\d/g, number => '۰۱۲۳۴۵۶۷۸۹'[+number]);
}

export function SelectedModuleDetail({ module, tier, onOpenModule }: SelectedModuleDetailProps) {
	const details = productModuleDetails[module.id];
	const prerequisites = modulePrerequisiteTitles(module.id);
	const included = tier.includedModuleIds.includes(module.id);
	const linkedModules = details.relatedIds.map(id => productModules.find(item => item.id === id)).filter((item): item is ProductModule => Boolean(item));
	return <section className="pricing-module-detail" aria-labelledby="pricing-detail-title">
		<div className="pricing-detail-topline"><span>پرونده‌ی قابلیت‌ها</span><span>{included ? `شامل بسته‌ی ${tier.title}` : `افزونه · ${formatToman(moduleAddonPrices[module.id])} / ماه`}</span></div>
		<header className="pricing-detail-heading">
			<span className="pricing-detail-mark"><ModuleMark icon={module.icon} /></span>
			<div><p>ماژول آسومی</p><h2 id="pricing-detail-title">{module.title}</h2></div>
		</header>
		<p className="pricing-detail-description">{module.description}</p>

		<div className="pricing-feature-board">
			<div className="pricing-subheading"><span>۰۱</span><h3>چه کارهایی را پوشش می‌دهد؟</h3></div>
			<div className="pricing-feature-grid">
				{module.features.map((feature, index) => <article className="pricing-feature-paper" key={feature}>
					<span>{toPersianNumber(index + 1)}</span><p>{feature}</p>
				</article>)}
			</div>
		</div>

		<div className="pricing-flow-board">
			<div className="pricing-subheading"><span>۰۲</span><h3>مسیر کار در این ماژول</h3></div>
			<div className="pricing-flow-steps">{module.flow.map((step, index) => <div className="pricing-flow-step" key={step}>
				<span>{toPersianNumber(index + 1)}</span><strong>{step}</strong>
			</div>)}</div>
		</div>

		<div className="pricing-record-board">
			<div className="pricing-subheading"><span>۰۳</span><h3>اسناد و پرونده‌های مرتبط</h3></div>
			<div className="pricing-record-list">{details.records.map((record, index) => <div className="pricing-record-paper" key={record.source || record.label}>
				<span>{toPersianNumber(index + 1)}</span><strong>{record.label}</strong>{record.source && <small>{record.source}</small>}
			</div>)}</div>
		</div>

		{prerequisites.length > 0 && <aside className="pricing-prerequisite-note">
			<strong>پیش‌نیاز این ماژول</strong><span>{prerequisites.join('، ')}</span>
		</aside>}

		<nav className="pricing-related-links" aria-label="ماژول‌های مرتبط">
			<span>به این بخش‌ها هم وصل است</span>
			{linkedModules.map(related => <button key={related.id} type="button" onClick={() => onOpenModule(related.id)}>{related.shortTitle}<span aria-hidden="true">←</span></button>)}
		</nav>
	</section>;
}

function modulePrerequisiteTitles(moduleId: ModuleId) {
	const prerequisites = modulePrerequisites[moduleId];
	return prerequisites.map(id => productModules.find(module => module.id === id)?.shortTitle).filter((title): title is string => Boolean(title));
}
