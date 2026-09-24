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
	canManageApps: boolean;
	canManageBilling: boolean;
	canCheckout: boolean;
	busy: boolean;
	pendingCount: number;
	onClear: () => void;
	onCheckout: () => void;
};

export function SelectionCheckout({ entries, totals, currency, unpricedCount, unavailableCount, canManageApps, canManageBilling, canCheckout, busy, pendingCount, onClear, onCheckout }: Props) {
	const count = entries.length;
	const plannedEntries = entries.filter(entry => entry.state !== 'فعال است');
	const needsBilling = plannedEntries.some(entry => entry.state === 'تغییر پلن' || (entry.amount ?? 0) > 0);
	const needsAppAccess = plannedEntries.some(entry => entry.state !== 'تغییر پلن' && entry.amount === 0);
	const hasRequiredPermission = (!needsBilling || canManageBilling) && (!needsAppAccess || canManageApps);
	const permissionMessage = needsBilling && needsAppAccess
		? 'برای ثبت این ترکیب، دسترسی مدیر مالی و مدیر ماژول‌ها لازم است.'
		: needsBilling
			? 'برای خرید پلن پولی یا تغییر اشتراک، مدیر مالی تیم باید اقدام کند.'
			: 'برای نصب ماژول رایگان، مدیر ماژول‌های تیم باید اقدام کند.';
	return <aside className="customer-portal-estimate" aria-label="برآورد و ثبت انتخاب‌ها">
		<div className="customer-portal-estimate-main">
			<span>جمع پلن‌های انتخاب‌شده</span>
			{Object.keys(totals).length
				? <div className="customer-portal-estimate-totals">{Object.entries(totals).map(([period, total]) => <strong key={period}>{formatPrice(total, currency)} <small>/ {periodLabel(period)}</small></strong>)}</div>
				: <strong>{plannedEntries.length === 0 && count > 0 ? 'همهٔ انتخاب‌ها فعال هستند' : count ? 'قیمت قابل محاسبه نیست' : 'ماژولی انتخاب نشده'}</strong>}
			<p>{new Intl.NumberFormat('fa-IR').format(count)} انتخاب · {new Intl.NumberFormat('fa-IR').format(unpricedCount)} مورد بدون قیمت</p>
		</div>
		{count > 0 && <details className="customer-portal-estimate-details" open>
			<summary>جزئیات انتخاب‌ها</summary>
			<ul>{entries.map(entry => <li key={entry.slug} data-ready={entry.ready}>
				<span><strong>{entry.title}</strong><small>{entry.planTitle} · {periodLabel(entry.interval)} · {entry.state}</small></span>
				<strong>{entry.state === 'فعال است' ? 'بدون ثبت دوباره' : formatPrice(entry.amount, currency)}</strong>
			</li>)}</ul>
		</details>}
		<div className="customer-portal-estimate-actions">
			<button type="button" className="customer-portal-primary-button" disabled={!hasRequiredPermission || !canCheckout || busy || plannedEntries.length === 0} onClick={onCheckout}>
				{busy ? 'در حال ثبت انتخاب‌ها…' : pendingCount ? 'فعال‌سازی در حال انجام است' : plannedEntries.length === 0 ? 'همهٔ انتخاب‌ها فعال هستند' : !hasRequiredPermission ? needsBilling && needsAppAccess ? 'هماهنگی با مدیران تیم' : needsBilling ? 'ثبت خرید با مدیر مالی' : 'ثبت با مدیر ماژول' : 'ثبت انتخاب‌ها و فعال‌سازی'}
			</button>
			<button type="button" className="customer-portal-text-button" disabled={count === 0 || busy} onClick={onClear}>پاک‌کردن انتخاب‌ها</button>
		</div>
		<p className="customer-portal-estimate-note">
			{!hasRequiredPermission ? permissionMessage : plannedEntries.length === 0 && count > 0 ? 'این ماژول‌ها با همین پلن روی سایت فعال هستند و هزینهٔ تازه‌ای ثبت نمی‌شود.' : unavailableCount ? `${new Intl.NumberFormat('fa-IR').format(unavailableCount)} مورد با سایت انتخاب‌شده آمادهٔ نصب نیست؛ قبل از ثبت، جزئیات هر مورد را بررسی کن.` : unpricedCount ? `${new Intl.NumberFormat('fa-IR').format(unpricedCount)} پلن برای ارز حساب قیمت ندارد؛ از گزینهٔ استعلام تعرفه در کارت ماژول استفاده کن.` : 'این جمع بر اساس قیمت پلن‌هاست؛ مالیات احتمالی و اعتبار حساب در فاکتور نهایی محاسبه می‌شود. هر ماژول اشتراک و تمدید خودش را دارد.'}
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
