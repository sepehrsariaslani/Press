import { useState, type CSSProperties } from 'react';
import {
	procurementPreviewActions,
	procurementPreviewOrders,
	procurementPreviewRanges,
	procurementPreviewSuppliers,
	type ProcurementPreviewRange,
	type ProcurementPreviewView,
} from './procurementDashboardPreviewData';
import './procurement-dashboard-preview.css';

const views: readonly { id: ProcurementPreviewView; label: string }[] = [
	{ id: 'overview', label: 'نمای کلی' },
	{ id: 'orders', label: 'سفارش‌ها' },
	{ id: 'analysis', label: 'تحلیل خرید' },
];

function ProcurementPreviewMark() {
	return <span className="procurement-preview-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 5h14v14H5z" /><path d="M8 15V9l4 3 4-3v6" /></svg></span>;
}

function PreviewIcon({ kind }: { kind: ProcurementPreviewView | 'ordersMetric' | 'receiptMetric' | 'supplierMetric' | 'rateMetric' }) {
	const paths: Record<typeof kind, string> = {
		overview: 'M4 11 12 4l8 7v9h-6v-6h-4v6H4z',
		orders: 'M6 4h9l4 4v12H6z M15 4v5h4 M9 13h7 M9 16h7',
		analysis: 'M4 19V5 M4 19h16 M7 15l4-4 3 2 5-7',
		ordersMetric: 'M6 4h12v16H6z M9 8h6 M9 12h6 M9 16h4',
		receiptMetric: 'M12 4v8l5 3 M20 12a8 8 0 1 1-2.34-5.66',
		supplierMetric: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20 M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7 M17 4.5a3.5 3.5 0 0 1 0 6.8 M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35',
		rateMetric: 'm5 12 4 4L19 6',
	};
	return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={paths[kind]} /></svg>;
}

function ProcurementTrend({ range }: { range: ProcurementPreviewRange }) {
	const data = procurementPreviewRanges[range];
	return <figure className="procurement-preview-panel procurement-preview-trend" aria-label={`نمودار نمونه‌ی روند خرید، ${data.caption}: ${data.trend.map(point => `${point.label} ${point.height}`).join('، ')}`}>
		<figcaption><div><strong>روند خرید</strong><small>مبلغ سفارش‌ها · داده‌ی نمونه</small></div><span>{data.caption}</span></figcaption>
		<div className="procurement-preview-chart" aria-hidden="true">
			{data.trend.map(point => <div className="procurement-preview-bar" key={point.label}>
				<span style={{ '--bar-height': `${point.height}%` } as CSSProperties} />
				<small>{point.label}</small>
			</div>)}
		</div>
	</figure>;
}

function OrderRows() {
	return <div className="procurement-preview-order-list">
		{procurementPreviewOrders.map(order => <article className="procurement-preview-order" key={order.id}>
			<div className="procurement-preview-order-main"><strong>{order.supplier}</strong><small>{order.id} · موعد {order.due}</small></div>
			<strong className="procurement-preview-order-amount">{order.total}<small> تومان</small></strong>
			<span className={`procurement-preview-status procurement-preview-status--${order.tone}`}>{order.status}</span>
		</article>)}
	</div>;
}

