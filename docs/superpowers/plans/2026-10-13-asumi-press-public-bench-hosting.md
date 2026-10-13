# Asumi Public Press Bench Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route paid Asumi new-site orders through Press's native Site and Agent lifecycle on a compatible public Bench, without purchasing or provisioning a VPS for each customer.

**Architecture:** Keep each customer site as a distinct Press `Site` with its own Frappe database, team, plan, apps, and subdomain. Before checkout and before fulfilment, resolve a compatible public Release Group, active Bench, public Server, active Proxy Server, root domain, wildcard DNS, and TLS; create the Site through Press's normal Site lifecycle and track its Agent Job on the order. Remove the dedicated HostIran and custom Docker-hosting flow from new-site orders.

**Tech Stack:** Frappe/Press Python, Press DocTypes and Agent Jobs, Vue 3 dashboard, ZarinPal, pytest/unittest-compatible mocked tests, Docker Compose deployment.

## Global Constraints

- Do not create or buy a VPS for an individual customer site.
- Create each customer site as a separate Press `Site`; use Press's standard Agent and public Bench placement.
- A site plan for this flow must be public (`private_bench_support=0`) and restricted to compatible public Release Groups and apps.
- Do not fall back to the Docker Control host or a private `Site Group Deploy` when no public destination exists.
- Keep checkout fail-closed unless ZarinPal is in production mode with a configured Merchant ID and the plan, Root Domain, DNS, TLS, email, public Press infrastructure, and Agent are ready.
- Never persist a plaintext customer password in a Commerce Order, operation record, API response, or log.
- Preserve historical order data; inspect production orders before removing HostIran-specific schema.
- Do not create a real order, payment, customer Site, Server, Bench, or Release Group during tests.
- Keep all work on the existing `server-snapshot-20260825` branch and commit changes in Persian.
- Execute the plan inline in this session; do not spawn subagents.

---

## File map

- `press/saas/commerce/press_hosting.py` (create): resolve public Press placement and readiness from Root Domain, Site Plan, Release Group, Bench, Server, Proxy Server, DNS, and TLS records.
- `press/saas/commerce/test_press_hosting.py` (create): test public placement eligibility and fail-closed checks with mocked Press records.
- `press/saas/commerce/api.py`: use native Press placement in checkout/readiness; create and resume paid new-site orders through Press `Site` and Agent Job; remove HostIran fulfillment APIs and Docker capacity admission.
- `press/saas/commerce/hosting_readiness.py`: retain only readiness fields and resource values needed by public Press hosting; remove Docker-host-specific capacity checklist output.
- `press/saas/commerce/service_delivery.py`: retain shared Site/order validation; remove Docker-only new-hosted-site renewal helpers.
- `press/saas/commerce/site_plan_admin.py`: allow only compatible public Release Groups for new-site plans; remove the synthetic HostIran group, SKU, provider cost, and dedicated-VPS validations.
- `press/press/doctype/site_plan/site_plan.json`: remove HostIran SKU and monthly-cost fields while keeping native Press plan fields.
- `press/saas/doctype/commerce_order/commerce_order.json`: remove HostIran-only order fields after the production-data audit; keep standard `site`, `agent_job`, and provisioning fields.
- `press/hooks.py`, `press/api/site.py`, `press/press/doctype/site_group_deploy/site_group_deploy.py`, `press/press/doctype/site_group_deploy/site_group_deploy.json`, `press/press/doctype/deploy_candidate/deploy_candidate.py`: remove hooks and bypasses used only by Asumi HostIran VPS orders; leave standard Press Site Group Deploy behavior intact.
- `press/saas/commerce/dedicated_hosting.py`, `press/saas/commerce/test_dedicated_hosting.py`, `press/saas/commerce/test_hostiran_admin_api.py`: delete dedicated HostIran fulfillment code/tests; add `press/saas/commerce/test_native_hosting_api.py` for native Press Site lifecycle coverage.
- `press/saas/commerce/test_hosting_capacity_api.py`, `press/saas/commerce/test_hosting_readiness.py`, `press/saas/commerce/test_site_plan_admin.py`, `press/saas/commerce/test_order_snapshot.py`: replace Docker/VPS assumptions with public Bench and Press plan checks.
- `dashboard/src/pages/CommerceOrders.vue`: remove HostIran VPS purchase, SKU, cost, server-linking, and private-bench UI; explain shared public Bench delivery and display Site/Agent status and readiness.
- `dashboard/src/utils/hostiranHosting.js` and `dashboard/src/utils/hostiranHosting.test.ts`: delete HostIran-only display helpers and tests.

