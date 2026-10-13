# مدیریت قیمت خدمات آسومی در پنل — برنامهٔ پیاده‌سازی

> **برای اجرا:** این برنامه را در همین نشست و به‌صورت درون‌خطی، مرحله‌به‌مرحله اجرا کن؛ کار را به عامل‌های دیگر واگذار نکن. هر مرحله آزمون خودش را دارد و با commit فارسی تمام می‌شود.

**هدف:** قیمت تمام ماژول‌ها، افزونه و بسته‌های پیشنهادی صفحهٔ تعرفهٔ آسومی از پنل مدیر قابل تغییر باشد؛ صفحه و سرور از یک قیمت معتبر استفاده کنند و ثبت درخواست فقط سرنخ پیگیری با مبلغ محاسبه‌شدهٔ سمت سرور بسازد.

**معماری:** یک DocType تکی سه نقشهٔ قیمت را نگه می‌دارد. API عمومی فقط تعرفه‌ها را می‌خواند و API مدیر تعرفه را اعتبارسنجی و ذخیره می‌کند. صفحهٔ React قیمت‌ها را از همان API می‌گیرد؛ هنگام ثبت درخواست، سرور شناسه‌های ماژول و افزونه را اعتبارسنجی و مبلغ و جزئیات زمان‌دار را در `Erpyar Lead` ثبت می‌کند.

**فناوری:** Frappe/Press Python، DocType و patch؛ Asumi React/TypeScript/Vitest؛ پنل Press Vue 3، `frappe-ui` و Vitest.

## محدودیت‌های سراسری

- قیمت ۱۵ ماژول، افزونهٔ `restaurantMenu` و پنج بستهٔ `restaurant`، `restaurantPurchasing`، `professional`، `completeWithoutMenu` و `complete` از پنل کنترل می‌شود.
- مقادیر آغازین جدول مشخصات حفظ می‌شود؛ انتشار نباید تعرفهٔ فعلی را تغییر دهد.
- API عمومی و ثبت درخواست از تعرفه‌های ذخیره‌شده در سرور استفاده می‌کنند؛ مقدار و عنوان ارسالی مرورگر مرجع قیمت نیست.
- درخواست قیمت فقط پس از ورود ثبت می‌شود و snapshot نام ردیف‌ها، مبلغ ماهانه به تومان و زمان محاسبه را نگه می‌دارد.
- ثبت درخواست، Commerce Order، فاکتور، پرداخت زرین‌پال یا فعال‌سازی اشتراک ایجاد نمی‌کند.
- قیمت صحیح نامنفی، حداکثر ۱٬۰۰۰٬۰۰۰٬۰۰۰٬۰۰۰ تومان است؛ صفر به معنی رایگان است.
- قیمت دقیق بسته برای ترکیب منطبق، قیمت نهایی است؛ تخفیف منفی ثبت یا نمایش داده نمی‌شود.
- خطای API قیمت نباید باعث نمایش قیمت قدیمیِ داخل bundle یا فعال‌ماندن ثبت درخواست شود.
- این تغییر قیمت طراحی سایت، تعرفه‌های Marketplace و درگاه پرداخت را تغییر نمی‌دهد.

---

## نقشهٔ فایل‌ها

