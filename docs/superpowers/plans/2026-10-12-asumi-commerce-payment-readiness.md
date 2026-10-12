# Asumi Commerce Payment Readiness Implementation Plan

> **For agentic workers:** Execute inline in the current workspace. Use test-first steps and keep all current routing edits intact.

**Goal:** Make paid Marketplace App subscriptions safe to sell through Asumi, keep the currently free catalog unchanged, and show clear readiness and order state to customers and Press administrators.

**Architecture:** Continue using Press Marketplace App Plans and the existing `Commerce Order` lifecycle. Validate checkout amounts against ZarinPal's official minimum, snapshot all payment values server-side, verify payment using the saved order, and activate subscriptions idempotently. Keep checkout disabled until the Press administrator stores a real Merchant ID in the existing protected settings panel.

**Tech Stack:** Frappe/Press Python APIs and DocTypes, Vue 3 Press Dashboard, Python `unittest`, dashboard Vitest, existing Docker Bench.

## Global Constraints

- All 24 published Marketplace apps keep their current zero prices until the administrator changes them.
- Never put a Merchant ID or other payment secret in source code, browser output, logs, or chat.
- ZarinPal verification uses the saved order amount and authority; callback query values alone never activate an order.
- Only `System Manager` and `Press Admin` can edit commerce settings, prices, refunds, or provisioning.
- Hosting checkout remains unavailable until the provisioning path and a safe capacity check are verified. The latest Docker Agent inventory reports 18.5 GB free on the shared disk.
- New-site delivery is confirmed to use subdomains of `asumi.ir`. A read-only DNS check found that the apex resolves to `62.60.207.82`, while `test-subdomain.asumi.ir` does not resolve; wildcard DNS and proxy routing must be verified before new-site checkout.
- Preserve the existing uncommitted `press/routing.py` changes and existing public and Press Dashboard routes.

---

### Task 1: Enforce ZarinPal's minimum amount and explicit Rial currency

**Files:**
- Modify: `press/saas/commerce/pricing.py`
- Modify: `press/saas/commerce/order_snapshot.py`
- Modify: `press/saas/commerce/zarinpal.py`
- Modify: `press/saas/commerce/api.py`
- Test: `press/saas/commerce/test_pricing.py`
- Test: `press/saas/commerce/test_order_snapshot.py`
- Test: `press/saas/commerce/test_zarinpal.py`

**Interfaces:**
- `normalize_zarinpal_price(value) -> int`: returns zero for a free plan, accepts integer Rials at or above 10,000, and raises `ValueError` for positive amounts below 10,000 or fractional/negative values.
- `build_payment_request(...) -> dict`: includes `currency: "IRR"` and rejects any paid amount below 10,000 Rials.

- [x] Add failing tests for zero and 10,000 Rials being accepted, 1 and 9,999 being rejected, and payment payloads explicitly naming IRR.
- [x] Run the targeted commerce tests; confirm the lower-bound and currency assertions fail before implementation.
- [x] Add the validation helper, use it in paid order snapshots and both Marketplace App Plan and Site Plan price saves, and include IRR in ZarinPal requests.
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

## Known external completion conditions

- Live payment cannot be enabled or fully exercised until the administrator enters the real Merchant ID through `/dashboard/orders`; this plan never invents or embeds one.
- Hosting delivery choices are stored per Site Plan. New-site delivery is intended to use `*.asumi.ir`, but the wildcard probe has no DNS answer. `asumi.ir` resolves to `62.60.207.82`; DNS nameservers are `ns1.hostiran.net` and `ns2.hostiran.net`. Provisioning still needs the Root Domain, a public Server, active Bench, Release Group, wildcard TLS certificate, and an isolated end-to-end run. Keep hosting checkout unavailable until these and the capacity gate are verified.
- The live Press database has the `Default` Cluster and an active `asumi.ir` Root Domain, plus two disabled, zero-price Site Plan drafts. No eligible public Server, active Bench, Release Group, proxy connection, or wildcard TLS record is configured. The latest readiness check reports the Docker agent and Root Domain ready; payment, a priced Site Plan, wildcard DNS/TLS, Press infrastructure, and capacity remain unready.
- The latest readiness check reported about 7.7 GB available memory and 12.1 GB free disk. Site Plan capacity limits and configured reserves are still missing, so new-site checkout stays disabled until the operator sets capacity and verifies headroom against the chosen plans.
- Public DNS returns NXDOMAIN for `boller.ir`, so its login route cannot be reached. This needs correction at its registrar/DNS provider and is separate from the Asumi commerce change.