## Task 1: Public Press destination discovery

**Files:** Create `press/saas/commerce/press_hosting.py` and `press/saas/commerce/test_press_hosting.py`.

**Interfaces:**

- `resolve_public_site_target(plan_doc, subdomain: str | None = None) -> dict | None` returns only `{domain, cluster, group, version, apps, bench, server}` for an eligible public destination; it returns `None` when any required Press, DNS, or TLS record is absent.
- `public_site_target_is_ready(target: dict | None) -> bool` is true only for a complete target with a public enabled Release Group, active Bench, public active Server, active Proxy Server for `asumi.ir`, and `frappe` in the Bench and plan app set.

- [ ] Write failing unit tests for a compatible public target, a private Release Group, a Bench missing a plan app, a non-public or inactive Server, a missing proxy-domain link, absent wildcard certificate, absent wildcard DNS/TLS, no plan Release Groups, and no candidate Bench.
- [ ] Run `docker exec -w /home/frappe/frappe-bench/apps/press den-v16-backend /home/frappe/frappe-bench/env/bin/python -m unittest press.saas.commerce.test_press_hosting -v`; confirm the new target-resolution tests fail before implementation.
- [ ] Implement target resolution using only the plan's public Release Groups and the Root Domain's default Cluster. Require an active Bench on an active public Server, an active Proxy Server linked to `asumi.ir`, and the selected plan apps installed on the Bench. For Generic DNS, use the existing `check_dns_cname` and `check_dns_a` helpers for the requested or deterministic readiness subdomain. Require a Press wildcard TLS Certificate and the existing live wildcard DNS/TLS checks.
- [ ] Re-run `docker exec -w /home/frappe/frappe-bench/apps/press den-v16-backend /home/frappe/frappe-bench/env/bin/python -m unittest press.saas.commerce.test_press_hosting -v`; confirm all new placement tests pass.
- [ ] Commit the isolated resolver and tests with `git add press/saas/commerce/press_hosting.py press/saas/commerce/test_press_hosting.py && git commit -m "افزودن بررسی بنچ عمومی Press برای میزبانی آسومی"`.

## Task 2: Native Press checkout and order fulfilment

**Files:** Modify `press/saas/commerce/api.py`, `press/saas/commerce/hosting_readiness.py`, `press/saas/commerce/service_delivery.py`; create `press/saas/commerce/test_native_hosting_api.py`; update `press/saas/commerce/test_hosting_capacity_api.py`, `press/saas/commerce/test_hosting_readiness.py`, and `press/saas/commerce/test_order_snapshot.py`.

**Interfaces:**

- `_new_site_plan_config(plan_doc, subdomain=None, ...)` delegates to `resolve_public_site_target` and contains no Docker snapshot, HostIran SKU, or shared-Docker capacity logic.
- `_provision_hosting_order(order)` revalidates the paid order, plan snapshot, team, reserved subdomain, app allowlist, Root Domain, and selected public target; it creates exactly one Press `Site`, records `order.site` and the matching `Agent Job`, and returns while that Agent Job is pending.
- `activate_new_site_commerce_orders(site)` continues to activate only an order whose team, plan, domain, subdomain, and linked Site match after Press reports `Active`; `Broken` becomes `Provisioning Failed`.

