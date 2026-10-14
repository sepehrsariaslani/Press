# فروش افزونه‌های حسابیار Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: از `superpowers:executing-plans` برای اجرای مرحله‌به‌مرحله استفاده کن. مراحل با `- [ ]` قابل پیگیری‌اند. کاربر صریحاً خواسته است ایجنت دیگری ساخته نشود؛ کل کار در همین نشست و به‌صورت inline انجام می‌شود.

**Goal:** فروش قیمت‌پذیر اپ حسابیار در Marketplace و فروش دو افزونهٔ مستقلِ دستیار هوش مصنوعی و چت سازمانی را آماده کن؛ خرید پولی با زرین‌پال و فعال‌سازی دستی یک‌ماهه انجام شود و API سایت مقصد مجوز را سمت سرور بررسی کند.

**Architecture:** قیمت اپ حسابیار در پلن موجود Marketplace می‌ماند. Press کاتالوگ ثابت افزونه‌ها، قیمت، سفارش، اشتراک سایت‌محور و اعتبارسنجی مجوز را نگه می‌دارد؛ کلید مستقل هر افزونه را با API استاندارد Press یا عامل Docker به `site_config` می‌رساند. اپ `accounts` کلید را فقط در backend مصرف می‌کند، نتیجه را حداکثر پنج دقیقه cache می‌کند و پیش از APIهای چت و دستیار دسترسی را می‌سنجد. رابط عمومی خرید را به سایت فعال متعلق به تیم وصل می‌کند و پنل مدیر، قیمت و تحویل دستی را کنترل می‌کند.

**Tech Stack:** Frappe/Press Python، DocType و patch، عامل Docker پایتون، Vue 3 و TypeScript/Vitest در داشبورد Press، React/Vitest در صفحهٔ تعرفهٔ آسومی، Vue در اپ Accounts، `unittest` و pytest/bench برای آزمون.

## Global Constraints

- قیمت آغازین هر دو افزونه `0` و وضعیت هر دو `Unconfigured` است؛ این حالت دسترسی نصب‌های فعلی را حفظ می‌کند و قابل خرید نیست.
- شناسه‌های افزونه فقط `assistant_ai` و `internal_chat` هستند و سمت سرور allowlist می‌شوند.
- حالت `Free` برای همهٔ سایت‌ها فعال است؛ `Paid` فقط با اشتراک فعال همان سایت و قیمت ماهانهٔ حداقل ۱۰٬۰۰۰ تومان فعال می‌شود؛ `Disabled` دسترسی را رد می‌کند.
- فقط سایت فعالِ متعلق به Team خریدار که `accounts` روی آن نصب است هدف سفارش می‌شود؛ قیمت، شناسه و مبلغ از ورودی مرورگر پذیرفته نمی‌شوند.
- دستیارهای جاسازی‌شده در ماژول‌های دیگر، قیمت‌های ۱۵ ماژول، بسته‌ها، افزونهٔ `restaurantMenu`، فروش Marketplace اپ و callback زرین‌پال موجود تغییر رفتاری نمی‌کنند.
- کلید خام اشتراک فقط در `site_config` سایت مقصد می‌ماند؛ Press فقط hash را نگه می‌دارد. کلید در پاسخ API، مرورگر، خطا یا log ظاهر نمی‌شود.
- در حالت `Paid`، API بدون cache معتبر با خطای شبکه دسترسی نمی‌دهد؛ `System Manager` راه دور زدن اشتراک نیست.
- اعتبار هر فعال‌سازی یک ماه است؛ فروش رایگان سفارش صفرریالی نمی‌سازد؛ تمدید با خرید و تأیید دستی مدیر انجام می‌شود.

---

## نقشهٔ فایل‌ها و مسئولیت‌ها

### Press: کاتالوگ و سفارش

- `press/saas/commerce/service_pricing.py`: allowlist، وضعیت و اعتبارسنجی قیمت افزونه‌ها؛ نگهداری بدون تغییر سه نقشهٔ تعرفهٔ قدیمی.
- `press/saas/commerce/service_orders.py` و `press/saas/commerce/api.py`: snapshot افزونه، انتخاب سایت، سفارش زرین‌پال، جلوگیری از تکرار، تحویل و تمدید دستی.
- `press/saas/doctype/asumi_service_pricing/asumi_service_pricing.json` و `press/patches/v0_8_0/seed_asumi_addon_offers.py` و `press/patches.txt`: فیلد جدید و seed سازگار.
- `press/saas/doctype/asumi_addon_subscription/`: رکورد مجوز زوج سایت/افزونه، hash کلید، تاریخ اعتبار و وضعیت همگام‌سازی.
- `press/saas/commerce/addon_entitlements.py`: تولید کلید، hash، هدف سایت، همگام‌سازی، تمدید و وضعیت مجوز.
- `press/saas/commerce/test_addon_offers.py`, `test_addon_orders.py`, `test_addon_entitlements.py`: آزمون واحد و API با mock.

