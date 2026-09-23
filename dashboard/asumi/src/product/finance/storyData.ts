import type { Evidence } from '../../story/board/evidence';

export type FinancePeriod = {
	sales: number;
	purchases: number;
	payroll: number;
	rent: number;
	returns: number;
};

export const financeSample = {
	unit: 'میلیون تومان',
	previous: { sales: 492, purchases: 138, payroll: 58, rent: 22, returns: 6 } satisfies FinancePeriod,
	current: { sales: 455, purchases: 164, payroll: 61, rent: 22, returns: 8 } satisfies FinancePeriod,
};

export function calculateOperatingProfit(period: FinancePeriod) {
	return period.sales - period.purchases - period.payroll - period.rent - period.returns;
}

export const financeProfit = {
	previous: calculateOperatingProfit(financeSample.previous),
	current: calculateOperatingProfit(financeSample.current),
};

export const financeCategories = [
	{ id: 'sales', label: 'فروش', value: financeSample.current.sales, tone: 'income' },
	{ id: 'purchases', label: 'خرید', value: financeSample.current.purchases, tone: 'expense' },
	{ id: 'payroll', label: 'حقوق', value: financeSample.current.payroll, tone: 'expense' },
	{ id: 'rent', label: 'اجاره', value: financeSample.current.rent, tone: 'expense' },
	{ id: 'returns', label: 'برگشتی', value: financeSample.current.returns, tone: 'expense' },
	{ id: 'profit', label: 'سود خالص', value: financeProfit.current, tone: 'result' },
] as const;

export const financeProfitDrivers = [
	{ id: 'sales', label: 'فروش کمتر', amount: 37, symbol: '−' },
	{ id: 'purchases', label: 'خرید بیشتر', amount: 26, symbol: '−' },
	{ id: 'payroll', label: 'حقوق بیشتر', amount: 3, symbol: '−' },
	{ id: 'returns', label: 'برگشتی بیشتر', amount: 2, symbol: '−' },
] as const;

export const financeQuestions = [
	{
		id: 'profit-drop',
		label: 'چرا سود این ماه کمتر شد؟',
		answer: `سود خالص از ${financeProfit.previous} به ${financeProfit.current} میلیون تومان رسیده؛ ${financeProfit.previous - financeProfit.current} میلیون تومان کمتر از ماه قبل. افت فروش و رشد خرید بیشترین اثر را داشته‌اند.`,
		primaryDriver: 'بیشترین سهم مربوط به افت فروش و افزایش هزینه‌ی خرید است.',
	},
	{
		id: 'largest-cost',
		label: 'کدام هزینه بیشترین اثر را گذاشت؟',
		answer: 'هزینه‌ی خرید نسبت به ماه قبل ۲۶ میلیون تومان بیشتر شده؛ اجاره ثابت مانده و اثر آن در افت این ماه نیست.',
		primaryDriver: 'خرید ۲۶+ · حقوق ۳+ · اجاره بدون تغییر',
	},
] as const;

export const financeTimeline = [
	{
		id: 'invoice', time: '۰۹:۴۲', label: 'فاکتور فروش', type: 'Sales Invoice', amount: '۴۸ میلیون تومان',
		reference: 'SINV-1405-0142', detail: 'فاکتور ثبت شد؛ ۸ میلیون تومان از مبلغ هنوز دریافت نشده است.',
	},
	{
		id: 'payment', time: '۱۱:۱۸', label: 'دریافت وجه', type: 'Payment Entry', amount: '۴۰ میلیون تومان',
		reference: 'ACC-PAY-0142', detail: 'پرداخت جزئی به همان فاکتور پیوند خورد؛ ۸ میلیون تومان مانده است.',
	},
	{
		id: 'bank', time: '۱۲:۰۶', label: 'تطبیق بانکی', type: 'Bank Transaction', amount: '۴۰ میلیون تومان',
		reference: 'BANK-TXN-0087', detail: 'گردش حساب با دریافت فاکتور تطبیق داده شد.',
	},
	{
		id: 'ledger', time: '۱۲:۰۶', label: 'ثبت در دفتر کل', type: 'Journal Entry', amount: '۴۰ دریافت · ۸ مانده',
		reference: 'ACC-JV-0214', detail: 'اثر دریافت و مانده‌ی مشتری در سند حسابداری قابل‌ردیابی است.',
	},
] as const;

