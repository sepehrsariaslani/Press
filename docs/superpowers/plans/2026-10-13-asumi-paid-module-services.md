# خرید خدمات ماژولی آسومی — برنامهٔ پیاده‌سازی

> **برای اجرا:** در همین شاخه و به‌صورت درون‌خطی اجرا می‌شود. از عامل جداگانه یا شاخهٔ کاری تازه استفاده نمی‌شود. هر رفتار با آزمون قرمز شروع و پیش از build نهایی سبز می‌شود.

**هدف:** خریدار بتواند تعرفهٔ ماهانهٔ ماژول‌های آسومی را با قیمت ذخیره‌شده در سرور به‌صورت سفارش ریالی پرداخت و تحویل دستی آن را در پنل پیگیری کند.

**معماری:** سفارش خدمات در `Commerce Order` با نوع مستقل `Asumi Service` ذخیره می‌شود تا درگاه زرین‌پال، callback و فهرست سفارش‌های فعلی دوباره استفاده شوند. snapshot شامل انتخاب و قیمت تومان سمت سرور است؛ مبلغ پرداختی به ریال تبدیل می‌شود. سفارش پس از callback معتبر `Paid` می‌شود و مدیر آن را با دو اقدام دستی به `Provisioning` و سپس `Active` می‌برد.

**فناوری:** Frappe/Press Python و DocTypes، `unittest`، Vue 3، React/TypeScript، Vitest و build فعلی Press.

## محدودیت‌های کلی

- قیمت قابل پرداخت فقط از تعرفهٔ ذخیره‌شدهٔ سرور محاسبه می‌شود؛ مرورگر فقط شناسهٔ ماژول و افزونه می‌فرستد.
- نرخ‌های ماژولی به تومان و سفارش زرین‌پال به ریال است؛ تبدیل `1 تومان = 10 ریال` است و هر مبلغ پولی باید حداقل `10,000` ریال باشد.
- سفارش هر بار یک ماهه است؛ تمدید دستی است و برداشت خودکار یا قطع خودکار دسترسی اضافه نمی‌شود.
- `allow_service_sales` پیش‌فرض خاموش می‌ماند و پرداخت فقط با checkout کلی روشن، Merchant ID ثبت‌شده و رعایت محدودیت sandbox باز می‌شود.
- callback فقط با مبلغ و authority ذخیره‌شده سفارش را Paid می‌کند؛ دادهٔ callback به‌تنهایی معتبر نیست.
- سفارش `Asumi Service` هرگز به worker نصب Marketplace یا ساخت سایت فرستاده نمی‌شود.
- قیمت‌ها، Merchant ID، حالت sandbox و checkout تولید در استقرار خودکار تغییر نمی‌کنند.
- صفحهٔ طراحی سایت همچنان مسیر درخواست برآورد است؛ این طرح آن را به checkout تبدیل نمی‌کند.

---

## نقشهٔ فایل‌ها

**Backend خالص:** `press/saas/commerce/service_orders.py` snapshot، تبدیل مبلغ، fingerprint و اعتبارسنجی تماس را نگه می‌دارد. `test_service_orders.py` رفتار قابل‌آزمون بدون پایگاه داده را پوشش می‌دهد.

**Backend Frappe:** `press/saas/doctype/commerce_order/commerce_order.json` نوع و snapshot خدمات را اضافه می‌کند؛ `commerce_order.py` invariantهای هر نوع سفارش را بررسی می‌کند. `press/saas/doctype/commerce_settings/commerce_settings.json` کلید فروش خدمات را اضافه می‌کند. `press/saas/commerce/api.py` checkout، callback، تنظیمات امن، فهرست سفارش‌ها و اقدام مدیر را ارائه می‌دهد.

**Backend tests:** `test_checkout_access.py`, `test_checkout_api.py`, `test_service_order_api.py` و `test_order_lifecycle.py` دسترسی، درگاه و تحویل را بررسی می‌کنند. آزمون endpointهای Frappe با API `run_mocked_tests()` و بدون نوشتن در سایت زنده اجرا می‌شود.

