# Asumi Commerce Payment Readiness Implementation Plan

> **For agentic workers:** Execute inline in the current workspace. Use test-first steps and keep all current routing edits intact.

**Goal:** Make paid Marketplace App subscriptions safe to sell through Asumi, keep the currently free catalog unchanged, and show clear readiness and order state to customers and Press administrators.

**Architecture:** Continue using Press Marketplace App Plans and the existing `Commerce Order` lifecycle. Apply Asumi's current 10,000 Rial payment floor, snapshot all payment values server-side, verify payment using the saved order, and activate subscriptions idempotently. ZarinPal is the user-approved first provider; verify its current amount requirements with the merchant account before go-live, and keep paid checkout disabled until the Press administrator securely stores the real Merchant ID in the protected settings panel.

**Tech Stack:** Frappe/Press Python APIs and DocTypes, Vue 3 Press Dashboard, Python `unittest`, dashboard Vitest, existing Docker Bench.

## Global Constraints

- The current Marketplace catalog contains 23 published apps and 46 active plans; every price stays at zero until the administrator changes it.
- Never put a Merchant ID or other payment secret in source code, browser output, logs, or chat.
- ZarinPal verification uses the saved order amount and authority; callback query values alone never activate an order.
- Only `System Manager` and `Press Admin` can edit commerce settings, prices, refunds, or provisioning.
- Hosting checkout remains unavailable until the provisioning path and a safe capacity check are verified. The live readiness API currently reports 9.8 GiB free disk and 7.4 GiB available memory; no hosting resource limits or minimum host reserves are configured.
- New-site delivery is confirmed to use subdomains of `asumi.ir`. A read-only DNS check found that the apex resolves to `62.60.207.82`, while `test-subdomain.asumi.ir` does not resolve; wildcard DNS and proxy routing must be verified before new-site checkout.
- Preserve the existing uncommitted `press/routing.py` changes and existing public and Press Dashboard routes.

---

### Task 1: Enforce Asumi's payment floor and documented ZarinPal request fields

**Files:**
- Modify: `press/saas/commerce/pricing.py`
- Modify: `press/saas/commerce/order_snapshot.py`
- Modify: `press/saas/commerce/zarinpal.py`
- Modify: `press/saas/commerce/api.py`
- Test: `press/saas/commerce/test_pricing.py`
- Test: `press/saas/commerce/test_order_snapshot.py`
- Test: `press/saas/commerce/test_zarinpal.py`

**Interfaces:**
- `normalize_zarinpal_price(value) -> int`: returns zero for a free plan, accepts integer Rials at or above Asumi's current 10,000 Rial floor, and raises `ValueError` for positive amounts below that floor or fractional/negative values. Verify the provider's current minimum before enabling live payments.
- `build_payment_request(...) -> dict`: records IRR on the Commerce Order, uses the documented V4 request fields, and rejects any paid amount below Asumi's current 10,000 Rial floor.

- [x] Add failing tests for zero and 10,000 Rials being accepted, 1 and 9,999 being rejected, and the payment payload matching the documented V4 fields.
- [x] Run the targeted commerce tests; confirm the lower-bound and currency assertions fail before implementation.
- [x] Add the validation helper, use it in paid order snapshots and both Marketplace App Plan and Site Plan price saves, and keep the order currency explicit while sending only documented ZarinPal request fields.
- [x] Re-run the targeted tests and confirm all commerce validation assertions pass.

### Task 2: Prove payment HTTP requests and callback verification use server-owned values

**Files:**
- Modify: `press/saas/commerce/test_zarinpal.py`
- Modify: `press/saas/commerce/zarinpal.py` only if the new tests expose a real request-construction defect.

**Interfaces:**
- `create_payment(payload, sandbox=False)` posts to the request endpoint selected by the stored sandbox setting.
- `verify_payment(merchant_id, amount, authority, sandbox=False)` posts the saved amount and authority to the matching verify endpoint.

- [x] Add tests that patch `urlopen` and inspect method, URL, JSON body, timeout, and headers for sandbox and production request/verify calls.
- [x] Run the ZarinPal tests; request and verification calls pass without a live gateway credential.
- [x] No further HTTP-client correction was required beyond explicit IRR and the request amount floor.
- [x] Re-run the tests and confirm the HTTP-client assertions pass.

### Task 3: Make readiness and price guidance clear in the customer and administrator panel