### Press: عامل Docker و پنل

- `press/docker_control_agent/operations.py`, `service.py`, `test_site_subscriptions.py`, `test_service.py`: endpoint امضاشدهٔ مستقل و نوشتن اتمیک کلید افزونه در `site_config`؛ مسیر فعلی کلید Marketplace حفظ شود.
- `press/docker_control/client.py` و `press/docker_control/test_client.py`: client امضاشده برای سایت Docker.
- `dashboard/src/utils/asumiServicePricing.ts` و آزمونش: نوع، اعتبارسنجی و payload وضعیت/قیمت افزونه‌ها.
- `dashboard/src/pages/CommerceOrders.vue` و `CommerceOrders.test.ts`: پنل تنظیم وضعیت و قیمت، هشدار تغییر سیاست و تحویل/تلاش‌مجدد مجوز.
- `dashboard/asumi/src/product/pricing/catalog.ts`, `pricingApi.ts`, `ModulePricingPage.tsx` و آزمون‌ها: نمایش عمومی فقط افزونهٔ قابل‌فروش، انتخاب سایت هدف و آغاز checkout.

### Accounts: احراز مجوز و رابط کاربری

- `accounts/addon_entitlements.py` و `accounts/tests/test_addon_entitlements.py`: خواندن کلید مخفی از تنظیم سایت، درخواست backend به Press، cache پنج‌دقیقه‌ای و سیاست چهار وضعیت.
- `accounts/assistant_ai/api.py`, `accounts/chat_api.py`, `accounts/chat_utilities.py`, `accounts/chat_utilities_runtime.py`: بررسی مجوز پیش از تمام endpointهای عمومی دستیار/چت.
- `frontend/src/App.vue`, `frontend/src/pages/ChatPage.vue`, `frontend/src/services/assistant/assistantApi.js` و تست‌های فرانت: وضعیت دسترسی و پنهان‌کردن ورودی‌ها و اعلان‌های مربوط، با لینک خرید برای کاربر بدون مجوز.

## Task 1: تنظیم افزونه‌ها در کاتالوگ Press

**Files:**

- Modify: `press/saas/commerce/service_pricing.py`
- Modify: `press/saas/doctype/asumi_service_pricing/asumi_service_pricing.json`
- Create: `press/patches/v0_8_0/seed_asumi_addon_offers.py`
- Modify: `press/patches.txt`
- Test: `press/saas/commerce/test_addon_offers.py`
- Modify: `press/saas/commerce/test_service_pricing.py`
- Modify: `press/saas/commerce/test_service_pricing_endpoints.py`

**Interface produced:**

```python
ADDON_OFFER_TITLES: dict[str, str]
def default_addon_offers() -> dict[str, dict[str, object]]: ...
def normalize_addon_offers(values: object) -> dict[str, dict[str, object]]: ...
```

`default_addon_offers()` دقیقاً این مقدار را می‌دهد:

```python
{
    "assistant_ai": {"status": "Unconfigured", "monthly_price_toman": 0},
    "internal_chat": {"status": "Unconfigured", "monthly_price_toman": 0},
}
```

- [ ] **Step 1: آزمون‌های قرمز کاتالوگ را بنویس.** `test_addon_offers.py` باید چهار وضعیت، کلیدهای دقیق، مقدار عدد صحیح نامنفی، سقف `MAX_SERVICE_PRICE_TOMAN`، حداقل ۱۰٬۰۰۰ تومان فقط برای حالت Paid و قیمت صفر برای حالت Free را بررسی کند. آزمون جداگانه ثابت کند خروجی `default_service_prices()` و قیمت همهٔ ۱۵ ماژول و `restaurantMenu` عوض نشده است.

```python
def test_paid_offer_requires_zarinpal_minimum():
    offers = default_addon_offers()
    offers["assistant_ai"] = {"status": "Paid", "monthly_price_toman": 9_999}
    with pytest.raises(ValueError):
        normalize_addon_offers(offers)

def test_defaults_keep_addons_unconfigured_and_legacy_prices_unchanged():
    assert default_addon_offers()["internal_chat"] == {
        "status": "Unconfigured", "monthly_price_toman": 0
    }
    assert default_service_prices()["addons"] == {"restaurantMenu": 2_500_000}
```