- [ ] Add mocked tests for checkout availability only when a compatible public target exists, rejecting private/missing/incompatible Bench destinations, and returning only plan-approved apps.
- [ ] Add mocked order tests for a verified paid order creating one `Site` with the exact `team`, `subscription_plan`, `subdomain`, `domain`, `group`, `cluster`, and allowed `apps`; assert it links the Site and Agent Job and never calls Docker Control or HostIran/Site Group Deploy APIs.
- [ ] Add tests for repeated worker/callback execution reusing the order's Site, occupied or separately reserved subdomains, mismatched team/plan/site, unsupported apps, an unverified payment, private-bench plans, Agent `Active` activation, Agent `Broken` failure, and retry of a pending Agent Job.
- [ ] Run the targeted new and updated mocked tests with `docker exec -w /home/frappe/frappe-bench/apps/press den-v16-backend /home/frappe/frappe-bench/env/bin/python -m unittest press.saas.commerce.test_native_hosting_api press.saas.commerce.test_hosting_capacity_api press.saas.commerce.test_hosting_readiness press.saas.commerce.test_order_snapshot -v`; confirm the native order lifecycle tests fail before implementation.
- [ ] Replace VPS-specific order fulfilment with the verified native `Site` insertion path. Build `Site` with the exact public target, set `site.flags.commerce_hosting_order` before insert, run under the order customer and team context, and use Press's existing `after_insert`/Agent Job path. Persist only the Site name and safe Agent Job name on the order. Make retries reuse `order.site` and wait for Press's existing Site status hook; do not call Docker Control, create a new VPS, or create a `Site Group Deploy`.
- [ ] Update readiness to report public Press infrastructure and its matching plan/Release Group/Bench/Server/Proxy instead of Docker free-space, Docker Agent, HostIran SKU, or VPS capacity. Keep payment, plan price/period, Root Domain, wildcard DNS/TLS, and outgoing mail checks fail-closed.
- [ ] Keep existing-site upgrades and new-site renewals on the linked native Press `Site`; do not re-create a site during renewal.
- [ ] Run the targeted tests again and confirm all mocked placement, lifecycle, idempotency, retry, and fail-closed tests pass.
- [ ] Commit with `git add press/saas/commerce && git commit -m "اتصال سفارش ساخت سایت به چرخه استاندارد Press"`.

## Task 3: Remove HostIran plan/order controls

**Files:** Modify `press/saas/commerce/site_plan_admin.py`, `press/press/doctype/site_plan/site_plan.json`, `press/saas/doctype/commerce_order/commerce_order.json`, `press/hooks.py`, `press/api/site.py`, Site Group Deploy and Deploy Candidate HostIran hooks; update `press/saas/commerce/test_site_plan_admin.py`; remove HostIran-only module/tests.

- [ ] Update plan-admin tests to accept only enabled public Release Groups for `Create New Site`, reject private/unavailable groups, and validate selected apps against the public groups. Ensure new-site plans force `private_bench_support=0` and `dedicated_server_plan=0` without asking for SKU or provider cost.
- [ ] Before removing schema fields, inspect production orders through a read-only `bench execute` for Hosting orders in `Paid`, `Provisioning`, `Provisioning Failed`, `Active`, or `Expired` state and their `site`, `docker_site`, and HostIran links. Keep any historical data untouched; if a HostIran-linked paid/active record exists, retain its fields as hidden legacy data and exclude it from new checkout/fulfilment.
- [ ] Remove HostIran product code and provider monthly cost from Site Plan JSON and admin validation. Remove the HostIran order/server/Site Group Deploy fields only if the live audit confirms no historical record depends on them; otherwise mark them hidden/read-only and stop all new writes.
- [ ] Remove only hooks, Site Group Deploy fields, and Deploy Candidate bypasses added for HostIran orders. Keep Press's native Site creation checks and generic private-bench workflows unchanged.
- [ ] Delete `press/saas/commerce/dedicated_hosting.py`, `press/saas/commerce/test_dedicated_hosting.py`, and `press/saas/commerce/test_hostiran_admin_api.py` after `test_native_hosting_api.py` covers paid Site creation, idempotency, Agent status, and retry.
- [ ] Run `docker exec -w /home/frappe/frappe-bench/apps/press den-v16-backend /home/frappe/frappe-bench/env/bin/python -m unittest press.saas.commerce.test_site_plan_admin press.saas.commerce.test_service_delivery -v`; verify public Release Group constraints pass and HostIran plan options are absent.
- [ ] Commit with `git add press/api/site.py press/hooks.py press/press/doctype press/saas/commerce && git commit -m "حذف تنظیمات VPS از تعرفه میزبانی آسومی"`.