- `press/saas/commerce/service_pricing.py`: کاتالوگ معتبر سرور، اعتبارسنجی نقشه، تطبیق پیش‌نیاز و محاسبهٔ برآورد.
- `press/saas/commerce/test_service_pricing.py`: آزمون خالص منطق قیمت و ورودی‌های مرزی.
- `press/saas/doctype/asumi_service_pricing/asumi_service_pricing.json`: DocType تکی برای سه نقشهٔ JSON.
- `press/saas/doctype/asumi_service_pricing/asumi_service_pricing.py`: کلاس سند تکی.
- `press/patches/v0_8_0/seed_asumi_service_pricing.py` و `press/patches.txt`: seed یک‌باره و idempotent قیمت‌های فعلی.
- `press/saas/commerce/api.py`: endpoint عمومی خواندن، endpointهای مدیر و ثبت برآورد سروری.
- `press/saas/commerce/service_requests.py` و `press/saas/commerce/test_service_requests.py`: ساخت پیام snapshot و حفظ مسیر مستقل طراحی سایت.
- `press/saas/commerce/test_service_pricing_api.py`: آزمون seed و idempotency.
- `press/saas/commerce/test_service_pricing_endpoints.py`: دسترسی API، persistence، ثبت snapshot و عدم ساخت سفارش.
- `dashboard/asumi/src/product/pricing/catalog.ts`: فرادادهٔ نمایشی بدون قیمت مرجع سمت مرورگر.
- `dashboard/asumi/src/product/pricing/pricingApi.ts`: بارگذاری و اعتبارسنجی پاسخ عمومی قیمت.
- `dashboard/asumi/src/product/pricing/estimate.ts`: محاسبهٔ نمایشی بر پایهٔ نقشهٔ دریافتی از سرور.
- `dashboard/asumi/src/product/pricing/ModulePricingPage.tsx`, `PricingPresets.tsx`, `ModuleChooser.tsx`, `SelectedModuleDetail.tsx`: تزریق دادهٔ قیمت، وضعیت خطا و نمایش پویای همهٔ ارقام.
- `dashboard/asumi/src/product/serviceRequestRoute.ts`, `serviceRequestRoute.test.ts`, `useModuleNavigation.ts`: ارسال شناسه‌های ماژول/افزونه در URL، بدون مبلغ قابل اعتماد از مرورگر.
- `dashboard/asumi/src/App.test.tsx` و آزمون‌های تازهٔ قیمت: رفتار صفحه، تعرفه‌های سروری و نبود fallback.
- `dashboard/src/pages/CommerceOrders.vue`: فرم مدیریت قیمت خدمات و نمایش نتیجهٔ snapshot.
- `dashboard/src/utils/asumiServiceRequest.ts`, `asumiServiceRequest.test.ts`: خواندن امن شناسه‌های ارسال‌شده به پنل.
- `dashboard/src/utils/asumiServicePricing.ts`, `asumiServicePricing.test.ts`: تبدیل، اعتبارسنجی و ذخیرهٔ نقشهٔ مدیر در رابط.
- `dashboard/src/pages/CommerceOrders.test.ts`: آزمون بارگذاری/ذخیرهٔ پنل با منابع Frappe شبیه‌سازی‌شده.

---

### گام ۱: منطق خالص قیمت‌گذاری سمت سرور

**فایل‌ها:**
- بساز: `press/saas/commerce/service_pricing.py`
- بساز: `press/saas/commerce/test_service_pricing.py`

**رابط‌ها:**
- `default_service_prices() -> dict[str, dict[str, int]]` نقشهٔ آغازین `modules`, `addons`, `packages` را برمی‌گرداند.
- `normalize_service_prices(modules, addons, packages) -> dict[str, dict[str, int]]` فقط کلیدهای کاتالوگ و اعداد صحیح بین صفر و سقف را می‌پذیرد.
- `calculate_service_quote(module_ids, addon_ids, prices) -> dict` فهرست شناسه‌ها، سطرهای مبلغ، package ID اختیاری، جمع مستقل، تخفیف و مبلغ نهایی را برمی‌گرداند.

