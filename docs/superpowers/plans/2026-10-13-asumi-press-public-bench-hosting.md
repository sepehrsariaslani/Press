# Asumi Public Press Bench Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route paid Asumi new-site orders through Press's native Site and Agent lifecycle on a compatible public Bench, without purchasing or provisioning a VPS for each customer.

**Architecture:** Keep each customer site as a distinct Press `Site` with its own Frappe database, team, plan, apps, and subdomain. Before checkout and before fulfilment, resolve a compatible public Release Group, active Bench, public Server, active Proxy Server, root domain, wildcard DNS, and TLS; create the Site through Press's normal Site lifecycle and track its Agent Job on the order. Remove the dedicated HostIran and custom Docker-hosting flow from new-site orders.

**Tech Stack:** Frappe/Press Python, Press DocTypes and Agent Jobs, Vue 3 dashboard, ZarinPal, pytest/unittest-compatible mocked tests, Docker Compose deployment.

## Implementation status — 2026-10-13

Tasks 1–4 are implemented on the existing branch. Verification completed with 69 related backend unit tests, 58 dashboard tests, and a successful dashboard production build. The direct ESLint command is blocked by an assertion inside the installed `eslint-plugin-prettier`/ESLint integration and produced no source diagnostic. The dashboard test for `CommerceOrders.vue` checks its SFC source contract; Vite build parses and compiles the full component.

The resolver checks pre-creation DNS directly against the selected active Press Proxy hostname/IP. Press's `check_dns_cname` and `check_dns_a` helpers require an existing `Site` record, so they cannot validate the requested subdomain before checkout. Historical HostIran schema fields remain hidden and read-only pending a production-data audit; no migration has been run.

Task 5 remains pending. The prior read-only live audit found no eligible public Press Bench/Release Group/Proxy destination for Asumi, and live ZarinPal is still sandboxed or lacks production merchant configuration. Do not enable hosting checkout, create a customer Site, migrate, or reload services until the public Press destination is ready and fresh backups of all affected sites have been created and validated.

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
- `press/press/doctype/site_plan/site_plan.json`: hide and make legacy HostIran SKU and monthly-cost fields read-only while keeping native Press plan fields.
- `press/saas/doctype/commerce_order/commerce_order.json`: hide and make legacy HostIran-only order fields read-only until a production-data audit; keep standard `site`, `agent_job`, and provisioning fields.
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

- [x] Add unit tests for a compatible public target, private Release Group, missing Bench app, non-public or inactive Server, missing proxy-domain link, missing wildcard certificate/DNS/TLS, missing plan groups, and no candidate Bench.
- [x] Implement target resolution using only the plan's public Release Groups and the Root Domain's default Cluster. Require an active Bench on an active public Server, an active Proxy Server linked to `asumi.ir`, and the selected plan apps installed on the Bench. Validate pre-creation subdomain DNS against the selected Proxy hostname/IP. Require a Press wildcard TLS Certificate and the existing live wildcard DNS/TLS checks.
- [x] Run the resolver tests as part of the full related backend suite; all passed.

## Task 2: Native Press checkout and order fulfilment

**Files:** Modify `press/saas/commerce/api.py`, `press/saas/commerce/hosting_readiness.py`, `press/saas/commerce/service_delivery.py`; create `press/saas/commerce/test_native_hosting_api.py`; update `press/saas/commerce/test_hosting_capacity_api.py`, `press/saas/commerce/test_hosting_readiness.py`, and `press/saas/commerce/test_order_snapshot.py`.

**Interfaces:**

- `_new_site_plan_config(plan_doc, subdomain=None, ...)` delegates to `resolve_public_site_target` and contains no Docker snapshot, HostIran SKU, or shared-Docker capacity logic.
- `_provision_hosting_order(order)` revalidates the paid order, plan snapshot, team, reserved subdomain, app allowlist, Root Domain, and selected public target; it creates exactly one Press `Site`, records `order.site` and the matching `Agent Job`, and returns while that Agent Job is pending.
- `activate_new_site_commerce_orders(site)` continues to activate only an order whose team, plan, domain, subdomain, and linked Site match after Press reports `Active`; `Broken` becomes `Provisioning Failed`.

