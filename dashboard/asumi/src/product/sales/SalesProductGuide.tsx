import { productModuleDetails } from '../moduleDetails';
import { productModules } from '../modules';
import { SalesFeatureBoards } from './SalesFeatureBoards';
import { salesModuleBoundary } from './salesProductData';
import './sales-product-guide.css';

type SalesProductGuideProps = {
	onOpenModule: (moduleId: string) => void;
	onNavigateToSection: (id: string) => void;
	onReturnToModules: () => void;
};

const salesBoardJumps = [
	{ id: 'sales-board-customer-catalog', label: 'مشتری و کالا' },
	{ id: 'sales-board-sales-documents', label: 'اسناد معامله' },
	{ id: 'sales-board-fulfillment', label: 'تحویل و ارسال' },
	{ id: 'sales-board-follow-up-insight', label: 'پیگیری و گزارش' },
] as const;

export function SalesProductGuide({ onOpenModule, onNavigateToSection, onReturnToModules }: SalesProductGuideProps) {
	const details = productModuleDetails.sales;
	const relatedModules = details.relatedIds
		.map(id => productModules.find(module => module.id === id))
		.filter((module): module is (typeof productModules)[number] => Boolean(module));

	return <section className="sales-handoff" id="sales-handoff" aria-labelledby="sales-handoff-title">
		<div className="sales-guide-inner">
			<header className="sales-guide-header">
				<div className="sales-guide-heading">
					<p className="sales-guide-eyebrow">از روایت تا پرونده‌ی واقعی فروش</p>
					<h2 id="sales-handoff-title">هر کاغذ، یک سرنخ؛ هر بورد، یک قدم جلوتر.</h2>
					<p className="sales-guide-lede">امکانات فروش را روی چهار بورد ببین: پرونده‌ی مشتری و کالا، سندهای معامله، عملیات تحویل، و پیگیری و گزارش. نخ‌های قرمز نشان می‌دهند این بخش‌ها کجا به هم می‌رسند.</p>
				</div>
				<nav className="sales-guide-jump" aria-label="پرش به بوردهای فروش">
					{salesBoardJumps.map(item => <a href={`#${item.id}`} key={item.id} onClick={event => { event.preventDefault(); onNavigateToSection(item.id); }}>{item.label}<span aria-hidden="true">↓</span></a>)}
				</nav>
			</header>

			<section className="sales-guide-section sales-guide-board-section" id="sales-process" aria-labelledby="sales-process-title">
				<div className="sales-guide-section-heading">
					<p>پرونده از چهار سمت کامل می‌شود</p>
					<h3 id="sales-process-title">چهار بورد، یک مسیر پیوسته</h3>
					<span>از اطلاعات اولیه تا پاسخ‌گویی پس از فروش؛ روی هر برگ بزن تا مرکز همان کار را باز کنی.</span>
				</div>
				<SalesFeatureBoards />
			</section>

			<section className="sales-guide-section sales-connections-section" id="sales-connections" aria-labelledby="sales-connections-title">
				<div className="sales-guide-section-heading">
					<p>یک سیستم، با مرزهای روشن</p>
					<h3 id="sales-connections-title">نخ‌ها بین ماژول‌ها هم ادامه دارند</h3>
				</div>
				<p className="sales-crm-boundary"><span className="sales-boundary-pin" aria-hidden="true" /><strong>هر کدام، مسئول کار خودش</strong><span>{salesModuleBoundary}</span></p>
			</section>

			<p className="sales-handoff-note">برگ‌ها، نمودار و وضعیت‌ها نمونه‌ی نمایشی‌اند و داده‌ی زنده‌ی شرکت شما نیستند. قابلیت‌های در دسترس با ماژول‌های نصب‌شده، تنظیمات، اتصال سرویس‌ها و مجوز کاربر تغییر می‌کنند.</p>
			<footer className="sales-handoff-footer">
				<nav className="sales-related-modules" aria-label="ماژول‌های مرتبط با فروش">
					{relatedModules.map(module => <a href={`#module/${module.id}`} key={module.id} onClick={event => { event.preventDefault(); onOpenModule(module.id); }}>{module.title}<span aria-hidden="true">←</span></a>)}
				</nav>
				<a className="sales-handoff-cta" href={`/hesab${details.entryPath}`}>{details.entryLabel}<span aria-hidden="true">↗</span></a>
			</footer>
			<button className="sales-back-to-modules" type="button" onClick={onReturnToModules}>← بازگشت به همه‌ی ۱۵ ماژول</button>
		</div>
	</section>;
}
