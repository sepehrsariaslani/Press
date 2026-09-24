export type CheckoutSelectionEntry = {
	slug: string;
	title: string;
	planTitle: string;
	amount: number | null;
	interval: string;
	state: string;
	ready: boolean;
};

type Props = {
	entries: CheckoutSelectionEntry[];
	totals: Record<string, number>;
	currency: string;
	unpricedCount: number;
	unavailableCount: number;
	canManageBilling: boolean;
	canCheckout: boolean;
	busy: boolean;
	pendingCount: number;
	onClear: () => void;
	onCheckout: () => void;
};

export function SelectionCheckout({ entries, totals, currency, unpricedCount, unavailableCount, canManageBilling, canCheckout, busy, pendingCount, onClear, onCheckout }: Props) {
	const count = entries.length;
	return <aside className="customer-portal-estimate" aria-label="برآورد و ثبت انتخاب‌ها">
		<div className="customer-portal-estimate-main">
			<span>جمع پلن‌های انتخاب‌شده</span>
			{Object.keys(totals).length
				? <div className="customer-portal-estimate-totals">{Object.entries(totals).map(([period, total]) => <strong key={period}>{formatPrice(total, currency)} <small>/ {periodLabel(period)}</small></strong>)}</div>
				: <strong>{count ? 'قیمت قابل محاسبه نیست' : 'ماژولی انتخاب نشده'}</strong>}
			<p>{new Intl.NumberFormat('fa-IR').format(count)} انتخاب · {new Intl.NumberFormat('fa-IR').format(unpricedCount)} مورد بدون قیمت</p>
		</div>
		{count > 0 && <details className="customer-portal-estimate-details" open>
			<summary>جزئیات انتخاب‌ها</summary>
			<ul>{entries.map(entry => <li key={entry.slug} data-ready={entry.ready}>
				<span><strong>{entry.title}</strong><small>{entry.planTitle} · {periodLabel(entry.interval)} · {entry.state}</small></span>
				<strong>{formatPrice(entry.amount, currency)}</strong>
			</li>)}</ul>
		</details>}
		<div className="customer-portal-estimate-actions">
			<button type="button" className="customer-portal-primary-button" disabled={!canManageBilling || !canCheckout || busy || count === 0} onClick={onCheckout}>
				{busy ? 'در حال ثبت انتخاب‌ها…' : pendingCount ? 'فعال‌سازی در حال انجام است' : !canManageBilling ? 'ثبت خرید با مدیر مالی' : 'ثبت انتخاب‌ها و فعال‌سازی'}
			</button>
			<button type="button" className="customer-portal-text-button" disabled={count === 0 || busy} onClick={onClear}>پاک‌کردن انتخاب‌ها</button>
		</div>
		<p className="customer-portal-estimate-note">
			{!canManageBilling ? 'انتخاب‌ها را مدیر مالی تیم می‌تواند ثبت کند.' : unavailableCount ? `${new Intl.NumberFormat('fa-IR').format(unavailableCount)} مورد با سایت انتخاب‌شده آمادهٔ نصب نیست؛ قبل از ثبت، جزئیات هر مورد را بررسی کن.` : unpricedCount ? `${new Intl.NumberFormat('fa-IR').format(unpricedCount)} پلن برای ارز حساب قیمت ندارد؛ از گزینهٔ استعلام تعرفه در کارت ماژول استفاده کن.` : 'هر ماژول در اشتراک خودش ثبت می‌شود. مبلغ‌ها بر اساس دورهٔ انتخابی تمدید می‌شوند و در صورتحساب حساب نمایش داده خواهند شد.'}
		</p>
	</aside>;
}

function formatPrice(amount: number | null, currency: string) {
	if (amount === null) return 'قیمت اعلام نشده';
	try { return new Intl.NumberFormat('fa-IR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount); }
	catch { return `${new Intl.NumberFormat('fa-IR').format(amount)} ${currency}`; }
}

function periodLabel(period?: string | null) {
	if (period === 'Annually' || period === 'Yearly' || period === 'Annual') return 'سالانه';
	return 'ماهانه';
}