- [x] Add mocked tests for public target admission, paid native Site creation, Site/Agent linking, reuse, callback matching, unsupported apps, and rejected unverified payments.
- [x] Replace VPS-specific new-site fulfillment with verified native `Site` insertion through Press's normal Agent Job lifecycle. Persist the Site and Agent Job links; retries reuse the linked Site and wait for Press status updates.
- [x] Update readiness to report public Press infrastructure and fail closed on payment, plan, Root Domain, wildcard DNS/TLS, and outgoing mail checks.
- [x] Keep existing-site upgrades and renewals on the linked Site without recreating it.
- [x] Run the full related backend suite; all 69 tests passed.

## Task 3: Remove HostIran plan/order controls

**Files:** Modify `press/saas/commerce/site_plan_admin.py`, `press/press/doctype/site_plan/site_plan.json`, `press/saas/doctype/commerce_order/commerce_order.json`, `press/hooks.py`, `press/api/site.py`, Site Group Deploy and Deploy Candidate HostIran hooks; update `press/saas/commerce/test_site_plan_admin.py`; remove HostIran-only module/tests.

- [x] Restrict new-site plans to explicit public Release Groups and installed apps; new-site plans force `private_bench_support=0` and `dedicated_server_plan=0`.
- [x] Preserve HostIran schema fields as hidden and read-only pending a production-data audit; no schema migration or field deletion was performed.
- [x] Remove HostIran fulfillment hooks and bypasses while leaving generic Press Site Group Deploy behavior intact; delete the dedicated HostIran implementation and tests.
- [x] Run plan, delivery, and full related backend tests; all passed.

## Task 4: Update customer and admin dashboard

**Files:** Modify `dashboard/src/pages/CommerceOrders.vue`; remove `dashboard/src/utils/hostiranHosting.js` and `dashboard/src/utils/hostiranHosting.test.ts`.

- [x] Add SFC contract tests for public Bench copy, Press Site/Agent Job fields, readiness details, explicit public Release Group selection, and removed HostIran/VPS controls.
- [x] Remove HostIran imports, labels, panels, server assignment/retry calls, SKU and provider cost controls; retain pricing, app selection, upgrades, ZarinPal, and order history.
- [x] Display readiness reasons and the linked Site and Agent Job status.
- [x] Run the dashboard tests (58 passed) and production build; search confirms the old HostIran/VPS copy is absent from this page and its utils.

## Task 5: Production migration and live verification

**Files:** Update the design/implementation docs with actual deployment results; do not change any live settings that enable sales.

- [ ] Run the full related mocked Python test set and dashboard tests/build from Tasks 1–4. Run `git diff --check`, inspect the implementation diff, and confirm native new-site creation does not call HostIran or Docker Control; legacy Docker-hosted site renewals may keep their existing handler.
- [ ] On the live bench, take and validate fresh backups for every site that `bench migrate` will touch before schema migration; no backup is assumed prepared by this plan.
- [ ] Read-only audit the five-site Bench membership, public Server, active public Release Group, Bench app inventory, Proxy Server/domain link, Root Domain, wildcard DNS/TLS, ZarinPal merchant/sandbox state, and SMTP before deployment. Do not expose credentials in shell output.
- [ ] Build dashboard assets from the updated source, deploy the app code to the live bench, and run `bench --site asumi.ir migrate` only after backups validate. Do not turn on paid checkout or create a customer Site; current live readiness has no eligible public Press destination and live ZarinPal remains sandboxed/unconfigured.
- [ ] Perform the already-authorized rolling web/worker reload only after successful migration and asset build. Check `admin_hosting_readiness` returns structured checks, `/dashboard/orders` and its new assets return HTTP 200, order APIs do not expose HostIran fields, and all five public site routes respond as expected.
- [ ] Confirm a public Press site plan remains unavailable while the public Bench/Release Group/Proxy readiness check is false; document exact Press records and DNS/TLS actions needed to make it green. Do not report hosting sales or site creation as active until the real destination and production ZarinPal credentials are ready.
- [ ] Commit deployment notes in Persian after verification; keep checkout settings unchanged.