- [x] **گام ۱.۱: آزمون‌های قرمز را بنویس.** آزمون‌ها باید مقادیر آغازین ۱۵/۱/۵ را با جدول مشخصات تطبیق دهند؛ جمع `finance` و `sales` را برابر ۱۱٬۰۰۰٬۰۰۰ بگیرند؛ `professional` را دقیقاً ۹٬۹۰۰٬۰۰۰ بگیرند؛ بستهٔ کامل را ۵۰٬۰۰۰٬۰۰۰ بگیرند؛ و ورودی ناشناخته، تکراری، فهرست خالی، پیش‌نیاز جاافتاده، عدد منفی، اعشاری، رشته‌ای، سقف+۱ و map ناقص/اضافی را رد کنند.
- [x] **گام ۱.۲: آزمون را اجرا کن.** `python3 -m unittest press.saas.commerce.test_service_pricing -v` باید در ابتدا به علت نبود ماژول/توابع شکست بخورد.
- [x] **گام ۱.۳: منطق حداقلی را بساز.** شناسه‌های مجاز و پیش‌نیازها را در Python صریح تعریف کن؛ مقدارهای عددی را با `type(value) is int` کنترل کن تا `bool` پذیرفته نشود؛ برای هر سه map برابری دقیق کلیدها را لازم بدان؛ بسته فقط برای تطبیق دقیق مجموعهٔ ماژول/افزونه اعمال شود؛ `discount = max(listed_total - package_price, 0)` و `total = package_price` در تطبیق بسته وگرنه `listed_total` باشد.
- [x] **گام ۱.۴: آزمون را تکرار کن.** همان دستور باید همهٔ آزمون‌های منطق را سبز کند.
- [x] **گام ۱.۵: commit کن.** `git add press/saas/commerce/service_pricing.py press/saas/commerce/test_service_pricing.py && git commit -m "افزودن منطق محاسبه تعرفه خدمات آسومی"`

### گام ۲: ذخیرهٔ پایدار و seed مهاجرت

**فایل‌ها:**
- بساز: `press/saas/doctype/asumi_service_pricing/asumi_service_pricing.json`
- بساز: `press/saas/doctype/asumi_service_pricing/asumi_service_pricing.py`
- بساز: `press/patches/v0_8_0/seed_asumi_service_pricing.py`
- ویرایش: `press/patches.txt`
- بساز: `press/saas/commerce/test_service_pricing_api.py` و `press/saas/commerce/test_service_pricing_endpoints.py`

**رابط‌ها:** DocType از سه فیلد JSON متنی `module_prices`, `addon_prices`, `package_prices` و یک singleton استفاده می‌کند. تابع `seed_asumi_service_pricing()` فقط وقتی رکورد قیمت وجود ندارد، map آغازین گام ۱ را ذخیره می‌کند.

- [x] **گام ۲.۱: آزمون patch را بنویس.** با `unittest.mock`، اجرای دوبارهٔ seed را بررسی کن: بار اول باید سند را بسازد، بار دوم نباید مقدار دست‌کاری‌شده را بازنویسی کند.
- [x] **گام ۲.۲: آزمون را اجرا کن.** `python3 -m unittest press.saas.commerce.test_service_pricing_api -v` باید برای آزمون patch تا قبل از ایجاد فایل‌ها شکست بخورد.
- [x] **گام ۲.۳: DocType و patch را بساز.** هر سه JSON فیلد فقط JSON نقشه را نگه می‌دارند؛ API تنها writer است. DocType در `module: SaaS`, `issingle: 1` با مجوز خواندن مدیران Press/System Manager تعریف شود. ثبت patch را در بخش `[post_model_sync]` قرار بده تا جدول پس از همگام‌سازی مدل موجود باشد.
- [x] **گام ۲.۴: آزمون seed را سبز کن.** اجرای آزمون باید ساخت اولیه و idempotency را ثابت کند.
- [x] **گام ۲.۵: commit کن.** `git add press/saas/doctype/asumi_service_pricing press/patches/v0_8_0/seed_asumi_service_pricing.py press/patches.txt press/saas/commerce/test_service_pricing_api.py && git commit -m "افزودن ذخیره و مهاجرت تعرفه خدمات آسومی"`

### گام ۳: API عمومی، API مدیریت و snapshot ثبت درخواست

**فایل‌ها:**
- ویرایش: `press/saas/commerce/api.py`
- ویرایش: `press/saas/commerce/service_requests.py`
- ویرایش: `press/saas/commerce/test_service_requests.py`
- ویرایش: `press/saas/commerce/test_service_pricing_api.py`

