export type ProcurementPreviewRange = 'month' | 'quarter' | 'year';
export type ProcurementPreviewView = 'overview' | 'orders' | 'analysis';

export const procurementPreviewRanges: Record<ProcurementPreviewRange, {
	label: string;
	caption: string;
	metrics: readonly { label: string; value: string; detail: string }[];
	trend: readonly { label: string; height: number }[];
}> = {
	month: {
		label: 'ماه جاری', caption: 'شهریور ۱۴۰۵',
		metrics: [
			{ label: 'سفارش‌های باز', value: '۱۲', detail: '۳ مورد نیازمند پیگیری' },
			{ label: 'در انتظار دریافت', value: '۴', detail: '۲ تحویل در این هفته' },
			{ label: 'تأمین‌کنندگان فعال', value: '۳۸', detail: '۶ تأمین‌کننده‌ی برتر' },
			{ label: 'دریافت به‌موقع', value: '۹۲٪', detail: 'در بازه‌ی انتخاب‌شده' },
		],
		trend: [
			{ label: 'فروردین', height: 42 }, { label: 'اردیبهشت', height: 57 }, { label: 'خرداد', height: 49 },
			{ label: 'تیر', height: 72 }, { label: 'مرداد', height: 62 }, { label: 'شهریور', height: 88 },
		],
	},
	quarter: {
		label: 'سه‌ماهه', caption: 'تیر تا شهریور ۱۴۰۵',
		metrics: [
			{ label: 'سفارش‌های باز', value: '۳۴', detail: '۸ مورد نیازمند پیگیری' },
			{ label: 'در انتظار دریافت', value: '۱۱', detail: '۵ تحویل در این هفته' },
			{ label: 'تأمین‌کنندگان فعال', value: '۶۱', detail: '۹ تأمین‌کننده‌ی برتر' },
			{ label: 'دریافت به‌موقع', value: '۸۹٪', detail: 'در بازه‌ی انتخاب‌شده' },
		],
		trend: [
			{ label: 'تیر', height: 58 }, { label: 'مرداد', height: 73 }, { label: 'شهریور', height: 88 },
		],
	},
	year: {
		label: 'سال جاری', caption: 'فروردین تا شهریور ۱۴۰۵',
		metrics: [
			{ label: 'سفارش‌های باز', value: '۱۲۶', detail: '۱۹ مورد نیازمند پیگیری' },
			{ label: 'در انتظار دریافت', value: '۲۸', detail: '۱۰ تحویل در این هفته' },
			{ label: 'تأمین‌کنندگان فعال', value: '۸۶', detail: '۱۲ تأمین‌کننده‌ی برتر' },
			{ label: 'دریافت به‌موقع', value: '۹۱٪', detail: 'در بازه‌ی انتخاب‌شده' },
		],
		trend: [
			{ label: 'فروردین', height: 42 }, { label: 'اردیبهشت', height: 57 }, { label: 'خرداد', height: 49 },
			{ label: 'تیر', height: 72 }, { label: 'مرداد', height: 62 }, { label: 'شهریور', height: 88 },
		],
	},
};

export const procurementPreviewOrders = [
	{ id: 'PO-1405-00128', supplier: 'تأمین آریا', due: '۳۰ شهریور', total: '۸۰٬۴۰۰٬۰۰۰', status: 'در مسیر دریافت', tone: 'progress' },
	{ id: 'PO-1405-00124', supplier: 'پارس‌تأمین', due: '۲۸ شهریور', total: '۴۲٬۷۰۰٬۰۰۰', status: 'نیازمند پیگیری', tone: 'attention' },
	{ id: 'PO-1405-00119', supplier: 'صنعت نوین', due: '۲۵ شهریور', total: '۲۶٬۲۰۰٬۰۰۰', status: 'رسید ثبت شد', tone: 'complete' },
] as const;

export const procurementPreviewActions = [
	{ title: '۲ پیشنهاد قیمت منتظر بررسی است', detail: 'استعلام RFQ-1405-008 · انتخاب تأمین‌کننده', action: 'بررسی پیشنهادها', tone: 'attention' },
	{ title: '۲ قلم در انتظار کنترل کیفیت', detail: 'رسید PR-1405-0038 · انبار مرکزی', action: 'بررسی رسید', tone: 'progress' },
	{ title: 'یک اختلاف در تطبیق فاکتور', detail: 'فاکتور PI-1405-0091 · پیش از پرداخت', action: 'مشاهده‌ی مغایرت', tone: 'attention' },
] as const;

export const procurementPreviewSuppliers = [
	{ name: 'تأمین آریا', rate: '۹۸٪', width: 98, detail: 'تحویل به‌موقع · ۱۲ سفارش' },
	{ name: 'صنعت نوین', rate: '۹۴٪', width: 94, detail: 'تحویل به‌موقع · ۹ سفارش' },
	{ name: 'پارس‌تأمین', rate: '۸۷٪', width: 87, detail: 'تحویل به‌موقع · ۷ سفارش' },
] as const;