- [ ] **Step 2: اجرای آزمון قرمز.** از ریشهٔ `press` اجرا کن: `bench --site asumi.ir run-tests --module press.saas.commerce.test_addon_offers`. انتظار: شکست به‌علت نبود `default_addon_offers` یا validator.
- [ ] **Step 3: پیاده‌سازی و migration سازگار.** validator فقط دو ID ثابت و چهار وضعیت مجاز را بپذیرد؛ قیمت را با validator موجود بررسی کند؛ در Paid مقدار کمتر از ۱۰٬۰۰۰ و در Free مقدار غیرصفر را رد کند. فیلد JSON جدید `addon_offer_config` به singleton اضافه کن. Patch فقط وقتی فیلد خالی است default را ثبت کند و هیچ‌یک از JSONهای قدیمی را بازنویسی نکند. patch را به `patches.txt` اضافه کن.
- [ ] **Step 4: API مدیر/عمومی را با backward compatibility آزمون کن.** `service_pricing()` همچنان سه نقشهٔ قبلی را عیناً برگرداند؛ API عمومی جدید `service_addon_catalog()` فقط Free و Paid معتبر را منتشر کند و `admin_service_pricing`/`save_admin_service_pricing` فیلد وضعیت افزونه‌ها را فقط برای مدیر بخوانند/ذخیره کنند. آزمون دسترسی غیرمدیر و payload ناقص/دارای کلید ناشناخته را اضافه کن.
- [ ] **Step 5: آزمون‌ها و commit.** `bench --site asumi.ir run-tests --module press.saas.commerce.test_addon_offers` و `bench --site asumi.ir run-tests --module press.saas.commerce.test_service_pricing_endpoints` باید PASS شوند. فایل‌های Task را با پیام فارسی `feat: افزودن تنظیمات فروش افزونه‌های حسابیار` commit کن.

## Task 2: سفارش مستقل افزونه برای سایت مشخص

**Files:**

- Modify: `press/saas/commerce/service_orders.py`
- Modify: `press/saas/commerce/api.py`
- Test: `press/saas/commerce/test_addon_orders.py`
- Modify: `press/saas/commerce/test_service_orders.py`
- Modify: `press/saas/commerce/test_service_order_api.py`

**Interface produced:**

```python
def build_addon_order_snapshot(*, addon_id: str, site_type: str, site_name: str,
    offers: dict, customer: str, team: str, full_name: str, phone: str,
    company: str = "", quoted_at: str | None = None) -> dict: ...

@frappe.whitelist(methods=["POST"])
def start_service_addon_purchase(addon_id: str, site_type: str, site_name: str,
    full_name: str, phone: str, company: str = "") -> dict: ...

@frappe.whitelist()
def eligible_addon_sites() -> list[dict]: ...
```

- [ ] **Step 1: snapshotها و تست‌های هدف سایت را بنویس.** تست‌ها سفارش را فقط با مبلغ سروری می‌سازند، fingerprint را با تغییر `addon_id` یا سایت تغییر می‌دهند، دو نوع `Site` و `Docker Control Site` را نگه می‌دارند و ID ناشناخته، وضعیت Unconfigured/Disabled، Paid کمتر از حداقل، سایت غیرفعال، Team نامرتبط و نبود `accounts` را رد می‌کنند.

```python
def test_addon_snapshot_is_site_scoped_and_server_priced():
    order = build_addon_order_snapshot(
        addon_id="assistant_ai", site_type="Site", site_name="tenant.asumi.ir",
        offers=paid_offer(25_000), customer="buyer@example.com", team="TEAM-1",
        full_name="مشتری", phone="09123456789", quoted_at="2026-10-14 12:00:00",
    )
    assert order["amount"] == 250_000
    assert order["service_quote_snapshot"]["site_name"] == "tenant.asumi.ir"
```

- [ ] **Step 2: اجرای آزمون قرمز.** `bench --site asumi.ir run-tests --module press.saas.commerce.test_addon_orders` باید در ابتدا با نبود builder شکست بخورد.
- [ ] **Step 3: snapshot و اعتبارسنجی سایت را پیاده کن.** فقط سفارش Paid ساخته شود؛ Free از کاتالوگ عمومی است و API خرید سفارش نمی‌سازد. `site_name` را فقط از رکورد Press معتبر استخراج کن؛ هر دو نوع سایت باید متعلق به Team جاری، فعال و دارای برنامهٔ `accounts` باشند. مبلغ ریالی `monthly_price_toman * 10`، snapshot شامل قیمت/عنوان/سایت/افزونه/`quoted_at` باشد و fingerprint شامل customer، Team، site type، site name و addon ID باشد.
- [ ] **Step 4: endpoint و idempotency را پیاده کن.** `start_service_addon_purchase` ورود، Team، فروش و Merchant ID را بررسی کند؛ همان addon/site برای سفارش Pending Payment موجود باشد checkout قبلی را برگرداند؛ سفارش paid/pending duplicate نسازد؛ در غیر این صورت از `_create_zarinpal_checkout` موجود استفاده کند. مبلغ مرورگر پارامتر endpoint نیست. `eligible_addon_sites` فقط سایت‌های فعال تیم جاری را با `accounts` نصب‌شده برگرداند.
- [ ] **Step 5: آزمون‌های واحد/API و commit.** `bench --site asumi.ir run-tests --module press.saas.commerce.test_addon_orders` و `bench --site asumi.ir run-tests --module press.saas.commerce.test_service_order_api` PASS شوند. commit فارسی: `feat: ثبت سفارش افزونه برای سایت حسابیار`.