**رابط‌ها:**
- `service_pricing() -> dict`: `@frappe.whitelist(allow_guest=True)`؛ فقط ۳ map قیمت معتبر را برمی‌گرداند.
- `admin_service_pricing() -> dict`: `_require_commerce_admin()` سپس همان map ذخیره‌شده را می‌دهد.
- `save_admin_service_pricing(module_prices: str, addon_prices: str, package_prices: str) -> dict`: POST-only، دسترسی مدیر، JSON parse، اعتبارسنجی map کامل و save اتمیک.
- `submit_service_request(..., module_ids: str = "[]", addon_ids: str = "[]") -> dict`: برای `module_pricing` مبلغ/عنوان `context` مرورگر را نادیده می‌گیرد؛ فقط IDها را parse و validate می‌کند و سرور snapshot ایجادشده را به builder می‌دهد. مسیر `website_design` همان context فعلی را نگه می‌دارد.

- [x] **گام ۳.۱: آزمون‌های دسترسی و رفتار را اضافه کن.** پاسخ عمومی نباید شامل تنظیمات دیگر باشد؛ نقش غیرمدیر read/write را رد کند؛ ورودی قیمت از مرورگر در snapshot اثری نداشته باشد؛ شناسهٔ دست‌کاری‌شده رد شود؛ snapshot شامل نام سطرها، تومان، مجموع و زمان باشد؛ endpoint فقط `Erpyar Lead` درج کند و هرگز `Commerce Order` نسازد؛ قیمت قبلی در Lead پس از تغییر تعرفه ثابت بماند.
- [x] **گام ۳.۲: آزمون‌های مشخص را اجرا کن.** آزمون‌های خالص را با `python3 -m unittest press.saas.commerce.test_service_requests -v` و آزمون endpoint را داخل Frappe Console با suite `press.saas.commerce.test_service_pricing_endpoints` اجرا کن؛ suite endpoint همهٔ دسترسی‌ها و persistence را mock می‌کند و نباید در دیتابیس چیزی بنویسد. پیش از پیاده‌سازی، هر دو گروه باید به علت قرارداد/endpointهای مفقود شکست بخورند.
- [x] **گام ۳.۳: endpointها را پیاده کن.** از `frappe.get_single("Asumi Service Pricing")` استفاده کن؛ خطای JSON یا map نامعتبر را به `frappe.throw` تبدیل کن؛ endpoint write را با `methods=["POST"]` ببند؛ پاسخ عمومی را فقط با کلیدهای ثابت و بدون دادهٔ Lead بساز.
- [x] **گام ۳.۴: builder را توسعه بده.** تابع `build_service_request_lead` برای `module_pricing` پیام را از `quote_snapshot` سمت سرور بسازد؛ `context` مرورگر را در این سرویس مصرف نکند. برای `website_design` رفتار، حد ۵۰۰۰ نویسه و پیام فعلی حفظ شود.
- [x] **گام ۳.۵: آزمون‌های Python را سبز کن.** همان دستور باید همهٔ تست‌های مربوط را پاس کند.
- [x] **گام ۳.۶: commit کن.** `git add press/saas/commerce/api.py press/saas/commerce/service_requests.py press/saas/commerce/test_service_requests.py press/saas/commerce/test_service_pricing_endpoints.py && git commit -m "افزودن API امن تعرفه و برآورد خدمات آسومی"`

### گام ۴: قیمت پویا در صفحهٔ عمومی و انتقال امن انتخاب

**فایل‌ها:**
- بساز: `dashboard/asumi/src/product/pricing/pricingApi.ts` و `pricingApi.test.ts`
- ویرایش: `dashboard/asumi/src/product/pricing/catalog.ts`, `estimate.ts`, `PricingPresets.tsx`, `ModuleChooser.tsx`, `SelectedModuleDetail.tsx`, `ModulePricingPage.tsx`
- ویرایش: `dashboard/asumi/src/product/serviceRequestRoute.ts`, `serviceRequestRoute.test.ts`, `product/useModuleNavigation.ts`, `App.test.tsx`

**رابط‌ها:** `ServicePriceMap` در TypeScript شامل سه `Record<string, number>` متناظر API است. `loadServicePrices(fetcher = fetch)` فقط نقشهٔ کامل با شناسه‌های کاتالوگ و قیمت عددی مجاز را می‌پذیرد. `estimateSelection(moduleIds, addonIds, prices)` باید تمام جمع‌ها را از همین map بسازد. `buildServiceRequestHref(service, context, moduleIds, addonIds)` برای `module_pricing` فقط IDها را بفرستد؛ برای طراحی سایت، context قبلی را حفظ کند. `openOrderCenter(moduleIds, context, service, addonIds)` شناسه‌های افزونه را تا URL منتقل کند.