**Files:**
- Modify: `dashboard/src/pages/CommerceOrders.vue`
- Modify: `dashboard/src/utils/commerceAccess.test.ts` only if an access regression needs coverage.
- Test: dashboard component or page tests added next to `dashboard/src/pages/CommerceOrders.vue`.

**Interfaces:**
- The customer order panel continues to read `checkout_status`, `available_app_plans`, `my_purchase_sites`, and `my_orders` from `press.saas.commerce.api`.
- The administrator panel continues to read/write protected settings and prices using the existing `admin_*` and `save_*` APIs.

- [x] Add concise Persian guidance: zero keeps a plan free and paid IRR prices must be at least 10,000 Rials.
- [x] Keep the inactive gateway state explicit; the Merchant ID remains configurable in `/dashboard/orders` and is not re-displayed after saving.
- [x] Run dashboard commerce-access and marketplace-pricing tests and `yarn build`; all pass.

### Task 4: Store the hosting delivery choice per Site Plan

**Files:**
- Modify: `press/press/doctype/site_plan/site_plan.json`
- Modify: `press/press/doctype/site_plan/site_plan.py`
- Modify: `press/saas/commerce/service_delivery.py`
- Modify: `press/saas/commerce/api.py`
- Modify: `dashboard/src/pages/CommerceOrders.vue`
- Test: `press/saas/commerce/test_service_delivery.py`

- [x] Add a validated choice for upgrading an existing site or creating a new one, defaulting older plans to the existing-site option.
- [x] Show and save the choice in the Asumi hosting-plan table.
- [x] Test both choices, the default, and rejection of invalid values.
- [ ] Keep hosted-site checkout unavailable until the subdomain route, capacity gate, and idempotent provisioner are verified. The code now requires a Press-managed public server and checks the configured DNS path; runtime DNS/capacity still needs operator verification.

### Task 5: Add a paid Site Plan checkout and safe delivery lifecycle

**Files:**
- Modify: `press/saas/doctype/commerce_order/commerce_order.json`
- Modify: `press/saas/doctype/commerce_settings/commerce_settings.json`
- Modify: `press/saas/commerce/api.py`
- Modify: `press/saas/commerce/order_snapshot.py`
- Modify: `press/press/doctype/subscription/subscription.py`
- Modify: `press/press/doctype/site/site.py`
- Modify: `press/press/doctype/site_plan_change/site_plan_change.py`
- Modify: `dashboard/src/pages/CommerceOrders.vue`
- Test: commerce snapshot/delivery tests and related Press tests

- [x] Let each enabled Site Plan choose existing-site upgrade or new-site creation under `asumi.ir`.
- [x] Snapshot the Site Plan, term, delivery mode, prior plan, target site/subdomain, and paid amount in `Commerce Order`.
- [x] Create new sites only through Press's normal Site creation path, and only when the Root Domain, a compatible public group, an active shared bench, and a public server are configured.
- [x] Keep Site Plan checkout disabled unless its separate admin switch, ZarinPal settings, and required delivery configuration are ready.
- [x] Prevent Press usage invoices from charging the same Site Plan while its verified Commerce Order term is active; on expiry restore the prior plan or suspend a new site with no prior plan.
- [x] Show Site Plan offers and the required site/subdomain input on `/dashboard/orders`; preserve app-plan checkout.
- [x] Complete five Frappe database integration tests for new-site delivery activation, hosting renewal, duplicate-invoice suppression, refund recording, and expiry on an isolated temporary site; all passed. Production-site tests were not run.

### Task 6: Verify the delivered surfaces and preserve deployment state

**Files:**
- No production code unless a prior task's test proves a defect.

- [x] Run the focused `press.saas.commerce` pure tests. Catalog tests requiring page imports need a Frappe-initialized runner; do not enable tests on the live site to run them.
- [x] Run `press.tests.test_asumi_routing` and `press.tests.test_docker_control_routing` with the Bench virtual environment; both suites pass without touching production data.
- [x] Run the dashboard commerce access/pricing tests (20 pass), 49 focused commerce tests, and the production build.
- [x] Verify public `/`, `/saas`, `/pricing`, `/marketplace`, and `/dashboard/orders` return HTTP 200 page shells.
- [x] Verify `checkout_status` reports checkout disabled without exposing any credential and all 48 catalog plans remain at zero in all currencies. Hosting checkout remains disabled because the provisioning path, capacity threshold, and wildcard DNS are not ready.
- [x] Bound the hosting readiness checks: DNS queries use a two-second deadline, and the page uses the lightweight `/v1/resources` endpoint instead of the full Bench/Git inventory. The agent and web workers were deployed; a live administrator check returned in 1.5 seconds with the Docker agent connected.
- [x] Commit the code and plan with a Persian commit subject/body; leave the existing `press/routing.py` changes preserved.
- [x] List the five affected sites before the soft web reload and use the user's prior approval for this shared-Bench deployment. The latest HUP replaced all six Gunicorn workers without restarting the database or queues.