## Task 3: اشتراک، همگام‌سازی و endpoint اعتبارسنجی Press

**Files:**

- Create: `press/saas/doctype/asumi_addon_subscription/asumi_addon_subscription.json`
- Create: `press/saas/doctype/asumi_addon_subscription/asumi_addon_subscription.py`
- Create: `press/saas/commerce/addon_entitlements.py`
- Modify: `press/saas/commerce/api.py`
- Create: `press/saas/commerce/test_addon_entitlements.py`
- Modify: `press/saas/commerce/test_service_order_api.py`
- Modify: `press/saas/commerce/test_order_integration.py`

**Interface produced:**

```python
def issue_or_extend_addon_subscription(order) -> dict: ...
def sync_addon_subscription_key(subscription, secret_key: str | None) -> None: ...
def check_addon_subscription(addon_id: str, site_name: str, secret_key: str) -> dict: ...
@frappe.whitelist(methods=["POST"])
def validate_addon_subscription(addon_id: str, site_name: str, secret_key: str) -> dict: ...
```

- [ ] **Step 1: آزمون hash، سایت و سیاست‌ها را بنویس.** بررسی کن کلید تصادفی ۴۰ نویسه‌ای است و فقط SHA-256 آن ذخیره می‌شود؛ کلید/سایت/افزونهٔ اشتباه، refund، تاریخ پایان گذشته و سفارش غیر Active مجوز نمی‌دهند؛ فقط همان سایت و addon فعال می‌شوند. پاسخ عمومی مجاز فقط `{enabled, status, expires_at}` باشد.
- [ ] **Step 2: اجرای آزمون قرمز.** `bench --site asumi.ir run-tests --module press.saas.commerce.test_addon_entitlements` باید به‌علت نبود module/doctype/API شکست بخورد.
- [ ] **Step 3: DocType و service را بساز.** رکورد یکتا با فیلدهای `team`, `site_type`, `site_name`, `addon_id`, `key_hash`, `source_order`, `status`, `starts_at`, `ends_at`, `sync_status`, `sync_error` بساز. از lock بر اساس `(site_type, site_name, addon_id)` برای جلوگیری از دو اشتراک همزمان استفاده کن. تمدید از `max(now, ends_at)` محاسبه شود. raw key فقط حین همگام‌سازی در حافظه باشد.
- [ ] **Step 4: همگام‌سازی هر دو نوع سایت را اضافه کن.** برای `Site` از `update_site_config` استفاده کن؛ برای Docker از `DockerControlClient` استفاده کن. قبل از ثبت `Active` همهٔ addonهای سفارش باید sync موفق داشته باشند. شکست sync خطای پاک‌سازی‌شده را در سفارش/اشتراک بنویسد، سفارش را Active نکند و retry مدیر را ممکن کند.
- [ ] **Step 5: refund و مجوز را وصل کن.** endpoint اعتبارسنجی guest با `rate_limit`، ID allowlist، hash compare زمان‌بندی‌شده و پاسخ ثابت برای کلید نامعتبر بساز. `Unconfigured`=allow برای سازگاری، `Free`=allow، `Paid`=subscription فعال با سفارش پرداختی و `ends_at > now`، `Disabled`=deny. refund فقط دسترسی همان سفارش را باطل کند و اگر سفارش/تمدید معتبر دیگری برای همان سایت و addon وجود دارد آن را قطع نکند.
- [ ] **Step 6: تست و commit.** `bench --site asumi.ir run-tests --module press.saas.commerce.test_addon_entitlements` و `bench --site asumi.ir run-tests --module press.saas.commerce.test_order_integration` PASS شوند. commit فارسی: `feat: افزودن مجوز و اشتراک سایت‌محور افزونه‌ها`.

## Task 4: کلید افزونه در عامل Docker

**Files:**

- Modify: `press/docker_control_agent/operations.py`
- Modify: `press/docker_control_agent/service.py`
- Modify: `press/docker_control/client.py`
- Modify: `press/docker_control_agent/test_site_subscriptions.py`
- Modify: `press/docker_control_agent/test_service.py`
- Modify: `press/docker_control/test_client.py`