- [x] **گام ۴.۱: آزمون‌های قرمز UI/data را بنویس.** fetch موفق با map کامل، پاسخ ناقص، HTTP ناموفق و JSON نامعتبر را پوشش بده؛ قیمت بسته‌ها و تخفیف exact match را با تغییر map بررسی کن؛ URL باید module/addon ID بفرستد و مبلغ یا context قیمت‌گذاری در query نداشته باشد؛ یک تست `App.test.tsx` نشان دهد تا زمان موفقیت API قیمت نمایش داده و ثبت درخواست غیرفعال است.
- [x] **گام ۴.۲: Vitest هدفمند را اجرا کن.** از پوشهٔ `dashboard/asumi` دستور `yarn test --run src/product/pricing/pricingApi.test.ts src/product/serviceRequestRoute.test.ts` را اجرا کن؛ آزمون‌های تازه باید پیش از پیاده‌سازی شکست بخورند.
- [x] **گام ۴.۳: دریافت قیمت و محاسبه را پیاده کن.** قیمت عددی را از `catalog.ts` حذف کن و فقط عنوان/شناسه/ترکیب‌ها را نگه دار؛ fetch را به `/api/method/press.saas.commerce.api.service_pricing` بزن و envelope `message` را بخوان؛ هیچ قیمت محلی جایگزین نکن.
- [x] **گام ۴.۴: قیمت را به تمام اجزای قیمت‌گذاری تزریق کن.** همهٔ ردیف‌های ماژول، افزونه، کارت بسته، جزئیات، نشان ۵۰ میلیونی و متن پایانی را dynamic کن. `pricingNotice` رقم ثابت نداشته باشد؛ متن بستهٔ حرفه‌ای و دو حالت بستهٔ کامل با formatter ساخته شوند.
- [x] **گام ۴.۵: وضعیت loading/error را کامل کن.** تا پاسخ معتبر، اعداد قیمت و دکمهٔ درخواست نمایش/فعال نشوند؛ در خطا پیام فارسی قابل فهم بده و دکمه را غیرفعال نگه دار.
- [x] **گام ۴.۶: مسیر انتخاب را به API پنل وصل کن.** query `modules` و `addons` را بخوان و فقط array امن بساز. `openOrderCenter(moduleIds, context, service, addonIds)` شناسه‌ها را منتقل کند؛ درخواست طراحی سایت همچنان context فعلی خودش را بفرستد.
- [x] **گام ۴.۷: آزمون‌ها و کل Vitest آسومی را اجرا کن.** `cd dashboard/asumi && yarn test --run` باید همهٔ تست‌های پیشین و جدید را پاس کند.
- [x] **گام ۴.۸: commit کن.** `git add dashboard/asumi/src && git commit -m "نمایش تعرفه‌های زنده آسومی در صفحه خدمات"`

### گام ۵: پنل ویرایش تعرفه و ارسال selection به سرور

**فایل‌ها:**
- بساز: `dashboard/src/utils/asumiServicePricing.ts` و `asumiServicePricing.test.ts`
- ویرایش: `dashboard/src/pages/CommerceOrders.vue`
- ویرایش: `dashboard/src/utils/asumiServiceRequest.ts` و `asumiServiceRequest.test.ts`
- بساز: `dashboard/src/pages/CommerceOrders.test.ts`

**رابط‌ها:** `parseAsumiServiceRequest(search)` علاوه بر `service`, `context`, `moduleIds`, فیلد `addonIds: string[]` بدهد. پنل مدیر map کامل را با `admin_service_pricing` بخواند و با `save_admin_service_pricing` ذخیره کند. submit درخواست `module_ids` و `addon_ids` بفرستد؛ `context` فقط برای `website_design` فرستاده شود.