### Task 7: Make hosting plans fully manageable from the Asumi commerce panel

**Files:**
- Modify: `press/saas/commerce/api.py`
- Add: `press/saas/commerce/site_plan_admin.py`
- Modify: `dashboard/src/pages/CommerceOrders.vue`
- Test: `press/saas/commerce/test_site_plan_admin.py`

- [x] Create disabled, zero-price hosting-plan drafts in the panel, with delivery mode, public release groups, and eligible apps.
- [x] Edit a plan's title, description, prices, term, capacity, enabled state, release groups, and allowed apps in the same panel.
- [x] Validate every selected app against all selected release groups and prevent material changes while orders or subscriptions are active.
- [x] Keep new-site checkout bound to a customer-chosen subdomain under `asumi.ir`; leave payment and hosting checkout off until DNS, TLS, Press provisioning, capacity, and the real payment credential are configured.
- [x] Run the complete 71-test commerce suite in the Bench virtual environment, Python syntax checks, the dashboard commerce-access test, and the production dashboard build. The legacy ESLint/Prettier integration still crashes before reporting lint findings.

### Task 8: Create replacement Marketplace App Plans in the Asumi admin panel

**Files:**
- Modify: `press/saas/commerce/api.py`
- Add: `press/saas/commerce/marketplace_plan_admin.py`
- Modify: `dashboard/src/pages/CommerceOrders.vue`
- Test: `press/saas/commerce/test_marketplace_plan_admin.py`

- [x] Let Press administrators create a new disabled, zero-price draft for any published app and supported billing interval.
- [x] Reject unpublished apps, invalid fields, and duplicate app/title/interval combinations; keep existing plans intact.
- [x] Show published apps in the admin form and let the existing table configure the draft's prices and enabled state.
- [x] Keep an old plan enabled or disable it only when the administrator chooses; never move existing subscribers automatically.
- [x] Verify the full commerce suite (71 tests), Python syntax, dashboard commerce-access test, production build, and the live catalog summary (24 published apps, 48 existing plans, all still free).

### Supplemental checkout API verification

- [x] Add six mock-isolated API tests for free marketplace purchase, duplicate-free-order idempotency, paid-order rejection without a configured Merchant ID, callback cancellation, server-owned amount verification, failed verification, and retry of an already-paid order.
- [x] Run the tests through the initialized Bench context and compile the test module; all six tests pass without writing live orders or calling ZarinPal.
- [x] Add per-plan Asumi checkout capability to the public catalog. The homepage now explains when a listed currency price cannot be paid through Asumi and omits the purchase link when an app has no free or Rial-priced plan. The administrator price panel explains the Rial requirement.
- [x] Run 20 public-catalog Python tests, 33 Asumi homepage tests, 13 dashboard commerce tests, six checkout API mocks, and 13 install/provisioning mocks. Both production builds succeeded.
- [x] Publish the built assets and reload the six Gunicorn workers. A live browser check found 24 app cards, 48 plan entries, valid checkout-capability data, a guest purchase redirect that preserves the selected app, and no JS, console, or asset-loading errors.
- [ ] Live paid checkout remains unverified until the Press administrator configures the real Merchant ID; hosting prerequisites remain listed below.

## Known external completion conditions