export function ProcurementDashboardPreview({ entryHref }: { entryHref: string }) {
	const [activeView, setActiveView] = useState<ProcurementPreviewView>('overview');
	const [range, setRange] = useState<ProcurementPreviewRange>('month');
	const activeRange = procurementPreviewRanges[range];

	return <section className="procurement-dashboard-preview" aria-labelledby="procurement-dashboard-preview-title">
		<header className="procurement-preview-intro">
			<div>
				<p className="procurement-guide-eyebrow">یک نگاه به خودِ محصول</p>
				<h2 id="procurement-dashboard-preview-title">داشبورد خرید، از نزدیک.</h2>
				<p>از سفارش‌های معلق و هشدارهای امروز تا روند خرید، تأمین‌کننده‌ها و بودجه؛ همه در مرکز خرید آسومی کنار هم دیده می‌شوند.</p>
			</div>
			<span className="procurement-preview-intro-tag"><i aria-hidden="true" /> پیش‌نمایش تعاملی</span>
		</header>

		<div className="procurement-preview-window" role="group" aria-label="دموی تعاملی داشبورد خرید آسومی">
			<div className="procurement-preview-topbar">
				<div className="procurement-preview-product"><ProcurementPreviewMark /><strong>آسومی</strong><span>/</span><span>خرید و تدارکات</span></div>
				<div className="procurement-preview-topbar-end"><span className="procurement-preview-demo-label">محیط نمایشی · داده‌ی نمونه</span><a href={entryHref}>ورود به داشبورد واقعی <span aria-hidden="true">↗</span></a></div>
			</div>

			<div className="procurement-preview-layout">
				<aside className="procurement-preview-sidebar" aria-label="بخش‌های نمونه‌ی داشبورد خرید">
					<p>فضای کاری</p>
					<nav aria-label="نماهای داشبورد خرید">
						{views.map(view => <button type="button" key={view.id} aria-pressed={activeView === view.id} onClick={() => setActiveView(view.id)}>
							<span className="procurement-preview-nav-icon"><PreviewIcon kind={view.id} /></span>{view.label}
						</button>)}
					</nav>
					<div className="procurement-preview-sidebar-links"><span>فرایندها</span><small>درخواست و برنامه</small><small>استعلام و سفارش</small><small>دریافت و فاکتور</small></div>
				</aside>

				<div className="procurement-preview-main">
					<div className="procurement-preview-main-heading">
						<div><span>مرکز خرید و تدارکات</span><h3>{views.find(view => view.id === activeView)?.label}</h3></div>
						<div className="procurement-preview-range" role="group" aria-label="بازه‌ی گزارش نمونه">
							{(Object.keys(procurementPreviewRanges) as ProcurementPreviewRange[]).map(key => <button type="button" key={key} aria-pressed={range === key} onClick={() => setRange(key)}>{procurementPreviewRanges[key].label}</button>)}
						</div>
					</div>

					<div className="procurement-preview-kpis">
						{activeRange.metrics.map((metric, index) => <article className="procurement-preview-kpi" key={metric.label}>
							<span className="procurement-preview-kpi-icon"><PreviewIcon kind={(['ordersMetric', 'receiptMetric', 'supplierMetric', 'rateMetric'] as const)[index]} /></span>
							<small>{metric.label}</small><strong>{metric.value}</strong><span>{metric.detail}</span>
						</article>)}
					</div>

					{activeView === 'overview' && <div className="procurement-preview-panels">
						<ProcurementTrend range={range} />
						<section className="procurement-preview-panel procurement-preview-actions" aria-labelledby="procurement-preview-actions-title">
							<div className="procurement-preview-panel-heading"><div><h4 id="procurement-preview-actions-title">نیازمند توجه</h4><small>کارهایی که منتظر اقدام‌اند</small></div><span>۰۳</span></div>
							{procurementPreviewActions.map(action => <article className="procurement-preview-action" key={action.title}>
								<i className={`procurement-preview-action-mark procurement-preview-action-mark--${action.tone}`} aria-hidden="true" />
								<div><strong>{action.title}</strong><small>{action.detail}</small><span>{action.action} <b aria-hidden="true">←</b></span></div>
							</article>)}
						</section>
						<section className="procurement-preview-panel procurement-preview-recent" aria-labelledby="procurement-preview-recent-title">
							<div className="procurement-preview-panel-heading"><div><h4 id="procurement-preview-recent-title">سفارش‌های خرید معلق</h4><small>موارد در انتظار تحویل یا پیگیری</small></div><button type="button" onClick={() => setActiveView('orders')}>همه‌ی سفارش‌ها <span aria-hidden="true">←</span></button></div>
							<OrderRows />
						</section>
					</div>}

					{activeView === 'orders' && <section className="procurement-preview-panel procurement-preview-orders-panel" aria-labelledby="procurement-preview-orders-title">
						<div className="procurement-preview-panel-heading"><div><h4 id="procurement-preview-orders-title">سفارش‌های خرید معلق</h4><small>سفارش، تأمین‌کننده، موعد و وضعیت دریافت</small></div><span>۳ سفارش نمونه</span></div>
						<OrderRows />
						<div className="procurement-preview-order-foot"><span>در خود برنامه، هر سفارش به رسید، کنترل کیفیت و فاکتور خرید متصل است.</span><a href={entryHref}>بازکردن مرکز خرید <span aria-hidden="true">↗</span></a></div>
					</section>}

					{activeView === 'analysis' && <div className="procurement-preview-panels procurement-preview-analysis">
						<ProcurementTrend range={range} />
						<section className="procurement-preview-panel procurement-preview-suppliers" aria-labelledby="procurement-preview-suppliers-title">
							<div className="procurement-preview-panel-heading"><div><h4 id="procurement-preview-suppliers-title">عملکرد تأمین‌کنندگان</h4><small>درصد تحویل به‌موقع</small></div><span>این بازه</span></div>
							{procurementPreviewSuppliers.map(supplier => <div className="procurement-preview-supplier" key={supplier.name}>
								<div><strong>{supplier.name}</strong><b>{supplier.rate}</b></div><span>{supplier.detail}</span><i><em style={{ width: `${supplier.width}%` }} /></i>
							</div>)}
							<div className="procurement-preview-budget"><div><span>مصرف بودجه‌ی خرید</span><strong>۷۸٪</strong></div><i><em /></i><small>۲۲٪ مانده تا سقف بودجه</small></div>
						</section>
					</div>}

					<p className="procurement-preview-disclaimer">این پیش‌نمایش تعاملی است؛ عددها و پرونده‌ها نمونه‌اند. داده‌ی واقعی شرکت پس از ورود به برنامه و مطابق سطح دسترسی نمایش داده می‌شود.</p>
				</div>
			</div>
		</div>
	</section>;
}