- [x] **گام ۵.۱: آزمون‌های منطق و build رابط را آماده کن.** helper اعداد فارسی، map ناقص/اضافی/سقف قیمت و payload ذخیره را آزمون می‌کند. آزمون mount رابط به‌دلیل ناسازگاری Vitest 0.9.4 با پلاگین Vue/Vite 8 اجراشدنی نبود؛ build کامل پنل قالب Vue را کامپایل کرد.
- [x] **گام ۵.۲: آزمون‌های هدفمند را اجرا کن.** از پوشهٔ `dashboard` آزمون‌های `asumiServicePricing.test.ts` و `asumiServiceRequest.test.ts` اجرا شدند و با ۶ آزمون موفق تمام شدند.
- [x] **گام ۵.۳: helper و parser را پیاده کن.** queryهای malformed یا بیش از سقف ID را رد کن؛ در submit module request فقط arrayهای ID را ارسال کن و هیچ مبلغ/عنوان client-side نفرست.
- [x] **گام ۵.۴: بخش قیمت‌ها را در ناحیهٔ مدیر پنل اضافه کن.** یک بخش فارسی «تعرفهٔ خدمات صفحهٔ آسومی» با سه گروه ماژول‌ها، افزونه و بسته‌ها بساز؛ برای هر مورد label و ورودی number با سقف ۱٬۰۰۰٬۰۰۰٬۰۰۰٬۰۰۰ تومان، دکمهٔ بارگذاری و ذخیره، حالت loading و خطای مستقل داشته باش. مقدار صفر با برچسب «رایگان» توضیح داده شود.
- [x] **گام ۵.۵: فرم ثبت درخواست را وصل کن.** شناسه‌های query به endpoint برسند؛ context دلخواه مشتری برای module pricing فرستاده نشود؛ پس از پاسخ، شمارهٔ سرنخ و مبلغ بازگشتی سرور نمایش داده شود؛ بدون login متن ورود فعلی حفظ شود.
- [x] **گام ۵.۶: آزمون‌ها و build پنل را اجرا کن.** مجموعهٔ کامل Vitest پنل با ۴۴ آزمون موفق شد و build تولیدی Press Dashboard نیز کامل شد.
- [x] **گام ۵.۷: commit کن.** انجام شد: `307bec1f5 افزودن مدیریت تعرفه خدمات در پنل آسومی`.

### گام ۶: آزمون کامل، build، انتشار و بررسی زنده

**فایل‌ها:** تغییرات همهٔ مراحل پیشین؛ فایل جدیدی برای secrets نساز.