**Interface produced:**

```python
def write_site_addon_subscription_key(sites_root: Path, site: str,
    addon_id: str, secret_key: str | None, *, installed_apps: list[str]) -> dict: ...

def DockerControlClient.set_site_addon_subscription(site: str,
    addon_id: str, secret_key: str | None) -> dict: ...
```

- [ ] **Step 1: آزمون endpoint/helper را اول اضافه کن.** تست set/revoke برای دو addon، حفظ بقیهٔ config، replace اتمیک، رد ID ناشناخته، سایت خارج از allowlist، نصب‌نبودن `accounts`، کلید malformed و امضای نامعتبر را اضافه کن.
- [ ] **Step 2: اجرای آزمون قرمز.** `python -m unittest press.docker_control_agent.test_site_subscriptions press.docker_control_agent.test_service press.docker_control.test_client` از ریشهٔ Press باید به‌علت نبود helper/endpoint جدید شکست بخورد.
- [ ] **Step 3: endpoint امضاشده را اضافه کن.** مسیر جداگانهٔ `/v1/site-addon-subscription` دقیقاً `site`, `addon_id`, `secret_key` بگیرد؛ allowlist فقط `assistant_ai` و `internal_chat` باشد؛ `_installed_apps` باید `accounts` را تأیید کند؛ config keyها `asumi_addon_assistant_ai_key` و `asumi_addon_internal_chat_key` باشند. از helper اتمیک موجود الگو بگیر، اما endpoint `/v1/site-subscription` و کلیدهای Marketplace را تغییر نده.
- [ ] **Step 4: Press client را اضافه کن.** payload با HMAC client موجود ارسال شود؛ secret در arguments، audit metadata، exception و log ذخیره نشود؛ پاسخ دقیقاً site/addon/enabled را تأیید کند.
- [ ] **Step 5: اجرای آزمون و commit.** فرمان Step 2 باید PASS شود. commit فارسی: `feat: همگام‌سازی امن کلید افزونه با عامل Docker`.

## Task 5: کنترل مجوز در backend اپ Accounts

**Files:**

- Create: `accounts/addon_entitlements.py`
- Create: `accounts/tests/test_addon_entitlements.py`
- Modify: `accounts/assistant_ai/api.py`
- Modify: `accounts/chat_api.py`
- Modify: `accounts/chat_utilities.py`
- Modify: `accounts/chat_utilities_runtime.py`
- Modify: `accounts/hooks.py` فقط اگر API وضعیت مجوز به hook نیاز دارد.

**Interface produced:**

```python
def get_addon_access(addon_id: str) -> dict: ...
def require_addon_access(addon_id: str) -> None: ...
@frappe.whitelist()
def addon_access_status() -> dict: ...
```

- [ ] **Step 1: آزمون چهار سیاست و cache را بنویس.** `Unconfigured` و `Free` مجاز، `Disabled` رد، Paid با پاسخ معتبر مجاز؛ پاسخ منقضی/شبکه بدون cache رد؛ cache حداکثر ۳۰۰ ثانیه؛ کلید خام در cache key/log/response نباشد. آزمون‌ها `requests.post` را mock کنند و هیچ شبکهٔ واقعی نداشته باشند.

```python
def test_paid_access_fails_closed_when_press_is_unreachable_without_valid_cache():
    with patch("accounts.addon_entitlements.requests.post", side_effect=OSError("offline")):
        with pytest.raises(frappe.PermissionError):
            require_addon_access("assistant_ai")
```

- [ ] **Step 2: اجرای آزمون قرمز.** `bench --site dev.local run-tests --module accounts.tests.test_addon_entitlements` از ریشهٔ بنچ باید با نبود module شکست بخورد.
- [ ] **Step 3: helper امن را بساز.** فقط ID ثابت بپذیر؛ وضعیت cache را با hash کلید و addon نگه دار؛ endpoint مقصد را از تنظیم ثابت `asumi_press_url` یا fallback `https://asumi.ir` بگیر و فقط HTTPS بپذیر؛ timeout کوتاه داشته باش؛ key را فقط در request backend POST بفرست؛ پاسخ را به boolean/status/expiry محدود کن؛ `Unconfigured` در نبود تنظیم تازه مجاز بماند تا نصب‌های قدیمی قفل نشوند.
- [ ] **Step 4: backend gates را اضافه کن.** `_require_user()` دستیار را به `require_addon_access("assistant_ai")` وصل کن و تمام APIهای whitelisted دستیار که مسیر `_require_user` را دور می‌زنند صریحاً محافظت کن. تمام APIهای whitelisted عمومی چت در سه ماژول چت را با decorator مرکزی `require_addon_access("internal_chat")` بپیچ؛ توابع داخلی غیرقابل‌دسترسی از RPC را دوباره gate نکن. آزمون مستقیم RPC برای خواندن، نوشتن، فایل، گروه و شمارنده نشان دهد پاسخ denial پیش از هر mutation برمی‌گردد.
- [ ] **Step 5: API وضعیت و تست‌های Accounts را اجرا کن.** endpoint فقط status افزونه‌های AI/chat را به کاربر واردشده بدهد؛ هیچ کلیدی در payload نباشد. `bench --site dev.local run-tests --module accounts.tests.test_addon_entitlements`, `bench --site dev.local run-tests --module accounts.tests.test_chat_utilities`, و `bench --site dev.local run-tests --module accounts.tests.test_assistant_conversations` باید PASS شوند.
- [ ] **Step 6: commit.** فقط فایل‌های Task را stage کن و `feat: کنترل سمت سرور دسترسی AI و چت` را commit کن.