**پنل مشتری و مدیر:** `dashboard/src/pages/CommerceOrders.vue` فرم تماس را به سفارش/پرداخت وصل می‌کند، `allow_service_sales` و قیمت‌ها را نمایش می‌دهد، snapshot را در تاریخچه نشان می‌دهد و دو اقدام تحویل دستی مدیر را می‌سازد. `dashboard/src/utils/asumiServiceOrder.ts` منطق payload، عنوان و اقدام وضعیت را از template جدا می‌کند و آزمون‌های همان فایل آن را پوشش می‌دهند.

**سایت عمومی:** `dashboard/asumi/src/product/pricing/pricingApi.ts` آمادگی پرداخت خدمات را می‌خواند؛ `ModulePricingPage.tsx`، `ModuleChooser.tsx` و `catalog.ts` متن CTA و شرط ادامه را با وضعیت پرداخت هماهنگ می‌کنند. `App.test.tsx`, `ModulePricingPage.test.tsx` و `pricingApi.test.ts` رفتار قیمت/دکمه را می‌سنجند.

---

### کار ۱: snapshot امن سفارش و تبدیل ارز

**فایل‌ها:**
- ایجاد: `press/saas/commerce/service_orders.py`
- ایجاد: `press/saas/commerce/test_service_orders.py`
- تغییر: `press/saas/commerce/service_requests.py`

**رابط:**

```python
build_service_order_snapshot(
    module_ids: list[str], addon_ids: list[str], prices: dict,
    customer: str, team: str, full_name: str, phone: str,
    company: str = "", quoted_at: str = "",
) -> dict
```

تابع با `calculate_service_quote` مبلغ و نام اقلام را از نقشهٔ معتبر سمت سرور می‌سازد و فیلدهای `order_type`, `interval`, `currency`, `amount`, `service_amount_toman`, `service_title`, `service_quote_snapshot`, `service_contact_name`, `service_contact_phone`, `service_company` و `service_fingerprint` را برمی‌گرداند. مبلغ پولی با `normalize_zarinpal_price(total_toman * 10)` سنجیده می‌شود؛ مبلغ صفر مجاز است.

- [ ] **۱.۱ آزمون قرمز بنویس.** موارد مبلغ سروری، تبدیل تومان/ریال، قیمت صفر، مبلغ زیر کف، ماژول/افزونهٔ ناشناخته و تکراری، شمارهٔ تماس نامعتبر، شناسهٔ سفارش قطعی و snapshot شامل کل اقلام/تخفیف را پوشش بده.
- [ ] **۱.۲ آزمون را با محیط Bench اجرا کن و شکست مورد انتظار را ثبت کن.** `docker exec den-v16-backend bash -lc 'cd /home/frappe/frappe-bench && env/bin/python -m unittest press.saas.commerce.test_service_orders -v'` باید ابتدا به‌خاطر نبود تابع شکست بخورد.
- [ ] **۱.۳ حداقل پیاده‌سازی را بنویس.** helper تماس مشترک را از `service_requests.py` بیرون بکش تا هم Lead قبلی و هم سفارش جدید همان اعتبارسنجی نام، تلفن و شرکت را مصرف کنند. fingerprint از JSON مرتب‌شدهٔ customer/team/module IDs/add-on IDs/total با SHA-256 ساخته شود.
- [ ] **۱.۴ آزمون helper را دوباره اجرا کن.** همان دستور باید همهٔ آزمون‌های `test_service_orders` را سبز کند.
- [ ] **۱.۵ commit فارسی بساز.** فقط helper و آزمون‌های همان کار را با پیام `افزودن snapshot امن سفارش خدمات آسومی` ثبت کن.

### کار ۲: مدل سفارش و تنظیم مستقل فروش خدمات

**فایل‌ها:**
- تغییر: `press/saas/doctype/commerce_order/commerce_order.json`
- تغییر: `press/saas/doctype/commerce_order/commerce_order.py`
- تغییر: `press/saas/doctype/commerce_settings/commerce_settings.json`
- آزمون: `press/saas/commerce/test_order_snapshot.py`
- آزمون: `press/saas/commerce/test_checkout_access.py`