- [x] **گام ۶.۱: بررسی اختلاف‌ها و تاریخچه را انجام بده.** تاریخچه شامل commitهای مراحل پیشین است؛ `git diff --check` پاک بود و تنها تغییر تولیدیِ باقی‌مانده پس از build، referenceهای تازهٔ shell آسومی در `press/www/asumi.html` بود.
- [x] **گام ۶.۲: آزمون Python را اجرا کن.** ۱۸ آزمون منطق خالص و seed با `python3 -m unittest press.saas.commerce.test_service_pricing press.saas.commerce.test_service_requests press.saas.commerce.test_service_pricing_api -v` موفق شد. suite endpoint با ۱۰ آزمون mock در Frappe Console نیز هنگام اجرا موفق شد؛ این suite نوشتن واقعی در سایت ندارد.
- [x] **گام ۶.۳: آزمون و build هر دو رابط را اجرا کن.** `dashboard/asumi`: typecheck و ۶۸ آزمون Vitest موفق؛ Press Dashboard: ۴۴ آزمون Vitest موفق؛ `yarn build` در ریشهٔ Press موفق و هر دو رابط، CSS و shell را ساخت.
- [x] **گام ۶.۴: نسخه و منابع را پیش از انتشار ثبت کن.** پشتیبان کامل دیتابیس و فایل‌های عمومی/خصوصی Asumi ساخته و صحت gzip/tar و JSON بررسی شد. در زمان انتشار حدود ۹٫۷ گیگابایت فضای آزاد ثبت شد.
- [x] **گام ۶.۵: migration و دارایی‌ها را منتشر کن.** patch `seed_asumi_service_pricing` روی سایت اجرا شد؛ workerهای وب با HUP نرم فعال شدند. پس از آن `dehati.ir`، `denroom.ir` و `veederakht.ir` با HTTP 200 بررسی شدند. `boller.ir` هنوز دامنهٔ ثبت‌شده/قابل resolve نیست.
- [x] **گام ۶.۶: smoke test زنده بگیر.** صفحهٔ اصلی و `/dashboard/orders` و assetهای build با HTTP 200 پاسخ دادند. API عمومی HTTP 200 داد و هر ۲۱ مقدار آن دقیقاً با seed اولیه برابر بود. API مدیریت بدون نشست HTTP 403 داد. chunk پنل شامل endpointهای خواندن و ذخیرهٔ تعرفه بود؛ Playwright قبلاً نمایش قیمت و انتخاب/انتقال درخواست را در صفحهٔ قیمت تأیید کرد. ذخیرهٔ واقعی از نشست مدیر و درج Lead تولیدی اجرا نشد؛ مسیر ذخیره و snapshot به‌صورت mock آزمون شده‌اند تا دادهٔ واقعی مشتری ساخته نشود.
- [x] **گام ۶.۷: محدودیت پرداخت را ثبت کن.** پرداخت آزمایشی انجام نشد. این صفحه فقط درخواست سرنخ با برآورد سمت سرور ثبت می‌کند و پرداخت، سفارش یا اشتراک نمی‌سازد؛ فعال‌سازی پرداخت همچنان به شناسهٔ پذیرنده و اتصال درگاه نیاز دارد.
- [x] **گام ۶.۸: وضعیت نهایی را ثبت کن.** پیاده‌سازی، آزمون‌ها، build، migration و بررسی‌های زنده تکمیل شد. ذخیرهٔ واقعی تنظیمات از نشست مدیر و ثبت Lead آزمایشی روی دادهٔ تولیدی انجام نشده است؛ دسترسی و رفتار آن‌ها با آزمون endpoint ایزوله پوشش داده شد.

### ثبت نهایی انتشار — ۲۰۲۶-۱۰-۱۳

- قیمت‌های تولیدی بدون تغییر ماندند و با seed قبلی تطبیق دقیق دارند.
- build نهایی، `press/www/asumi.html` را به assetهای تازهٔ سایت و پنل متصل کرد.
- بررسی مجدد زنده: `https://asumi.ir/`, `https://asumi.ir/dashboard/orders` و API عمومی قیمت پاسخ موفق دادند؛ درخواست بدون نشست به API مدیر رد شد.
- قیمت‌گذاری درگاه پرداخت ایجاد یا فعال نمی‌کند؛ مشتری از پنل قیمت را کنترل می‌کند و کاربر از همان صفحهٔ اصلی آسومی درخواست می‌فرستد.

---

## بازبینی برنامه در برابر مشخصات

- دامنهٔ ۱۵ ماژول، افزونه و پنج بسته: گام‌های ۱، ۲ و ۴.
- seed اولیهٔ بدون تغییر قیمت‌های فعلی: گام ۱ و مهاجرت idempotent گام ۲.
- API عمومی و دسترسی مدیر: گام ۳.
- quote قابل اعتماد و snapshot تغییرناپذیر: گام‌های ۳ و ۵.
- عدم ساخت order/payment/subscription: آزمون API و smoke test گام‌های ۳ و ۶.
- همهٔ ارقام قابل مشاهده و نبود fallback محلی: گام ۴.
- مدیریت کامل پنل و دسترسی backend: گام‌های ۳ و ۵.
- تست Python، React/Vue، typecheck و build: گام ۶.
- backup، انتشار و smoke test: گام ۶.
- طراحی سایت و تعرفهٔ Marketplace خارج از تغییر: گام ۳ مسیر `website_design` و عدم تغییر endpointهای فروش دیگر.

بازبینی placeholder/ابهام: هیچ `TODO` یا مقدار نامشخص باقی نمانده؛ سقف قیمت، نام endpointها، رفتار package exact-match، فایل‌ها و فرمان‌های آزمون در همین برنامه تعریف شده‌اند.