## Task 6: عامل فروش و تنظیم در پنل Asumi

**Files:**

- Modify: `dashboard/src/utils/asumiServicePricing.ts`
- Modify: `dashboard/src/utils/asumiServicePricing.test.ts`
- Modify: `dashboard/src/pages/CommerceOrders.vue`
- Modify: `dashboard/src/pages/CommerceOrders.test.ts`
- Modify: `press/saas/commerce/api.py` برای endpoint مدیر شمارنده/فهرست مجوز سایت‌ها در صورت نیاز.

**Interface produced:**

```ts
type AddonOfferStatus = 'Unconfigured' | 'Free' | 'Paid' | 'Disabled';
type AddonOffer = { status: AddonOfferStatus; monthly_price_toman: number };
type AsumiServicePricing = { modules: Record<string, number>; addons: Record<string, number>;
  packages: Record<string, number>; addon_offers: Record<'assistant_ai' | 'internal_chat', AddonOffer> };
```

- [ ] **Step 1: تست utility ویرایش قیمت را اضافه کن.** status ناشناخته، مبلغ غیرصحیح/منفی/بالاتر از سقف، Paid زیر ۱۰٬۰۰۰، Free با مبلغ غیرصفر و key اضافه رد شوند؛ payload جدید به‌علاوهٔ سه نقشهٔ قدیمی ارسال شود.
- [ ] **Step 2: اجرای آزمون قرمز.** `cd dashboard && npm test -- --run src/utils/asumiServicePricing.test.ts` باید در ابتدا با نبود `addon_offers` شکست بخورد.
- [ ] **Step 3: فرم مدیر را اضافه کن.** دو ردیف ثابت با select وضعیت، ورودی تومان فعال فقط در Paid، راهنمای حداقل ۱۰٬۰۰۰ تومان، تعداد سفارش pending و سایت‌های فعال نمایش بده. تغییر `Unconfigured/Free` به `Paid` پیش از submit تعداد سایت‌های در معرض قطع دسترسی را از API بگیر و `window.confirm` روشن با شمارش سایت‌ها بخواهد؛ لغو confirm هیچ تغییری ذخیره نکند. Marketplace app plan و قیمت ۱۵ ماژول دست‌نخورده بماند.
- [ ] **Step 4: مرحلهٔ دستی تحویل را تکمیل کن.** سفارش‌های addon در جدول سفارش‌ها باید سایت، افزونه، مبلغ تومان/ریال و تاریخ دوره را نشان دهند. دکمهٔ Active فقط پس از Provisioning نمایش یابد و خطای sync را نمایش دهد؛ دکمهٔ تلاش مجدد همان sync را دوباره اجرا کند.
- [ ] **Step 5: آزمون و commit.** `cd dashboard && npm test -- --run src/utils/asumiServicePricing.test.ts src/pages/CommerceOrders.test.ts` باید PASS شود. commit فارسی: `feat: مدیریت قیمت و تحویل افزونه‌ها در پنل آسومی`.

## Task 7: کاتالوگ عمومی، انتخاب سایت و checkout

**Files:**

- Modify: `dashboard/asumi/src/product/pricing/catalog.ts`
- Modify: `dashboard/asumi/src/product/pricing/pricingApi.ts`
- Modify: `dashboard/asumi/src/product/pricing/pricingApi.test.ts`
- Modify: `dashboard/asumi/src/product/pricing/ModulePricingPage.tsx`
- Modify: `dashboard/asumi/src/product/pricing/ModulePricingPage.test.tsx`
- Modify: `dashboard/asumi/src/product/serviceRequestRoute.ts`
- Modify: `dashboard/src/utils/asumiServiceRequest.ts`
- Modify: `dashboard/src/pages/CommerceOrders.vue`
- Modify: `dashboard/src/pages/CommerceOrders.test.ts`

