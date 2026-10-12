# Asumi Customer Catalog Implementation Plan

> **For agentic workers:** Execute this plan inline in the current session. Keep the broader approved commerce design active; this plan delivers the first independently verifiable catalog slice.

**Goal:** Replace the misleading SaaS calculator with an Asumi-branded customer catalog that shows only published apps and real enabled Marketplace plan prices.

**Architecture:** Read the public app list from `Marketplace App` and enabled `Marketplace App Plan` documents on the Asumi Press site. Shape the data with pure Python helpers, render it through escaped Jinja templates, and use the existing marketplace detail/install flow. Remove the hard-coded infrastructure estimator and invented resource defaults. Keep hosting purchase unavailable until the approved commerce work adds real capacity validation and a customer checkout.

**Tech Stack:** Frappe website controllers and Jinja, Python standard library `unittest`, existing Press Marketplace DocTypes, CSS.

## Global Constraints

- Keep all existing published application plans at their current zero prices.
- Never infer a price, billing period, or resource requirement when the source record is missing.
- Show a plan as free only when it has an enabled plan whose stored INR and USD prices are both zero.
- Display nonzero existing prices with their actual stored currency labels; never label INR or USD values as toman.
- Use Jinja auto-escaping for app titles, descriptions, identifiers, and routes; do not build HTML strings from database values.
- Do not expose a hosting purchase button while no capacity-checked hosting offer and checkout exist.
- Do not enable or simulate live payment as part of this catalog slice.
- Keep `/marketplace`, `/saas`, and `/pricing` routes available and preserve the existing install flow.

---

### Task 1: Add Pure Catalog Rules and Regression Tests

**Files:**
- Create: `press/www/saas/catalog.py`
- Create: `press/www/saas/test_catalog.py`

**Interfaces:**
- Produces: `build_marketplace_catalog(app_rows, plan_rows)` returning public app dictionaries with their actual enabled plans and `is_free` status.
- Produces: `format_plan_prices(plan)` returning only the stored `price_inr`, `price_usd`, and interval labels.
- Consumes: plain dictionaries from Frappe list queries; the module must not import or call Frappe.

- [ ] **Step 1: Write failing tests for actual app-plan values**

Add tests proving that disabled plans are omitted, zero-priced enabled plans are labeled free, nonzero INR/USD values stay in their original currencies, and apps without an enabled plan are not represented as purchasable.

- [ ] **Step 2: Run the pure catalog test module and confirm it fails**

Run: `python3 -m unittest press.www.saas.test_catalog -v`

Expected: import or missing-function failures for `press.www.saas.catalog`.

- [ ] **Step 3: Implement the smallest pure catalog helpers**

Keep all price and interval decisions in this module so they can be tested without a live site or payment credentials.

- [ ] **Step 4: Run the catalog tests and confirm they pass**

Run: `python3 -m unittest press.www.saas.test_catalog -v`

Expected: every catalog-rule test passes.

### Task 2: Replace SaaS Context with Current Marketplace Data

**Files:**
- Modify: `press/www/saas/index.py`
- Test: `press/www/saas/test_catalog.py`

**Interfaces:**
- Consumes: the pure helpers from Task 1.
- Produces: `context.marketplace_apps`, `context.hosting_available = False`, and Asumi Persian page metadata.

- [ ] **Step 1: Add controller tests for the page context contract**

Test that the controller requests only `Marketplace App` records with status `Published`, queries only enabled `Marketplace App Plan` rows for those app IDs, and returns no guessed hosting rates or resource defaults when no Site Plan exists.

- [ ] **Step 2: Run the focused tests and confirm the current controller fails**

Run: `python3 -m unittest press.www.saas.test_catalog -v`

Expected: failures for the missing marketplace context and old SaaS-only context.

- [ ] **Step 3: Implement the page data queries and Asumi metadata**

Query all published Marketplace Apps and only their enabled plans. Do not load or expose private seller fields. Do not expose hosting plans as purchasable while capacity validation and checkout are absent.

- [ ] **Step 4: Re-run the focused tests**

Run: `python3 -m unittest press.www.saas.test_catalog -v`

Expected: all controller contract tests pass.

### Task 3: Replace the Fixed Calculator with Escaped Asumi Catalog Cards

**Files:**
- Modify: `press/www/saas/index.html`
- Create: `press/public/css/asumi-commerce.css`
- Test: `press/www/saas/test_catalog.py`

**Interfaces:**
- Consumes: the context produced by Task 2.
- Produces: an Asumi-branded `/saas` catalog with links to real Marketplace app detail pages, an explicit no-hosting-offer state, and a link to the existing app-price editor for authorized users.

- [ ] **Step 1: Add template regression tests**

Assert that the template has no old `DEN Cloud` branding, fixed `390000`, `160000`, or `4200` rates, guessed resource values, or client-side `innerHTML` rendering of product data.

- [ ] **Step 2: Run the regression tests and confirm they fail on the existing template**

Run: `python3 -m unittest press.www.saas.test_catalog -v`

Expected: failures identify the current brand, hard-coded rates, and unsafe rendering.

- [ ] **Step 3: Render apps and plans through Jinja auto-escaping**

Render one card per published app with an enabled plan. A zero-priced app plan is labeled `رایگان`; nonzero values use `₹` and `$` labels alongside the stored interval. Link each card to its existing `Marketplace App.route`. Link the authorized price-management action to `/dashboard/seller/apps`. Render no hosting purchase CTA while `hosting_available` is false.

- [ ] **Step 4: Add the Asumi black-and-red public catalog stylesheet**

Use `#080808`, `#141212`, `#c63140`, `#ff6670`, light text, and responsive RTL card grids. Keep the existing Press login and Marketplace routes as the destinations for account and app actions.

- [ ] **Step 5: Run the focused regression tests**

Run: `python3 -m unittest press.www.saas.test_catalog -v`

Expected: no stale fixed-rate or unsafe product-rendering patterns remain.

### Task 4: Build and Verify the Live Catalog Routes

**Files:**
- Review: `press/www/saas/index.py`
- Review: `press/www/saas/index.html`
- Review: `press/public/css/asumi-commerce.css`

**Interfaces:**
- Consumes: the server-rendered catalog from Tasks 1–3.
- Produces: live `/saas` and `/pricing` pages with no fabricated prices and a functioning link to the existing Marketplace app flow.

- [ ] **Step 1: Run the full catalog tests and Python syntax check**

Run: `python3 -m unittest press.www.saas.test_catalog -v`

Run: `python3 -m compileall -q press/www/saas/index.py press/www/saas/catalog.py`

- [ ] **Step 2: Build the Press public assets**

Run: `bench build --app press`

Expected: Press build exits with status 0 and includes `asumi-commerce.css`.

- [ ] **Step 3: Verify live routes and product data**

Request `/saas`, `/pricing`, and `/marketplace`; verify HTTP 200, Asumi title and branding on the pricing route, all 24 published apps are represented through the catalog data, current zero-priced plans show as free, and no fixed infrastructure amounts appear.

- [ ] **Step 4: Commit only this implementation with a Persian message**

Run `git diff --check`, stage only the files listed in this plan, then commit with a Persian message describing the data-backed catalog and removal of fabricated pricing.

---

## Deferred Approved Commerce Work

This slice does not complete the full approved commerce objective. Continue afterward with a Press admin interface for Site Plans, Iranian currency, provider configuration, order records, verified payment callbacks, capacity checks, provisioning retries, and customer subscription management. Live payments must remain disabled until a payment provider is selected and its credentials are configured in the secure Press settings UI.