- Live payment cannot be enabled or fully exercised until the administrator enters the real Merchant ID through `/dashboard/orders`; this plan never invents or embeds one.
- Hosting delivery choices are stored per Site Plan. The live readiness check confirms `asumi.ir` resolves to `62.60.207.82`, but wildcard DNS has no answer; add an A record for `*` pointing to that IP, then register a wildcard TLS certificate for `*.asumi.ir`. Provisioning also needs a public Server, active Bench, Release Group, proxy connection, capacity limits/reserves, and an isolated hosting delivery run. Keep hosting checkout unavailable until those checks pass.
- Live audit on 2026-10-13: `checkout_status` reports paid checkout, Marketplace checkout, and hosting checkout disabled, with ZarinPal sandbox mode on. `admin_hosting_readiness` reports only the Root Domain and Docker agent ready; payment credentials/production mode, a priced Site Plan, wildcard DNS/TLS, Press hosting infrastructure, and capacity are not ready. The live Press database still has two disabled, zero-price Site Plan drafts and no eligible public Server, active Bench, Release Group, or proxy connection.
- The current live resource reading is 7.4 GiB available memory and 9.8 GiB free disk. Site Plan capacity limits and configured reserves are missing, so new-site checkout stays disabled until the operator sets them and verifies headroom against the chosen plans.
- The official IRNIC WHOIS server (`whois.nic.ir`) currently returns `no entries found` for `boller.ir`; this is a registration blocker, not only a missing DNS record. The domain cannot serve the existing site until its owner registers it and configures DNS. Do not purchase or substitute another domain without the user's direction.

## Fresh live audit — 2026-10-13

- The live Bench inventory contains 25 apps. The Marketplace publishes and enables all 23 sellable apps other than `raven` and `sales`, with 46 enabled plans and zero prices in INR, USD, and IRR. Both excluded apps are installed on `denroom.ir`; keep their Bench code and site installations intact.
- Live `Commerce Settings` report the global commerce switch and free Marketplace sales enabled, Site Plan sales disabled, sandbox mode enabled, and no Merchant ID configured. The public `checkout_status` false values describe paid checkout; free app purchases use the separately enabled `free_purchase_enabled` setting.
- The current hosting checklist has only Root Domain and Docker agent ready. Live payment, priced Site Plan, wildcard DNS, wildcard TLS, public Press infrastructure, and capacity checks remain false. The latest resource snapshot is 7.3 GiB available memory and 9.8 GiB free disk.
- Re-ran all 19 `press.saas.commerce` test modules on a disposable Press site using Frappe light mode: 131 tests passed. The focused Docker agent operation tests passed (9 tests), and the Marketplace purchase UI tests passed (6 tests). The disposable site, temporary test-only dependencies, and test logs were removed; the five production sites remain the only registered sites.
- The backend container and workspace both run commit `169fe048735c2a049d1cb3fb7b19304467f2d18f`. Public `/`, `/saas`, `/pricing`, `/marketplace`, and `/dashboard/orders` page shells returned HTTP 200.
- Remaining launch inputs are the real ZarinPal Merchant ID entered through `/dashboard/orders` and the production-mode switch; wildcard DNS and TLS; and Press public Server/Bench/Release Group/Proxy plus validated site capacity limits. Do not enable paid or hosting checkout until those prerequisites pass the live checklist.

## به‌روزرسانی زنده — ۱۳ اکتبر ۲۰۲۶

- در تنظیمات واقعی `Commerce Settings` حداقل ذخیرهٔ میزبان روی ۲ گیگابایت دیسک و ۲ گیگابایت حافظه ثبت شد. کلیدهای checkout، فروش پلن میزبانی و حالت آزمایشی تغییر نکردند؛ شناسهٔ پذیرنده همچنان ثبت نشده است.
- بررسی زنده هنوز فقط دامنهٔ ریشه و Docker Agent را آماده می‌داند. میزبانی همچنان غیرفعال است: دو پیش‌نویس Site Plan غیرفعال و بدون قیمت، سقف منابع یا Release Group هستند؛ wildcard DNS/TLS و زیرساخت عمومی Press هم آماده نیستند.
- `asumi.ir` resolves to `62.60.207.82`; رکورد wildcard A وجود ندارد. پاسخ جست‌وجوی مستندات رسمی HostIran مسیر API برای مدیریت DNS ارائه نکرد، بنابراین رکورد باید در پنل DNS ثبت شود.
- پس از تغییر تنظیمات، صفحه‌های عمومی `/`, `/saas`, `/pricing`, `/marketplace` و `/dashboard/orders` با دنبال‌کردن تغییرمسیرها همگی HTTP 200 دادند.
- منابع هنگام بررسی: حدود ۹٫۸ گیگابایت دیسک و ۷٫۳ گیگابایت حافظهٔ در دسترس. ذخیرهٔ ۲/۲ ثبت است، اما ظرفیت قابل‌فروش تا تعیین سقف منابع یک پلن واقعی همچنان تأیید نمی‌شود.
