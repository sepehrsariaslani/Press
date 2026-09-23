export const chapters = [
  { id: 'chaos', label: 'آشفتگی', eyebrow: 'یک روز آشنا در کسب‌وکار', title: 'وقتی همه‌چیز\nروی دوش توست.', description: 'فاکتورهای ناتمام، عددهای پراکنده، سؤال‌های بی‌جواب. گاهی میان این همه کار، تصویر بزرگ‌تر گم می‌شود.', detail: 'این روز می‌تواند جور دیگری ادامه پیدا کند.' },
  { id: 'order', label: 'نظم', eyebrow: 'اول، کمی جای نفس کشیدن', title: 'همه‌چیز\nسر جای خودش.', description: 'فروش، هزینه، موجودی و حساب‌ها، دیگر داستان‌های جداگانه نیستند. تکه‌های کسب‌وکارت، کنار هم قرار می‌گیرند.', detail: 'از کاغذهای پراکنده، به یک تصویر یکپارچه.' },
  { id: 'clarity', label: 'وضوح', eyebrow: 'تصویر بزرگ‌تر، بالاخره پیداست', title: 'جواب،\nروبه‌روی توست.', description: 'دیگر لازم نیست دنبال جواب بگردی. میان گزارش‌های ساده و روشن، می‌بینی کجا ایستاده‌ای و قدم بعدی چیست.', detail: 'عدد کمتر روی صفحه؛ معنای بیشتر برای تصمیم.' },
  { id: 'intelligence', label: 'درک', eyebrow: 'یک همراه که حواسش هست', title: 'فقط ثبت نمی‌کند.\nدرک می‌کند.', description: 'از دل عددها، نشانه‌ها پیدا می‌شوند. یک موعد نزدیک، یک تغییر مهم، یک فرصت برای تصمیم به‌موقع.', detail: 'چیزهای مهم، پیش از آن‌که از چشم دور بمانند.' },
  { id: 'automation', label: 'جریان', eyebrow: 'کارهای تکراری، در یک مسیر روان', title: 'کارها پیش می‌روند.\nتو فرصت فکرکردن داری.', description: 'ثبت فاکتور، به‌روزرسانی موجودی، آماده‌شدن یادآوری. کارها به هم وصل می‌شوند؛ بدون دوباره‌کاری، بدون رفت‌وبرگشت.', detail: 'وقتت را برای ساختن نگه دار، نه تکرارکردن.' },
  { id: 'calm', label: 'آرامش', eyebrow: 'آسومی، برای فردایی روشن', title: 'آینده‌ی کسب‌وکارت\nنباید مبهم باشد.', description: 'همه‌چیز سر جای خودش است. چند شاخص روشن، تصمیم‌هایی مطمئن‌تر، و کمی آرامش برای تو.', detail: 'یک شروع روشن، از همین‌جا.' },
] as const;

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
export function transition(start: number, end: number, progress: number) {
  const t = clamp((progress - start) / (end - start));
  return t * t * (3 - 2 * t);
}
export const chapterAt = (progress: number) => Math.round(clamp(progress) * (chapters.length - 1));