- [ ] **۲.۱ آزمون قرمز بنویس.** helperهای pure schema/validator باید سفارش `Asumi Service` بدون plan را قبول کنند، snapshot ناقص را رد کنند، و سفارش Hosting/Marketplace فاقد `plan` یا `plan_type` را رد کنند. checkout access باید `allow_service_sales=False` را مستقل از فروش برنامه/میزبانی ببندد.
- [ ] **۲.۲ آزمون‌ها را اجرا کن.** فرمان‌های زیر باید با assertion تازه شکست بخورند و نه خطای import:

```bash
docker exec den-v16-backend bash -lc 'cd /home/frappe/frappe-bench && env/bin/python -m unittest press.saas.commerce.test_order_snapshot press.saas.commerce.test_checkout_access -v'
```

- [ ] **۲.۳ schema را گسترش بده.** `order_type` مقدار `Asumi Service` بگیرد؛ `plan_type` و Dynamic Link `plan` از نظر schema اجباری نباشند؛ model اعتبارسنجی را برای سفارش‌های عادی نگه دارد. فیلدهای snapshot/تماس و `service_fingerprint` به‌صورت read-only ثبت شوند. `Commerce Settings.allow_service_sales` با پیش‌فرض صفر اضافه شود.
- [ ] **۲.۴ invariant را در `CommerceOrder.validate` پیاده کن.** نوع سرویس باید `interval=Monthly`, ارز `IRR`, snapshot JSON معتبر و fingerprint داشته باشد؛ نوع‌های دیگر همچنان plan/plan_type لازم دارند و فیلدهای سرویس را مصرف نمی‌کنند.
- [ ] **۲.۵ آزمون‌ها را سبز کن.** همان دستور باید دو گروه آزمون را پاس کند؛ سپس `git diff --check` اجرا شود.
- [ ] **۲.۶ commit فارسی بساز.** پیام `افزودن نوع سفارش خدمات به تنظیمات آسومی`.

### کار ۳: API سفارش، پرداخت و تحویل دستی

**فایل‌ها:**
- تغییر: `press/saas/commerce/api.py`
- تغییر: `press/saas/commerce/test_checkout_access.py`
- ایجاد: `press/saas/commerce/test_service_order_api.py`
- تغییر: `press/saas/commerce/test_checkout_api.py`
- تغییر: `press/saas/commerce/test_order_lifecycle.py`

**رابط‌ها:**

```python
start_service_purchase(module_ids: str, addon_ids: str,
                       full_name: str, phone: str, company: str = "") -> dict
update_service_order_status(order: str, status: str) -> dict
```

`start_service_purchase` فقط POST است. کاربر Guest را رد می‌کند، Team جاری را از سرور می‌گیرد، انتخاب‌ها را parse می‌کند، snapshot سروری می‌سازد و قفل/جست‌وجوی pending را با fingerprint انجام می‌دهد. مبلغ صفر سفارش `Free` و `Paid` می‌سازد؛ مبلغ مثبت فقط با تنظیم فروش خدمات، Merchant ID و access helper به `_create_zarinpal_checkout` می‌رسد. Callback معتبر، سفارش خدمات را Paid می‌کند و آن را به provisioning خودکار enqueue نمی‌کند.

