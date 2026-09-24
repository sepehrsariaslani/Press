import { procurementSample, procurementSuppliers } from './storyData';

function toPersianDigits(value: number | string) {
	return String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

function PaperPin() {
	return <span className="procurement-paper-pin" aria-hidden="true"><i /></span>;
}

function PaperHeader({ source, status }: { source: string; status?: string }) {
	return <div className="procurement-paper-header"><small dir="auto">{source}</small>{status && <span>{status}</span>}</div>;
}

export function ProcurementEvidenceScene({ stage }: { stage: number }) {
	return <div className="procurement-scene" data-scene-stage={stage} role="img" aria-label="پرونده‌ی نمونه‌ی خرید؛ از درخواست و مقایسه‌ی پیشنهادها تا دریافت و تطبیق اسناد">
		<div className="procurement-board-plate" aria-hidden="true" />
		<div className="procurement-board-index" aria-hidden="true"><span>ASUMI · PURCHASE FILE</span><span>۰۱ — ۰۶</span></div>
		<svg className="procurement-story-threads" viewBox="0 0 1000 680" preserveAspectRatio="none" aria-hidden="true" focusable="false">
			<path data-thread="need" pathLength={1} d="M510 260 C505 310 340 312 270 380" />
			<path data-thread="sourcing" pathLength={1} d="M510 260 C520 315 666 315 740 375" />
			<path data-thread="decision" pathLength={1} d="M270 380 C380 464 620 464 740 375" />
			<path data-thread="order" pathLength={1} d="M505 395 C500 455 495 480 500 545" />
			<path data-thread="match" pathLength={1} d="M270 380 C310 516 390 554 500 545 C625 550 700 492 740 375" />
			<circle cx="510" cy="260" r="5" /><circle cx="270" cy="380" r="5" /><circle cx="740" cy="375" r="5" /><circle cx="500" cy="545" r="5" />
		</svg>

		<div className="procurement-floating-slip procurement-floating-slip--one" aria-hidden="true"><span>موجودی</span><strong>۲۴ عدد</strong></div>
		<div className="procurement-floating-slip procurement-floating-slip--two" aria-hidden="true"><span>نیاز خرید</span><strong>در انتظار بررسی</strong></div>

		<article className="procurement-evidence-paper procurement-request-paper" data-evidence="request">
			<PaperPin />
			<PaperHeader source="Material Request" status="درخواست تازه" />
			<h3>درخواست تأمین کالا</h3>
			<p className="procurement-paper-lead">{procurementSample.item} · تعداد {toPersianDigits(procurementSample.requested)} عدد</p>
			<div className="procurement-request-stock"><span>موجودی قابل‌استفاده</span><strong>{toPersianDigits(procurementSample.available)} عدد</strong></div>
			<div className="procurement-stock-meter"><i /></div>
			<p className="procurement-paper-foot">کسری قابل‌بررسی · ثبت نمایشی</p>
		</article>

		<div className="procurement-supplier-quotes" aria-hidden="true">
			{procurementSuppliers.map((supplier, index) => <article className="procurement-evidence-paper procurement-quote-paper" data-supplier={supplier.id} data-selected={supplier.selected} key={supplier.id}>
				<PaperPin />
				<PaperHeader source="Supplier Quotation" status={supplier.selected ? 'انتخاب نمونه' : `پیشنهاد ${index + 1}`} />
				<h3>{supplier.name}</h3>
				<strong className="procurement-quote-price">{supplier.price}<small> {procurementSample.currency}</small></strong>
				<div className="procurement-quote-meta"><span>تحویل <b>{supplier.delivery}</b></span><span>کیفیت <b>{supplier.quality}</b></span></div>
			</article>)}
		</div>

		<article className="procurement-evidence-paper procurement-comparison-paper" data-evidence="comparison">
			<PaperPin />
			<PaperHeader source="Quotation Comparison" status="مقایسه‌ی نمونه" />
			<h3>هر پیشنهاد، با معیار خودش</h3>
			<div className="procurement-comparison-table" role="presentation">
				<div className="procurement-comparison-row procurement-comparison-head"><span>تأمین‌کننده</span><span>قیمت</span><span>تحویل</span><span>کیفیت</span></div>
				{procurementSuppliers.map(supplier => <div className="procurement-comparison-row" data-selected={supplier.selected} key={supplier.id}><strong>{supplier.name}</strong><span>{supplier.price}</span><span>{supplier.delivery}</span><span>{supplier.quality}</span></div>)}
			</div>
			<p className="procurement-picked-note">ارزان‌ترین همیشه مناسب‌ترین نیست؛ انتخاب نمونه با توازن کیفیت و زمان.</p>
		</article>

		<article className="procurement-evidence-paper procurement-order-paper" data-evidence="order">
			<PaperPin />
			<PaperHeader source="Purchase Order" status="تأیید نمونه" />
			<h3>سفارش خرید</h3>
			<p className="procurement-order-code">{procurementSample.orderNumber}</p>
			<div className="procurement-order-lines"><span>{procurementSample.item} × {toPersianDigits(procurementSample.requested)}</span><strong>تأمین آریا</strong></div>
			<div className="procurement-order-lines"><span>موعد تحویل</span><strong>۳ روز کاری</strong></div>
			<span className="procurement-document-stamp">سفارش ثبت شد</span>
		</article>

		<div className="procurement-receipt-papers" aria-hidden="true">
			<article className="procurement-evidence-paper procurement-receipt-paper" data-evidence="receipt">
				<PaperPin />
				<PaperHeader source="Purchase Receipt" status="رسید نمونه" />
				<h3>تحویل محموله</h3>
				<strong>{toPersianDigits(procurementSample.received)} <small>از {toPersianDigits(procurementSample.requested)} عدد</small></strong>
				<p>۲ عدد برای بررسی بیشتر</p>
			</article>
			<article className="procurement-evidence-paper procurement-quality-paper" data-evidence="quality">
				<PaperPin />
				<PaperHeader source="Quality Inspection" status="کنترل ورودی" />
				<h3>نتیجه‌ی بازرسی</h3>
				<div className="procurement-quality-split"><span>پذیرفته‌شده<strong>{toPersianDigits(procurementSample.accepted)}</strong></span><span>در انتظار<strong>{toPersianDigits(procurementSample.needsInspection)}</strong></span></div>
				<p>ورود به موجودی پس از بررسی</p>
			</article>
		</div>

		<div className="procurement-match-paper" data-evidence="match">
			<PaperPin />
			<PaperHeader source="Three-way Match" status="تطبیق نمونه" />
			<h3>سه سند، یک تطبیق</h3>
			<div className="procurement-match-documents"><span>سفارش<small>Purchase Order</small></span><i aria-hidden="true">+</i><span>رسید<small>Purchase Receipt</small></span><i aria-hidden="true">+</i><span>فاکتور<small>Purchase Invoice</small></span></div>
			<p>اختلاف‌ها را پیش از پرداخت پیدا کن.</p>
		</div>

		<div className="procurement-dashboard-paper" data-evidence="dashboard">
			<div className="procurement-dashboard-top"><strong>مرکز خرید <span>آسومی</span></strong><small>نمای نمونه · ۱۴۰۵</small></div>
			<div className="procurement-dashboard-stats"><div><span>سفارش باز</span><strong>۱۲</strong></div><div><span>در انتظار دریافت</span><strong>۴</strong></div><div><span>نیاز به پیگیری</span><strong>۲</strong></div></div>
			<div className="procurement-dashboard-chart" aria-hidden="true"><div><span style={{ height: '35%' }} /><span style={{ height: '48%' }} /><span style={{ height: '42%' }} /><span style={{ height: '68%' }} /><span style={{ height: '57%' }} /><span style={{ height: '83%' }} /><span style={{ height: '73%' }} /></div><small>روند خرید · داده‌ی نمایشی</small></div>
		</div>
		<span className="procurement-scene-seal" aria-hidden="true">پرونده‌ی نمونه</span>
	</div>;
}