## Task 4: Update customer and admin dashboard

**Files:** Modify `dashboard/src/pages/CommerceOrders.vue`; remove `dashboard/src/utils/hostiranHosting.js` and `dashboard/src/utils/hostiranHosting.test.ts`.

- [ ] Update the page tests (or add a focused component test using the existing Vue test setup) to verify that the customer view says a separate Site is placed on a public Press Bench, order status shows Press Site/Agent progress, the admin view shows missing public Press prerequisites, and no HostIran/VPS/SKU/server-registration controls render.
- [ ] Add `dashboard/src/pages/CommerceOrders.test.ts` with mocked Asumi API responses for an unready public Bench and a paid order with a Press Site/Agent Job; assert the public-Bench copy and statuses render and HostIran controls do not. Run `cd dashboard && yarn vitest run src/pages/CommerceOrders.test.ts`; verify the no-VPS assertions fail against current copy.
- [ ] Remove HostIran imports, labels, panel sections, server assignment/retry calls, product SKU and provider cost controls. Keep customer plan pricing, allowed app selection, existing-site upgrades, ZarinPal configuration, service pricing, and standard order history intact.
- [ ] Show the readiness reason returned by `admin_hosting_readiness` (including the missing public Bench/Release Group/Proxy) and show the linked Site name and Agent Job/status for a paid new-site order.
- [ ] Run `cd dashboard && yarn vitest run src/pages/CommerceOrders.test.ts` and `cd dashboard && yarn build`; verify both pass and search `dashboard/src/pages/CommerceOrders.vue` and the built bundle for removed HostIran fulfilment copy.
- [ ] Commit with `git add dashboard/src/pages/CommerceOrders.vue dashboard/src/utils && git commit -m "نمایش میزبانی بنچ عمومی در پنل آسومی"`.

## Task 5: Production migration and live verification

**Files:** Update the design/implementation docs with actual deployment results; do not change any live settings that enable sales.

- [ ] Run the full related mocked Python test set and dashboard tests/build from Tasks 1–4. Run `git diff --check`, inspect `git diff 7f4152bf1..HEAD`, and confirm no new-site order path calls HostIran or Docker Control.
- [ ] On the live bench, take and validate fresh backups for every site that `bench migrate` will touch before schema migration. The backups created on 2026-10-14 cover the current Asumi, Boller, and Dehati databases; refresh those and create fresh backups for Denroom and Veederakht before deployment.
- [ ] Read-only audit the five-site Bench membership, public Server, active public Release Group, Bench app inventory, Proxy Server/domain link, Root Domain, wildcard DNS/TLS, ZarinPal merchant/sandbox state, and SMTP before deployment. Do not expose credentials in shell output.
- [ ] Build dashboard assets from the updated source, deploy the app code to the live bench, and run `bench --site asumi.ir migrate` only after backups validate. Do not turn on paid checkout or create a customer Site; current live readiness has no eligible public Press destination and live ZarinPal remains sandboxed/unconfigured.
- [ ] Perform the already-authorized rolling web/worker reload only after successful migration and asset build. Check `admin_hosting_readiness` returns structured checks, `/dashboard/orders` and its new assets return HTTP 200, order APIs do not expose HostIran fields, and all five public site routes respond as expected.
- [ ] Confirm a public Press site plan remains unavailable while the public Bench/Release Group/Proxy readiness check is false; document exact Press records and DNS/TLS actions needed to make it green. Do not report hosting sales or site creation as active until the real destination and production ZarinPal credentials are ready.
- [ ] Commit deployment notes in Persian after verification; keep checkout settings unchanged.