- [ ] **۳.۱ آزمون API قرمز بنویس.** ورود اجباری، فروش خاموش، Merchant ID ناموجود، قیمت جعلی کلاینت، حداقل مبلغ، Team جاری، دوبارکلیک/pending reuse، سفارش رایگان بدون درگاه، پولی با payload سروری، authority callback، cancel/verify-failure, عدم enqueue worker و رد دسترسی مدیر غیرمجاز را mock-isolated بررسی کن.
- [ ] **۳.۲ آزمون را از Bench اجرا کن.** `docker exec den-v16-backend bench --site asumi.ir execute press.saas.commerce.test_service_order_api.run_mocked_tests` باید پیش از API پیاده‌سازی‌شده به‌خاطر endpoint مفقود شکست بخورد؛ همهٔ DB/network calls در suite patch شوند.
- [ ] **۳.۳ gating عمومی/مدیر را گسترش بده.** انتخاب نوع `services` در helperهای checkout؛ `checkout_status.services_enabled` بدون credential؛ و خواندن/ذخیرهٔ `allow_service_sales` در `admin_settings` و `save_admin_settings` اضافه شود.
- [ ] **۳.۴ checkout را اضافه کن.** snapshot خالص کار ۱ را مصرف کن. برای مبلغ پولی، pendingها فقط با customer/team/fingerprint/type مطابق شوند؛ برای صفر، order با provider `Free` ساخته شود. مبلغ مرورگر هرگز خوانده نشود.
- [ ] **۳.۵ callback و تحویل دستی را کامل کن.** مسیر callback برای سفارش سرویس worker `provision_paid_order` را صدا نزند. endpoint مدیر فقط status هدف `Provisioning` یا `Active` را بپذیرد: `Paid→Provisioning`, `Provisioning→Active`. در Active، `service_starts_at=now` و `service_ends_at=period_end(now, "Monthly")` ذخیره شود. `retry_provisioning` سفارش سرویس را رد کند.
- [ ] **۳.۶ سفارش مشتری/مدیر را بخوان.** `my_orders` و `admin_orders`، عنوان، قیمت تومان، snapshot و اطلاعات لازم برای اجرای دستی را برگردانند؛ `authority`, sandbox و secret همچنان از پاسخ مشتری حذف شوند.
- [ ] **۳.۷ آزمون‌های API/lifecycle را سبز کن.** suite جدید و `test_checkout_api.run_mocked_tests()` باید کامل پاس شوند؛ هیچ تستی در دیتابیس Asumi سفارش نمی‌سازد.
- [ ] **۳.۸ commit فارسی بساز.** پیام `افزودن پرداخت و پیگیری سفارش خدمات آسومی`.

### کار ۴: اتصال قیمت‌گذاری عمومی و پنل سفارش/مدیریت

**فایل‌ها:**
- تغییر: `dashboard/asumi/src/product/pricing/pricingApi.ts`
- تغییر: `dashboard/asumi/src/product/pricing/pricingApi.test.ts`
- تغییر: `dashboard/asumi/src/product/pricing/ModulePricingPage.tsx`
- تغییر: `dashboard/asumi/src/product/pricing/ModuleChooser.tsx`
- تغییر: `dashboard/asumi/src/product/pricing/catalog.ts`
- تغییر: `dashboard/asumi/src/App.test.tsx`
- تغییر: `dashboard/src/pages/CommerceOrders.vue`
- ایجاد: `dashboard/src/utils/asumiServiceOrder.ts`
- ایجاد: `dashboard/src/utils/asumiServiceOrder.test.ts`

- [ ] **۴.۱ آزمون UI/helper قرمز بنویس.** public status envelope روشن/خاموش/نامعتبر را بررسی کن؛ بر اساس همان status متن CTA درست باشد؛ query فقط IDهای انتخابی را نگه دارد؛ order type عنوان و مبلغ تومان را نشان دهد؛ فقط سفارش Asumi Service دکمهٔ مرحلهٔ مناسب را بگیرد.
- [ ] **۴.۲ آزمون‌های تازه را اجرا کن.** `cd dashboard/asumi && yarn test --run src/product/pricing/pricingApi.test.ts src/product/pricing/ModulePricingPage.test.tsx src/App.test.tsx` و `cd dashboard && yarn test --run src/utils/asumiServiceOrder.test.ts` باید در ابتدا برای رفتار تازه شکست بخورند.
- [ ] **۴.۳ CTA عمومی را وصل کن.** وضعیت را از `checkout_status` بخوان. در checkout آماده، متن «ثبت سفارش و پرداخت» و در حالت خاموش مسیر «درخواست برآورد» باقی بماند؛ صفحهٔ عمومی هرگز مبلغ قابل پرداخت نفرستد. متن شرایط صریحاً یک ماه/تمدید دستی را بگوید.
- [ ] **۴.۴ فرم سفارش را وصل کن.** هنگام `module_pricing` و فعال‌بودن `services_enabled`، فرم تماس `start_service_purchase` را اجرا و روی `checkout_url` هدایت کند؛ در حالت خاموش یا برای `website_design` مسیر lead قبلی حفظ شود.
- [ ] **۴.۵ پنل مدیر را کامل کن.** toggle مستقل `allow_service_sales`; جزئیات snapshot؛ label مبلغ تومان؛ اقدام شروع اجرای دستی برای Paid؛ و اقدام تحویل برای Provisioning اضافه شود. پیام مشتری `Paid`, `Provisioning`, `Active` را از هم جدا کند.
- [ ] **۴.۶ آزمون helper و Vitest را سبز کن.** آزمون‌های UI/helpers و کل Vitest سایت آسومی/داشبورد باید پاس شوند.
- [ ] **۴.۷ commit فارسی بساز.** پیام `اتصال قیمت آسومی به سفارش و تحویل خدمات`.