export const financePaperEvidence: Evidence[] = [
	{
		title: 'فاکتور فروش', tag: 'سند ۰۱', value: '۴۸٬۰۰۰٬۰۰۰', note: 'تومان · نمونه', width: 210, height: 260,
		scattered: [190, 180, -14], pinned: [500, 390, 0],
	},
	{
		title: 'رسید دریافت', tag: 'سند ۰۲', value: '۴۰٬۰۰۰٬۰۰۰', note: 'تومان · نمونه', width: 190, height: 245,
		scattered: [500, 155, 11], pinned: [500, 390, 0],
	},
	{
		title: 'گردش بانک', tag: 'سند ۰۳', value: '۴۰٬۰۰۰٬۰۰۰', note: 'تطبیق‌شده', width: 200, height: 255,
		scattered: [805, 230, -10], pinned: [500, 390, 0],
	},
	{
		title: 'فاکتور خرید', tag: 'سند ۰۴', value: '۱۶۴ میلیون', note: 'هزینه‌ی ماه', width: 195, height: 245,
		scattered: [260, 515, 12], pinned: [500, 390, 0],
	},
	{
		title: 'سند حقوق', tag: 'سند ۰۵', value: '۶۱ میلیون', note: 'پرداخت ماه', width: 190, height: 240,
		scattered: [750, 520, -13], pinned: [500, 390, 0],
	},
	{
		title: 'برگشتی فروش', tag: 'سند ۰۶', value: '۸ میلیون', note: 'این ماه', width: 180, height: 225,
		scattered: [520, 610, 7], pinned: [500, 390, 0],
	},
];

export const financeChapters = [
	{
		id: 'finance-mystery', label: 'کشف', eyebrow: 'پرونده‌ی مالی · ۰۱ / ۰۶',
		title: 'این پول\nکجا رفت؟',
		description: 'فاکتورها روی هم افتاده‌اند؛ عدد را می‌بینی، اما هنوز ردّش را نه.',
		detail: 'با هر قدم، از شلوغی به سند و از سند به پاسخ می‌رسی.',
	},
	{
		id: 'finance-breakdown', label: 'تفکیک', eyebrow: 'عدد، باز می‌شود · ۰۲ / ۰۶',
		title: '۲۰۰ میلیون،\nاز چند جریان؟',
		description: 'فروش، خرید، حقوق، اجاره و برگشتی را جدا ببین؛ حالا می‌دانی سود از کجا آمده.',
		detail: 'همه‌ی مبلغ‌ها نمونه‌ی نمایشی و به میلیون تومان‌اند.',
	},
	{
		id: 'finance-timeline', label: 'ردیابی', eyebrow: 'یک مسیر، چند سند · ۰۳ / ۰۶',
		title: 'یک فاکتور را\nتا بانکت دنبال کن.',
		description: 'فاکتور به دریافت، دریافت به گردش بانک و هر دو به ثبت دفتر کل می‌رسند.',
		detail: 'رویدادها به هم وصل‌اند؛ لازم نیست جداگانه دنبالش بگردی.',
	},
	{
		id: 'finance-form', label: 'ثبت', eyebrow: 'از کاغذ تا کار واقعی · ۰۴ / ۰۶',
		title: 'این همان سندی‌ست\nکه ثبت می‌کنی.',
		description: 'کاغذ فاکتور آرام به نمای ثبت فروش آسومی تبدیل می‌شود؛ شماره، مشتری و مبلغ یک‌جا.',
		detail: 'این پیش‌نمایش نمایشی است؛ سند واقعی فقط در محیط واردشده ثبت می‌شود.',
	},
	{
		id: 'finance-question', label: 'پرسش', eyebrow: 'از گزارش تا علت · ۰۵ / ۰۶',
		title: 'حالا سؤال\nبپرس.',
		description: 'مثلاً: چرا سود این ماه کمتر شد؟ پاسخ از تغییرهای فروش و هزینه سرنخ می‌گیرد.',
		detail: 'برای دیدن پاسخ نمونه، یکی از پرسش‌ها را انتخاب کن.',
	},
	{
		id: 'finance-outlook', label: 'آینده', eyebrow: 'به‌سوی آینده‌ی روشن · ۰۶ / ۰۶',
		title: 'عددها روشن‌اند؛\nقدم بعدی با توست.',
		description: 'نمودار، سند و اثر مالی کنار هم‌اند؛ از این‌جا وارد مرکز مالی آسومی شو.',
		detail: 'از پرسیدن تا تصمیم‌گرفتن، مسیرت روشن‌تر است.',
	},
] as const;