**Interface produced:**

```ts
type SellableAddon = { id: 'assistant_ai' | 'internal_chat'; title: string;
  status: 'Free' | 'Paid'; monthly_price_toman: number };
async function loadServiceAddons(fetcher?: typeof fetch): Promise<SellableAddon[]>;
async function loadEligibleAddonSites(fetcher?: typeof fetch): Promise<AddonSite[]>;
```

- [ ] **Step 1: آزمون catalog را بنویس.** افزونهٔ Unconfigured/Disabled در صفحه نباشد؛ Free با برچسب رایگان و بدون خرید پرداختی نمایش یابد؛ Paid زیر حداقل قیمت رد شود؛ انتخاب افزونه بدون انتخاب ماژول مجاز باشد؛ selection ماژول‌ها و `restaurantMenu` فعلی عیناً حفظ شود.
- [ ] **Step 2: اجرای آزمون قرمز.** `cd dashboard/asumi && npm test -- --run src/product/pricing/pricingApi.test.ts src/product/pricing/ModulePricingPage.test.tsx src/product/serviceRequestRoute.test.ts` باید تا افزودن catalog endpoint جدید شکست بخورد.
- [ ] **Step 3: بارگذاری و رابط را بساز.** API عمومی کاتالوگ وضعیت و قیمت جاری را می‌خواند؛ صفحه دو کارت AI/chat را فقط برای حالت Free/Paid نشان می‌دهد؛ Disabled/Unconfigured هیچ call-to-action ندارد. Paid به‌همراه checkout فعال دکمهٔ پرداخت یک‌ماهه دارد و در غیر این صورت درخواست خرید نمی‌سازد؛ CTA Free فقط راهنمای فعال بودن سراسری را نمایش می‌دهد.
- [ ] **Step 4: انتخاب سایت و خرید را وصل کن.** کاربر واردشده از `eligible_addon_sites` گزینه‌های `Site` و `Docker Control Site` تیم خود را می‌گیرد. انتخاب سایت و اطلاعات تماس تأیید می‌شود، سپس فقط `addon_id`, `site_type`, `site_name`, `full_name`, `phone`, `company` ارسال می‌شوند؛ مبلغ از API نمی‌فرستد. checkout URL معتبر به صفحهٔ زرین‌پال هدایت شود؛ guest به ورود هدایت شود.
- [ ] **Step 5: آزمون‌ها و build.** `cd dashboard/asumi && npm test -- --run src/product/pricing/pricingApi.test.ts src/product/pricing/ModulePricingPage.test.tsx && npm run typecheck && npm run build` باید PASS شود. commit فارسی: `feat: نمایش و خرید افزونه‌های حسابیار در تعرفه‌ها`.

## Task 8: نمایش مجوز و قفل رابط کاربری Accounts

**Files:**

- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/pages/ChatPage.vue`
- Modify: `frontend/src/services/assistant/assistantApi.js`
- Create/Modify: helper frontend در `frontend/src/services/addonEntitlements.js`
- Create: `frontend/tests/addonEntitlements.test.js`
- Modify: آزمون‌های موجود Chat/Assistant در `frontend/tests/`

- [ ] **Step 1: تست وضعیت فرانت را بنویس.** API وضعیت موفق، denial، خطای شبکه و کاربر مهمان را بررسی کن؛ denial ورودی/اعلان چت و AI را نشان ندهد و لینک تعرفهٔ آسومی را عرضه کند؛ وضعیت Unconfigured legacy UI را بدون تغییر نگه دارد.
- [ ] **Step 2: اجرای آزمون قرمز.** `yarn test frontend/tests/addonEntitlements.test.js` باید با نبود helper یا view-state شکست بخورد؛ اگر مخزن تست Vitest نام دیگری دارد، فرمان واقعی را از `package.json`/`vite.config` بخوان و همان را ثبت کن.
- [ ] **Step 3: وضعیت را به UI وصل کن.** وضعیت را از API Accounts بارگذاری و در App فراهم کن؛ در خطای شبکه، UI برای Paid را محدود کند و پیام روشن برای بارگذاری مجدد/تعرفه نشان دهد. فقط ورودی، entrypoint و اعلان قابلیت AI/chat را پنهان کن؛ سایر دستیارهای ماژولی خارج از این scope می‌مانند.
- [ ] **Step 4: تست فرانت و commit.** از `frontend` اجرا کن: `node --test tests/addonEntitlements.test.js tests/assistantPageContext.test.js tests/chatNotificationSound.test.js tests/assistantConversations.test.js`. commit فارسی: `feat: نمایش وضعیت اشتراک افزونه در حسابیار`.

## Task 9: بازبینی یکپارچه، migration و انتشار

**Files:**

- Modify only if needed: `press/saas/commerce/test_addon_orders.py`, `press/saas/commerce/test_addon_entitlements.py`, `accounts/tests/test_addon_entitlements.py`, dashboard tests.
- Deployment checklist: `docs/superpowers/plans/2026-10-14-asumi-accounts-addons.md`.

- [ ] **Step 1: آزمون‌های قراردادی end-to-end با mock را اجرا کن.** از ریشهٔ Press جداگانه اجرا کن: `bench --site asumi.ir run-tests --module press.saas.commerce.test_addon_offers`, `bench --site asumi.ir run-tests --module press.saas.commerce.test_addon_orders`, `bench --site asumi.ir run-tests --module press.saas.commerce.test_addon_entitlements`, `bench --site asumi.ir run-tests --module press.saas.commerce.test_service_order_api`. عامل: `python -m unittest press.docker_control_agent.test_site_subscriptions press.docker_control_agent.test_service press.docker_control.test_client`. از ریشهٔ bench حسابیار: `bench --site dev.local run-tests --module accounts.tests.test_addon_entitlements`, `bench --site dev.local run-tests --module accounts.tests.test_chat_utilities`, `bench --site dev.local run-tests --module accounts.tests.test_assistant_conversations`. برای dashboard و Asumi فرمان‌های Task 6–7 را اجرا کن.
- [ ] **Step 2: مهاجرت را روی bench آزمایشی انجام بده.** از دیتابیس Press و یک سایت حسابیار آزمایشی backup بگیر، `bench --site asumi.ir migrate` اجرا کن، مقدار قبلی سه نقشه را قبل/بعد مقایسه کن، فیلد `addon_offer_config` را با دو Unconfigured/0 تأیید کن و endpointهای `/api/method/press.saas.commerce.service_pricing`, `service_addon_catalog`, `eligible_addon_sites` و `addon_access_status` را بررسی کن.
- [ ] **Step 3: مسیرهای مالی را با gateway mock بررسی کن.** قیمت tamperشدهٔ client به مبلغ سفارش راه پیدا نکند؛ زرین‌پال فقط مبلغ snapshot را بگیرد؛ callback نامعتبر Paid نسازد؛ سفارش Free برای افزونه ساخته نشود؛ سفارش Paid تا تأیید دستی مجوز ندهد؛ Active فقط پس از sync موفق ثبت شود؛ پایان ماه مجوز Paid را ببندد؛ refund سفارش جاری دسترسی را قطع کند.
- [ ] **Step 4: بررسی امنیت و سازگاری.** diff را برای کلید خام، log، guest endpoint بدون rate limit، endpoint whitelisted بدون gate، allowlist شناسه، تغییر ۱۵ قیمت، و مسیرهای assistantهای خارج scope بررسی کن. `git status --short` را در هر دو repo بازبینی کن و هیچ تغییر نامرتبط موجود را stage نکن.
- [ ] **Step 5: build/commit و گزارش.** patchها و تغییرات باقی‌مانده را با توضیح فارسی commit کن. فقط پس از اجرای `bench migrate`, آزمون‌ها و build گزارش «آمادهٔ انتشار» بده؛ تغییر وضعیت به Paid و پرداخت واقعی را مدیر از پنل انجام می‌دهد و انتشار نباید آن را خودکار فعال کند.

## بازبینی خودکار برنامه

- **پوشش مشخصات:** Task 1 وضعیت/قیمت و migration؛ Task 2 سایت و سفارش؛ Task 3 اشتراک، hash، دوره، refund و API؛ Task 4 عامل Docker؛ Task 5 کنترل API حسابیار؛ Task 6 پنل قیمت/تحویل؛ Task 7 صفحهٔ عمومی/زرین‌پال؛ Task 8 UI حسابیار؛ Task 9 آزمون/انتشار را پوشش می‌دهد. قیمت اپ در Marketplace موجود می‌ماند و module tariff تغییری نمی‌کند.
- **اسکن placeholder:** هیچ `TODO`, `TBD` یا مرحلهٔ واگذار شده با عبارت «بعداً» وجود ندارد. هر مرحله مسیر و فرمان آزمون دارد؛ نام توابع بین taskها با interfaceها یکسان است.
- **سازگاری نوع‌ها:** Python از `addon_id`, `site_type`, `site_name`, `monthly_price_toman` استفاده می‌کند؛ TypeScript همان ID/status/فیلدهای قیمت را می‌گیرد؛ site type فقط `Site` یا `Docker Control Site` است.
