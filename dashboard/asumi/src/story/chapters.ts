export const chapters = [
  { id: 'chaos', label: 'کشف', eyebrow: 'پرونده‌ی باز: کسب‌وکار تو', title: 'وقتی همه‌چیز\nروی دوش توست.', description: 'فاکتورهای ناتمام، عددهای پراکنده، سؤال‌های بی‌جواب. جواب جایی میان همین اسناد است؛ فقط هنوز دیده نمی‌شود.', detail: 'نور را روی اسناد ببر. هر کدام یک سرنخ دارند.' },
  { id: 'order', label: 'نظم', eyebrow: 'سرنخ‌ها را کنار هم بگذار', title: 'همه‌چیز\nسر جای خودش.', description: 'فروش، هزینه، موجودی و دریافت‌ها روی یک بورد جمع می‌شوند. هر سند جای خودش را پیدا می‌کند؛ هیچ تکه‌ای گم نمی‌شود.', detail: 'یک بورد. یک تصویر. تمام کسب‌وکار.' },
  { id: 'connections', label: 'ارتباط', eyebrow: 'داستان، میان ارتباط‌هاست', title: 'هیچ عددی\nتنها نیست.', description: 'این فروش به آن دریافت وصل است. آن هزینه روی موجودی اثر می‌گذارد. نخ‌های پنهان پیدا می‌شوند و تصویر کامل‌تر می‌شود.', detail: 'از سندهای جدا، به یک داستان پیوسته.' },
  { id: 'clarity', label: 'وضوح', eyebrow: 'شواهد، حالا معنا دارند', title: 'جواب،\nروبه‌روی توست.', description: 'اسناد به نمودار تبدیل می‌شوند. می‌بینی چه اتفاقی افتاده، گلوگاه کجاست و کدام تصمیم می‌تواند مسیر را عوض کند.', detail: 'فقط دیدن عددها کافی نیست؛ باید مسیر را دید.' },
  { id: 'direction', label: 'مسیر', eyebrow: 'قدم بعدی، دیگر حدس نیست', title: 'حالا می‌دانی\nبه کدام سمت بروی.', description: 'وضعیت امروز، اولویت فردا و اقدام بعدی روی یک مسیر قرار می‌گیرند. مثلاً از دریافت‌های معوق، به پیگیری فاکتورها و جریان نقدی روشن‌تر.', detail: 'وضعیت ← اولویت ← اقدام ← مقصد' },
  { id: 'calm', label: 'مقصد', eyebrow: 'آسومی؛ از داده تا تصمیم', title: 'آینده‌ی کسب‌وکارت\nنباید مبهم باشد.', description: 'پرونده روشن است. ارتباط‌ها پیدا شده‌اند و مسیر پیش روی توست. حالا می‌توانی با دید باز، قدم بعدی را برداری.', detail: 'مقصد روشن‌تر. تصمیم آگاهانه‌تر.' },
] as const;

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
export function transition(start: number, end: number, progress: number) {
  const t = clamp((progress - start) / (end - start));
  return t * t * (3 - 2 * t);
}
export const chapterAt = (progress: number) => Math.round(clamp(progress) * (chapters.length - 1));