### کار ۵: بررسی، انتشار و smoke test

**فایل‌ها:** تغییرات گام‌های ۱ تا ۴؛ هیچ credentialی به repo افزوده نشود.

- [ ] **۵.۱ آزمون Python خالص را اجرا کن.** suiteهای service order, price, request, checkout access, lifecycle و snapshot در `env/bin/python` باید سبز باشند.
- [ ] **۵.۲ آزمون API mock-isolated را اجرا کن.** `test_checkout_api.run_mocked_tests()` و `test_service_order_api.run_mocked_tests()` از Bench اجرا شوند؛ در پایان شمار سفارش‌های زنده باید بدون تغییر باشد.
- [ ] **۵.۳ آزمون رابط را اجرا کن.** کل Vitest سایت آسومی و داشبورد و typecheck سایت آسومی اجرا شوند.
- [ ] **۵.۴ build کامل بساز.** `cd /home/sepehr/den-v16-docker/apps/press && yarn build` باید با exit 0 تمام شود.
- [ ] **۵.۵ یکپارچگی را ایزوله بررسی کن.** روی یک site موقت Frappe، migration، سفارش رایگان، checkout mock، callback معتبر، سفارش ناموفق، دسترسی مدیر و تغییر Paid→Provisioning→Active را اجرا کن؛ هیچ داده یا payment روی پنج سایت مشتری ساخته نشود.
- [ ] **۵.۶ پیش از انتشار backup و اختلاف‌ها را بررسی کن.** فضای آزاد Docker و وضعیت پنج سایت را ثبت کن؛ backup کامل سایت‌های متأثر بگیر؛ `git diff --check` و `git status` بازبینی شوند.
- [ ] **۵.۷ migrate و دارایی‌ها را منتشر کن.** schema به bench مشترک deploy شود؛ checkout پولی و sandbox در تنظیم زنده دست‌نخورده بمانند. در صورت نیاز به reload مشترک، از مجوز قبلی reload نرم استفاده کن.
- [ ] **۵.۸ smoke test تولید بگیر.** `/`, `/pricing`, `/dashboard/orders`, API قیمت و `checkout_status` و assetهای جدید را بررسی کن. در production باید Merchant ID همچنان ثبت‌نشده/یا sales gate خاموش باشد تا هنگام آماده‌شدن پذیرنده خودکار پولی نشود.
- [ ] **۵.۹ commit نهایی فارسی بساز.** پیام `انتشار پرداخت خدمات ماژولی آسومی`.

## بازبینی پوشش

- قیمت سروری و snapshot: کارهای ۱ و ۳.
- تبدیل ارز، کف درگاه و سفارش رایگان: کارهای ۱ و ۳.
- کنترل مستقل پنل/checkout: کارهای ۲، ۳ و ۴.
- callback معتبر و جلوگیری از provision خودکار: کار ۳.
- پیگیری دستی مشتری/مدیر و شروع اعتبار هنگام تحویل: کارهای ۳ و ۴.
- فرم، CTA و نمایش قیمت: کار ۴.
- آزمون، build، backup، migration و smoke test بدون پرداخت واقعی: کار ۵.
- طراحی وب، تعرفهٔ میزبانی، Merchant ID، قیمت‌گذاری Marketplace و ثبت DNS بیرونی در این طرح تغییر نمی‌کنند و در هدف کلی به‌عنوان موارد جداگانهٔ ناتمام می‌مانند.
