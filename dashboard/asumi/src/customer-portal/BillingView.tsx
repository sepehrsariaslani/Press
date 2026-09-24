import { useCallback, useEffect, useState } from 'react';
import { CreditTopUpPanel } from './CreditTopUpPanel';
import { BillingSettingsPanel } from './BillingSettingsPanel';
import { getBalanceTransactions, getInvoices, getUpcomingInvoice, refreshInvoicePaymentLink, type BalanceTransaction, type Invoice } from './portalApi';

type Props = { currency: string; onAskSupport: (invoice?: Invoice) => void };

const statusLabels: Record<string, string> = {
	Paid: 'پرداخت‌شده', Unpaid: 'پرداخت‌نشده', Draft: 'پیش‌نویس', Refunded: 'بازپرداخت‌شده',
	Uncollectible: 'وصول‌ناپذیر', Collected: 'وصول‌شده', 'Invoice Created': 'فاکتور صادرشده', Empty: 'بدون مبلغ',
};

export function BillingView({ currency, onAskSupport }: Props) {
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
	const [upcoming, setUpcoming] = useState<{ upcoming_invoice: Invoice | null; available_credits: string } | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [reloadToken, setReloadToken] = useState(0);
	const [showTopUp, setShowTopUp] = useState(false);
	const [topUpNotice, setTopUpNotice] = useState('');
	const [refreshingInvoice, setRefreshingInvoice] = useState('');
	const [invoiceNotice, setInvoiceNotice] = useState('');
	const [invoiceActionError, setInvoiceActionError] = useState('');
	const reload = useCallback(async (signal?: AbortSignal) => {
		setLoading(true);
		setError('');
		try {
			const [history, current, balanceHistory] = await Promise.all([getInvoices(signal), getUpcomingInvoice(signal), getBalanceTransactions(signal)]);
			setInvoices(history);
			setUpcoming(current);
			setTransactions(balanceHistory);
		} catch (caught) {
			if (!signal?.aborted) setError(messageOf(caught));
		} finally {
			if (!signal?.aborted) setLoading(false);
		}
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		void reload(controller.signal);
		return () => controller.abort();
	}, [reload, reloadToken]);

	function openInvoicePayment(invoice: Invoice) {
		if (invoice.stripe_invoice_url) {
			const url = `/api/method/press.api.client.run_doc_method?dt=Invoice&dn=${encodeURIComponent(invoice.name)}&method=stripe_payment_url`;
			window.open(url, '_blank', 'noopener,noreferrer');
			return;
		}
		onAskSupport(invoice);
	}

	async function refreshPaymentLink(invoice: Invoice) {
		setRefreshingInvoice(invoice.name); setInvoiceActionError(''); setInvoiceNotice('');
		try {
			const link = await refreshInvoicePaymentLink(invoice.name);
			setInvoices(current => current.map(item => item.name === invoice.name ? { ...item, stripe_invoice_url: link, stripe_link_expired: false } : item));
			setInvoiceNotice(`پیوند پرداخت فاکتور ${invoice.name} به‌روز شد؛ حالا می‌توانی پرداخت را باز کنی.`);
		} catch (caught) { setInvoiceActionError(messageOf(caught)); }
		finally { setRefreshingInvoice(''); }
	}

	return <div className="customer-portal-workspace">
		<section className="customer-portal-panel" aria-labelledby="portal-billing-title">
			<div className="customer-portal-panel-heading"><div><p>صورتحساب و پرداخت</p><h2 id="portal-billing-title">وضعیت مالی تیم</h2></div><button type="button" aria-expanded={showTopUp} onClick={() => setShowTopUp(value => !value)}>{showTopUp ? 'بستن شارژ حساب' : 'افزایش اعتبار'}</button></div>
			{loading ? <div className="customer-portal-inline-state" role="status">در حال دریافت فاکتورها…</div> : error ? <div className="customer-portal-inline-error" role="alert"><span>{error}</span><button type="button" onClick={() => setReloadToken(value => value + 1)}>تلاش دوباره</button></div> : <>
				{topUpNotice && <p className="customer-portal-inline-status" role="status">{topUpNotice}</p>}
				{invoiceNotice && <p className="customer-portal-inline-status" role="status">{invoiceNotice}</p>}
				{invoiceActionError && <div className="customer-portal-inline-error" role="alert"><span>{invoiceActionError}</span><button type="button" onClick={() => setInvoiceActionError('')}>بستن</button></div>}
				{showTopUp && <CreditTopUpPanel currency={currency} onSuccess={() => { setTopUpNotice('پرداخت ثبت شد؛ اعتبار پس از تأیید Stripe به‌روزرسانی می‌شود.'); setReloadToken(value => value + 1); }} />}
				<div className="customer-portal-billing-summary">
					<article><span>اعتبار حساب</span><strong>{upcoming?.available_credits || '—'}</strong><small>بر اساس موجودی فعلی تیم</small></article>
					<article><span>فاکتور بعدی</span><strong>{upcoming?.upcoming_invoice ? formatCurrency(upcoming.upcoming_invoice.amount_due_with_tax ?? upcoming.upcoming_invoice.total, upcoming.upcoming_invoice.currency) : 'فعلاً ندارد'}</strong><small>{upcoming?.upcoming_invoice?.due_date ? `موعد ${formatDate(upcoming.upcoming_invoice.due_date)}` : 'هزینه با چرخهٔ صورتحساب حساب محاسبه می‌شود'}</small></article>
					<article><span>پرداخت‌نشده</span><strong>{new Intl.NumberFormat('fa-IR').format(invoices.filter(invoice => invoice.status === 'Unpaid' && Number(invoice.amount_due) > 0).length)}</strong><small>فاکتورهای نیازمند اقدام</small></article>
				</div>
				<div className="customer-portal-panel-heading customer-portal-invoice-heading"><div><p>تاریخچهٔ مالی</p><h3>فاکتورها</h3></div><span>{new Intl.NumberFormat('fa-IR').format(invoices.length)} فاکتور</span></div>
				{invoices.length ? <div className="customer-portal-invoice-list">{invoices.map(invoice => <article className="customer-portal-invoice" key={invoice.name}>
						<div className="customer-portal-invoice-main"><strong>{invoice.name}</strong><small>{invoice.type === 'Subscription' ? 'اشتراک' : invoice.type === 'Prepaid Credits' ? 'اعتبار حساب' : invoice.type} · {formatDate(invoice.date || invoice.due_date)}</small></div>
						<div className="customer-portal-invoice-total"><strong>{formatCurrency(invoice.total, invoice.currency)}</strong>{invoice.amount_due > 0 && <small>مانده: {formatCurrency(invoice.amount_due, invoice.currency)}</small>}</div>
						<StatusPill status={invoice.status} label={statusLabels[invoice.status] || invoice.status} />
						<div className="customer-portal-invoice-actions">
							{invoice.invoice_pdf && <a href={invoice.invoice_pdf} target="_blank" rel="noreferrer">دیدن فاکتور</a>}
							{invoice.status === 'Unpaid' && invoice.amount_due > 0 && invoice.stripe_invoice_url && !invoice.stripe_link_expired && <button type="button" onClick={() => openInvoicePayment(invoice)}>پرداخت فاکتور</button>}
							{invoice.status === 'Unpaid' && invoice.amount_due > 0 && invoice.stripe_invoice_url && invoice.stripe_link_expired && <button type="button" disabled={refreshingInvoice === invoice.name} onClick={() => void refreshPaymentLink(invoice)}>{refreshingInvoice === invoice.name ? 'در حال به‌روزرسانی…' : 'تازه‌سازی پیوند پرداخت'}</button>}
							{invoice.status === 'Unpaid' && invoice.amount_due > 0 && !invoice.stripe_invoice_url && <button type="button" onClick={() => onAskSupport(invoice)}>پیگیری با پشتیبانی</button>}
						</div>
					</article>)}</div> : <div className="customer-portal-inline-state">هنوز فاکتوری برای این تیم ثبت نشده است.</div>}
				<p className="customer-portal-footnote">مبالغ این بخش از فاکتورهای رسمی آسومی می‌آیند. برای شیوه‌های پرداخت جایگزین یا مغایرت فاکتور، درخواست پشتیبانی ثبت کن.</p>
				{transactions.length > 0 && <><div className="customer-portal-panel-heading customer-portal-invoice-heading"><div><p>تغییرات اعتبار حساب</p><h3>تراکنش‌های کیف پول</h3></div><span>{new Intl.NumberFormat('fa-IR').format(transactions.length)} مورد</span></div><div className="customer-portal-invoice-list">{transactions.map(transaction => <article className="customer-portal-balance-row" key={transaction.name}><div><strong>{balanceSourceLabel(transaction.source, transaction.type)}</strong><small>{formatDateTime(transaction.creation)}{transaction.description ? ` · ${transaction.description}` : ''}</small></div><strong>{transaction.formatted?.amount || formatCurrency(transaction.amount, transaction.currency)}</strong><small>مانده پس از تراکنش: {transaction.formatted?.ending_balance || formatCurrency(transaction.ending_balance, transaction.currency)}</small></article>)}</div></>}
			</>}
		</section>
		<BillingSettingsPanel />
	</div>;
}

function StatusPill({ status, label }: { status: string; label: string }) {
	return <span className="customer-portal-status" data-status={status.toLowerCase().replaceAll(' ', '-')}>{label}</span>;
}

function formatCurrency(value: number, currency: string) {
	try { return new Intl.NumberFormat('fa-IR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0)); }
	catch { return `${new Intl.NumberFormat('fa-IR').format(Number(value || 0))} ${currency}`; }
}

function formatDate(value: string | null) {
	if (!value) return '—';
	const date = new Date(`${value.slice(0, 10)}T00:00:00`);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

function formatDateTime(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

function balanceSourceLabel(source: string, type: string) {
	if (type === 'Applied To Invoice') return 'پرداخت از اعتبار حساب';
	const labels: Record<string, string> = { 'Prepaid Credits': 'افزایش اعتبار', 'Transferred Credits': 'اعتبار انتقال‌یافته', 'Free Credits': 'اعتبار هدیه' };
	return labels[source] || type;
}

function messageOf(error: unknown) {
	return error instanceof Error ? error.message : 'دریافت فاکتورها ممکن نشد.';
}
