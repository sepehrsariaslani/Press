export type Evidence = {
  title: string; tag: string; value: string; note: string;
  width: number; height: number; scattered: [number, number, number]; pinned: [number, number, number];
};

export const evidence: Evidence[] = [
  { title: 'فاکتور فروش', tag: 'سند ۰۱', value: '۲۴۸٬۰۰۰٬۰۰۰', note: 'فروش این ماه · ریال', width: 170, height: 215, scattered: [205, 195, -16], pinned: [205, 260, -5] },
  { title: 'رسید دریافت', tag: 'سند ۰۲', value: '۸۷٪', note: 'دریافت‌شده', width: 150, height: 190, scattered: [510, 145, 12], pinned: [488, 260, 4] },
  { title: 'گردش حساب', tag: 'سند ۰۳', value: '۱۸۶٬۰۰۰٬۰۰۰', note: 'مانده‌ی حساب · ریال', width: 170, height: 215, scattered: [820, 225, -10], pinned: [785, 265, -4] },
  { title: 'سند هزینه', tag: 'سند ۰۴', value: '۶۲٬۰۰۰٬۰۰۰', note: 'هزینه‌های عملیاتی', width: 150, height: 172, scattered: [140, 485, 17], pinned: [192, 540, 7] },
  { title: 'موجودی انبار', tag: 'سند ۰۵', value: '۱۲۴', note: 'قلم کالا', width: 150, height: 173, scattered: [460, 426, -9], pinned: [487, 536, -3] },
  { title: 'دریافت‌های معوق', tag: 'سند ۰۶', value: '۳ فاکتور', note: 'نیازمند پیگیری', width: 166, height: 196, scattered: [828, 572, 16], pinned: [787, 534, 5] },
  { title: 'این عدد چرا؟', tag: 'یک سؤال', value: '؟', note: 'سرنخ بعدی کجاست؟', width: 125, height: 110, scattered: [327, 663, -12], pinned: [344, 431, -9] },
  { title: 'قدم بعدی', tag: 'یادداشت', value: '…', note: 'هنوز مشخص نیست', width: 125, height: 110, scattered: [662, 682, 10], pinned: [643, 425, 8] },
];

export const connections = [[0, 1], [1, 5], [5, 2], [0, 3], [3, 4], [4, 2], [6, 0], [6, 5], [7, 1], [7, 4]];
export const routePoints = [
  { x: 808, y: 433, title: 'وضعیت امروز', subtitle: 'دریافت‌های معوق' },
  { x: 577, y: 488, title: 'اولویت', subtitle: '۳ فاکتور باز' },
  { x: 365, y: 442, title: 'اقدام', subtitle: 'پیگیری دریافت‌ها' },
  { x: 190, y: 562, title: 'مقصد', subtitle: 'جریان نقدی روشن‌تر' },
];
export const routePath = 'M808 433 C750 433 675 488 577 488 S430 442 365 442 S190 476 190 562';
