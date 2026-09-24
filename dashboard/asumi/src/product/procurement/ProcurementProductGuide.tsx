import { productModuleDetails } from '../moduleDetails';
import { productModules } from '../modules';
import { ProcurementFeatureBoards } from './ProcurementFeatureBoards';
import { procurementFeatureBoards } from './storyData';

type ProcurementProductGuideProps = {
	onOpenModule: (moduleId: string) => void;
	onNavigateToSection: (id: string) => void;
	onReturnToModules: () => void;
};

export function ProcurementProductGuide({ onOpenModule, onNavigateToSection, onReturnToModules }: ProcurementProductGuideProps) {
	const details = productModuleDetails.procurement;
	const relatedModules = details.relatedIds
		.map(id => productModules.find(module => module.id === id))
		.filter((module): module is (typeof productModules)[number] => Boolean(module));

	return <section className="procurement-handoff" id="purchase-handoff" aria-labelledby="purchase-handoff-title">
		<div className="procurement-guide-inner">
			<header className="procurement-guide-header">
				<div className="procurement-guide-heading">
					<p className="procurement-guide-eyebrow">از روایت تا کار روزانه‌ی خرید</p>
					<h2 id="purchase-handoff-title">از یک نیاز تا خریدی که می‌توانی توضیحش بدهی.</h2>
					<p className="procurement-guide-lede">مسیر خرید را روی پنج بورد ببین: برنامه‌ریزی نیاز، انتخاب تأمین‌کننده، سفارش، دریافت و کنترل مالی. برگ‌ها و رشته‌ها نشان می‌دهند هر کار به کدام سند و مرحله‌ی بعد وصل است.</p>
				</div>
				<nav className="procurement-guide-jump" aria-label="پرش به بوردهای خرید">
					{procurementFeatureBoards.map(board => <a href={`#procurement-board-${board.id}`} key={board.id} onClick={event => { event.preventDefault(); onNavigateToSection(`procurement-board-${board.id}`); }}>{board.title}<span aria-hidden="true">↓</span></a>)}
				</nav>
			</header>

			<section className="procurement-guide-section" aria-labelledby="procurement-process-title">
				<div className="procurement-guide-section-heading">
					<p>پنج بورد؛ یک پرونده‌ی پیوسته</p>
					<h3 id="procurement-process-title">نیاز، پیشنهاد، سفارش و دریافت؛ کنار هم.</h3>
					<span>هر برگ را باز کن تا مستقیم به همان مرکز عملیاتی بروی. مسیر بر اساس گردش خرید طراحی شده و دسترسی‌ها با تنظیمات شرکت تعیین می‌شوند.</span>
				</div>
				<ProcurementFeatureBoards />
			</section>

			<section className="procurement-guide-section procurement-boundary-section" aria-labelledby="procurement-boundary-title">
				<div className="procurement-guide-section-heading"><p>یک ERP، با مرزهای روشن</p><h3 id="procurement-boundary-title">هر ماژول، بخش خودش از خرید را پیش می‌برد.</h3></div>
				<p className="procurement-boundary"><span className="procurement-boundary-pin" aria-hidden="true" /><strong>خرید و تدارکات</strong><span>{details.boundary} سندهای اصلی ERPNext مبنای گردش کار هستند؛ این صفحه مسیر و ارتباط آن‌ها را برای معرفی محصول نشان می‌دهد.</span></p>
			</section>

			<p className="procurement-handoff-note">عددها و وضعیت‌های صحنه، نمونه‌ی نمایشی‌اند و داده‌ی زنده‌ی شرکت شما نیستند. قابلیت‌های در دسترس به ماژول‌های نصب‌شده، پیکربندی، اتصال سرویس‌ها و مجوز کاربر بستگی دارد.</p>
			<footer className="procurement-handoff-footer">
				<nav className="procurement-related-modules" aria-label="ماژول‌های مرتبط با خرید">
					{relatedModules.map(module => <a href={`#module/${module.id}`} key={module.id} onClick={event => { event.preventDefault(); onOpenModule(module.id); }}>{module.title}<span aria-hidden="true">←</span></a>)}
				</nav>
				<a className="procurement-handoff-cta" href={`/hesab${details.entryPath}`}>{details.entryLabel}<span aria-hidden="true">↗</span></a>
			</footer>
			<button className="procurement-back-to-modules" type="button" onClick={onReturnToModules}>← بازگشت به همه‌ی ۱۵ ماژول</button>
		</div>
	</section>;
}
