export type ModuleRecord = {
  label: string;
  source?: string;
  path?: string;
};

export type ProductModuleDetails = {
  entryPath: string;
  entryLabel: string;
  records: readonly ModuleRecord[];
  boundary: string;
  relatedIds: readonly string[];
};

export const productModuleDetails: Readonly<Record<string, ProductModuleDetails>> = {
  finance: {
    entryPath: '/modules/finance', entryLabel: 'ورود به مرکز مالی',
    records: [
      { label: 'سند حسابداری', source: 'Journal Entry' },
      { label: 'فاکتور فروش و خرید', source: 'Sales / Purchase Invoice' },
      { label: 'دریافت و پرداخت', source: 'Payment Entry' },
      { label: 'تراکنش و تطبیق بانکی', source: 'Bank Transaction' },
    ],
    boundary: 'فروش، خرید و انبار سندهای عملیاتی خودشان را دارند؛ اثر مالی آن‌ها در این بخش ثبت و گزارش می‌شود.',
    relatedIds: ['sales', 'procurement', 'inventory'],
  },
  sales: {
    entryPath: '/modules/sales', entryLabel: 'ورود به مرکز فروش',
    records: [
      { label: 'پیش‌فاکتور', source: 'Quotation' },
      { label: 'سفارش فروش', source: 'Sales Order' },
      { label: 'تحویل کالا', source: 'Delivery Note' },
      { label: 'فاکتور فروش', source: 'Sales Invoice' },
    ],
    boundary: 'سرنخ‌ها و پیگیری رابطه با مشتری در CRM مدیریت می‌شوند؛ اینجا مسیر سفارش، تحویل و فاکتور را دنبال می‌کنی.',
    relatedIds: ['crm', 'inventory', 'finance'],
  },
  crm: {
    entryPath: '/crm/pipeline', entryLabel: 'ورود به قیف CRM',
    records: [
      { label: 'سرنخ', source: 'CRM Lead', path: '/crm/leads' },
      { label: 'فرصت فروش', source: 'CRM Deal', path: '/crm/pipeline' },
      { label: 'فعالیت و پیگیری', source: 'CRM Task', path: '/crm/activities' },
      { label: 'گزارش تماس‌ها', source: 'CRM Call Log', path: '/crm/call-logs' },
    ],
    boundary: 'این بخش رابطه، سرنخ و فرصت را نگه می‌دارد؛ سفارش قطعی، تحویل و فاکتور در ماژول فروش ادامه پیدا می‌کنند.',
    relatedIds: ['sales', 'growth', 'business'],
  },
  procurement: {
    entryPath: '/modules/procurement', entryLabel: 'ورود به مرکز خرید',
    records: [
      { label: 'درخواست خرید', source: 'Material Request' },
      { label: 'استعلام قیمت', source: 'Request for Quotation' },
      { label: 'سفارش خرید', source: 'Purchase Order' },
      { label: 'رسید و فاکتور خرید', source: 'Purchase Receipt / Invoice' },
    ],
    boundary: 'انتخاب تأمین‌کننده و سفارش در خرید انجام می‌شود؛ ثبت موجودی دریافتی با انبار و اثر پرداخت با مالی پیوند دارد.',
    relatedIds: ['inventory', 'finance', 'business'],
  },
  inventory: {
    entryPath: '/modules/inventory', entryLabel: 'ورود به مرکز انبار',
    records: [
      { label: 'کالا و خدمت', source: 'Item' },
      { label: 'انبار', source: 'Warehouse' },
      { label: 'گردش موجودی', source: 'Stock Entry' },
      { label: 'تطبیق و شمارش', source: 'Stock Reconciliation' },
    ],
    boundary: 'انبار مقدار و جابه‌جایی کالا را پیگیری می‌کند؛ سفارش مشتری و سفارش تأمین از مسیر فروش و خرید آغاز می‌شوند.',
    relatedIds: ['sales', 'procurement', 'manufacturing'],
  },
  projects: {
    entryPath: '/modules/projects', entryLabel: 'ورود به مرکز پروژه',
    records: [
      { label: 'پروژه', source: 'Project' },
      { label: 'وظیفه', source: 'Task' },
      { label: 'ثبت زمان', source: 'Timesheet' },
      { label: 'گزارش پیشرفت', source: 'Project Update' },
    ],
    boundary: 'برنامه و پیشرفت کار در پروژه پیگیری می‌شود؛ ثبت سندهای مالی و فروش خدمات به ماژول‌های مالی و فروش متصل است.',
    relatedIds: ['finance', 'people', 'business'],
  },
  manufacturing: {
    entryPath: '/modules/manufacturing', entryLabel: 'ورود به مرکز تولید',
    records: [
      { label: 'ساختار محصول', source: 'BOM' },
      { label: 'دستور تولید', source: 'Work Order' },
      { label: 'کارت عملیات', source: 'Job Card' },
      { label: 'درخواست مواد', source: 'Material Request' },
    ],
    boundary: 'برنامه و اجرای تولید اینجاست؛ مقدار مواد و محصول با گردش انبار هماهنگ می‌شود و بازرسی به کیفیت می‌رسد.',
    relatedIds: ['inventory', 'quality', 'pricing'],
  },
  quality: {
    entryPath: '/modules/quality', entryLabel: 'ورود به مرکز کیفیت',
    records: [
      { label: 'بازرسی کیفیت', source: 'Quality Inspection' },
      { label: 'روش و معیار بازرسی' },
      { label: 'معیار و هدف کیفیت', source: 'Quality Goal' },
      { label: 'عدم‌انطباق', source: 'Non Conformance' },
    ],
    boundary: 'نتیجه‌ی بازرسی و اقدام اصلاحی در کیفیت ثبت می‌شود؛ پذیرش کالا یا ادامه‌ی تولید به گردش انبار و تولید وابسته است.',
    relatedIds: ['manufacturing', 'inventory', 'assets'],
  },
  people: {
    entryPath: '/modules/hr', entryLabel: 'ورود به منابع انسانی',
    records: [
      { label: 'پرونده‌ی همکار', source: 'Employee' },
      { label: 'حضور و کارکرد', source: 'Attendance' },
      { label: 'درخواست مرخصی', source: 'Leave Application' },
      { label: 'فیش حقوق', source: 'Salary Slip' },
    ],
    boundary: 'اطلاعات همکار و کارکرد در منابع انسانی نگهداری می‌شود؛ اثر نهایی پرداخت حقوق با تنظیمات مالی شرکت هماهنگ است.',
    relatedIds: ['finance', 'projects', 'business'],
  },
  assets: {
    entryPath: '/modules/assets', entryLabel: 'ورود به مرکز دارایی',
    records: [
      { label: 'پرونده‌ی دارایی', source: 'Asset' },
      { label: 'جابه‌جایی دارایی', source: 'Asset Movement' },
      { label: 'برنامه‌ی نگهداری', source: 'Asset Maintenance' },
      { label: 'تعمیر و خرابی', source: 'Maintenance Request' },
    ],
    boundary: 'چرخه‌ی عمر و نگهداری دارایی در این بخش است؛ خرید اولیه و ثبت استهلاک با مسیر خرید و مالی پیوند دارند.',
    relatedIds: ['finance', 'procurement', 'fleet'],
  },
  fleet: {
    entryPath: '/fleet', entryLabel: 'ورود به مدیریت ناوگان',
    records: [
      { label: 'خودرو', source: 'Vehicle' },
      { label: 'راننده', source: 'Driver' },
      { label: 'درخواست سفر و مأموریت', source: 'Fleet Trip Request' },
      { label: 'سرویس و هزینه', source: 'Vehicle Log' },
    ],
    boundary: 'تخصیص خودرو، سفر و سرویس در ناوگان دنبال می‌شود؛ پرداخت‌ها و ثبت هزینه در ماژول مالی انجام می‌شوند.',
    relatedIds: ['assets', 'finance', 'people'],
  },
  pricing: {
    entryPath: '/modules/pricing', entryLabel: 'ورود به مرکز قیمت‌گذاری',
    records: [
      { label: 'فهرست قیمت', source: 'Price List' },
      { label: 'قیمت کالا', source: 'Item Price' },
      { label: 'قاعده‌ی قیمت‌گذاری', source: 'Pricing Rule' },
      { label: 'تصمیم قیمت و هزینه', source: 'Business Pricing Decision' },
    ],
    boundary: 'تحلیل و آماده‌سازی قیمت در این بخش انجام می‌شود؛ قیمت تأییدشده در فرایند فروش و خرید مصرف می‌شود.',
    relatedIds: ['sales', 'procurement', 'business'],
  },
  growth: {
    entryPath: '/modules/marketing', entryLabel: 'ورود به مرکز بازاریابی',
    records: [
      { label: 'برنامه و هدف بازاریابی', source: 'Marketing Plan / Objective', path: '/marketing/plans' },
      { label: 'کمپین', source: 'Marketing Campaign Brief', path: '/marketing/campaigns' },
      { label: 'محتوا', source: 'Marketing Content', path: '/marketing/content' },
      { label: 'بودجه و شاخص', source: 'Marketing Budget / Metric', path: '/marketing/budgets' },
    ],
    boundary: 'بازاریابی بازار، برند، کمپین و نتیجه را می‌سنجد؛ برنامه‌ی جامع و سناریوی رشد در «کسب‌وکار» و ثبت قطعی وجه در «مالی» است.',
    relatedIds: ['business', 'crm', 'finance'],
  },
  business: {
    entryPath: '/business/overview', entryLabel: 'ورود به نمای کلی کسب‌وکار',
    records: [
      { label: 'پرونده‌ی کسب‌وکار', source: 'Business Venture', path: '/business/ventures' },
      { label: 'برنامه‌ی کسب‌وکار', source: 'Business Plan', path: '/business/plans' },
      { label: 'سناریو و مفروضات', source: 'Business Planning Scenario', path: '/business/scenarios' },
      { label: 'هدف و شاخص کلیدی', source: 'Business Strategic Goal / KPI', path: '/business/kpis' },
    ],
    boundary: 'این بخش برای جهت، برنامه و سناریو است؛ ثبت واقعی فروش و هزینه در ماژول‌های فروش و مالی می‌ماند تا برنامه با واقعیت مقایسه شود.',
    relatedIds: ['growth', 'finance', 'sales'],
  },
  restaurant: {
    entryPath: '/modules/restaurant', entryLabel: 'ورود به مرکز رستوران',
    records: [
      { label: 'سفارش حضوری و بیرون‌بر', source: 'Restaurant Order' },
      { label: 'صورتحساب صندوق', source: 'POS Invoice' },
      { label: 'میز و رزرو', source: 'Restaurant Table / Table Reservation' },
      { label: 'سفارش آشپزخانه', source: 'Restaurant Table Order' },
    ],
    boundary: 'سفارش، سالن و صندوق در عملیات رستوران‌اند؛ موجودی مواد و ثبت مالی نهایی به انبار و مالی پیوند می‌خورند.',
    relatedIds: ['inventory', 'finance', 'sales'],
  },
};
