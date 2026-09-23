export const chapters = [
  { id: 'chaos', label: 'کشف', eyebrow: 'وقتی اطلاعات پراکنده‌اند', title: 'اطلاعات کسب‌وکارت\nپراکنده است؟', description: 'فروش، حساب‌ها و موجودی در ابزارهای جدا؛ تصویر کامل کسب‌وکار گم می‌شود.', detail: 'آسومی این جریان‌ها را در یک ERP به هم وصل می‌کند.' },
  { id: 'order', label: 'نظم', eyebrow: 'همه‌ی عملیات، در یک سامانه', title: 'همه‌ی کارها،\nدر یک‌جا.', description: 'فروش، خرید، حسابداری و انبار را در یک سیستم ثبت و پیگیری کن.', detail: 'یک جریان منسجم؛ از ثبت تا پیگیری.' },
  { id: 'connections', label: 'ارتباط', eyebrow: 'حالا رابطه‌ها پیدا می‌شوند', title: 'هر عدد، بخشی از\nیک تصویر کامل است.', description: 'فاکتور به دریافتش، خرید به موجودی و هزینه به حساب‌هایش وصل می‌شود.', detail: 'رابطه‌ی هر رویداد، قابل‌ردیابی است.' },
  { id: 'clarity', label: 'وضوح', eyebrow: 'وضعیت کسب‌وکار، روشن‌تر', title: 'حالا می‌دانی\nکجا ایستاده‌ای.', description: 'گزارش‌ها نشان می‌دهند چه گذشته، چه چیزی باز مانده و کجا باید توجه کنی.', detail: 'فروش، دریافت، هزینه و موجودی؛ کنار هم.' },
  { id: 'direction', label: 'مسیر', eyebrow: 'از دانستن تا اقدام', title: 'قدم بعدی را\nآگاهانه بردار.', description: 'موارد باز را پیدا کن، اولویت بده، پیگیری کن و نتیجه را در گزارش‌ها ببین.', detail: 'وضعیت ← اولویت ← اقدام ← هدف' },
  { id: 'calm', label: 'مقصد', eyebrow: 'آسومی؛ ERP یکپارچه‌ی کسب‌وکار', title: 'یک تصویر کامل؛\nتصمیمی روشن‌تر.', description: 'فروش، خرید، حسابداری و موجودی را یک‌جا مدیریت کن و با دید روشن‌تر به هدفت برس.', detail: 'از عملیات روزانه تا تصمیم‌های مدیریتی.' },
] as const;

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
export function transition(start: number, end: number, progress: number) {
  const t = clamp((progress - start) / (end - start));
  return t * t * (3 - 2 * t);
}
export const chapterAt = (progress: number) => Math.round(clamp(progress) * (chapters.length - 1));
