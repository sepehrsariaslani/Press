# Erpyar Phase 1 Report (Press App)

## Date
2026-04-28

## 1) What was inspected

### Press website/frontend structure
- Website routes are primarily served from `press/www/**` with Frappe web templates (`.html`) and optional Python context files (`.py`).
- Existing marketing pages follow this pattern, e.g. `press/www/marketplace/index.html` + `index.py`.
- Shared website templates are under `press/templates/**`.

### Vue architecture and build system
- Main dashboard frontend lives in `dashboard/src` and builds to `press/public/dashboard`.
- A separate SaaS Vue app exists in `dashboard/saas` with:
  - entry: `dashboard/saas/src/main.js`
  - router: `dashboard/saas/src/router/index.js`
  - build config: `dashboard/saas/vite.config.js`
- SaaS Vue build output is configured to:
  - static assets: `press/public/saas_dashboard`
  - Frappe page shell: `press/www/saas-dashboard.html`

### Routing conventions discovered
- `press/hooks.py` defines:
  - `/saas-app` and `/saas-app/<path:app_path>` -> `saas-dashboard`
  - redirect `/saas` -> `/saas-app`
- This means `/saas-app` serves the Vue SPA wrapper page, while `/saas/` is currently redirected.

## 2) How `/saas/` currently works

Files related to `/saas/` and SaaS web delivery include:
- `press/www/saas/index.html`
- `press/www/saas/index.py`
- `press/www/saas/billing.html`
- `press/templates/saas/*.html`
- `press/www/saas-dashboard.html`
- `dashboard/saas/**` (Vue SPA)
- `press/public/saas_dashboard/**` (built Vue assets)

Current rendering behavior:
- `press/www/saas/index.html` is a Jinja website page with large inline CSS/JS and server-provided payload from `index.py`.
- `index.py` queries `Saas App`, `Saas App Plan`, `Product Trial`, and `Site Plan` to build dynamic pricing/trial/resource payload.
- Separately, `/saas-app` serves Vue SPA (built from `dashboard/saas`) through `press/www/saas-dashboard.html`.

Assessment:
- `/saas/` and SaaS routes are tightly coupled with existing trial, billing, and app catalog logic.
- Redesigning `/saas/` in place for Erpyar marketing introduces avoidable risk to current SaaS flows.

## 3) Chosen implementation strategy

### Decision
**Option (c): create a new homepage implementation and keep `/saas/` as reference.**

### Why this is safest
- Avoids regression in existing SaaS billing/trial flows.
- Keeps Erpyar marketing foundation isolated and maintainable.
- Follows Press route conventions (`press/www/<route>/index.html` + `index.py`).
- No DocType or schema changes required.

## 4) What was implemented in this phase

A new isolated Persian RTL marketing homepage shell at:
- Route: `/erpyar/`

Sections implemented:
- Header
- Hero
- Trust/Stats cards
- Product overview
- Marketplace preview
- Press hosting/infrastructure section
- FAQ preview
- Final CTA
- Footer

Data layer:
- Mock local content source (`data.py`) used by `index.py`
- No backend integration in this phase

Design/RTL:
- RTL enabled at page root
- Isolated style scope under `#erpyar-home`
- Design tokens added per requested palette and radius system
- Responsive behavior for desktop/mobile

## 5) Files added

- `press/www/erpyar/__init__.py`
- `press/www/erpyar/data.py`
- `press/www/erpyar/index.py`
- `press/www/erpyar/index.html`
- `press_erpyar_phase_1.md`

## 6) Files modified

- None

## 7) How to run/view the new homepage

1. Start the Press/Frappe environment as usual.
2. Open:
   - `https://<your-site-domain>/erpyar/`

If routing/cache is stale, run the normal site clear/restart process used in your environment.

## 8) How to connect this to `erpyar.ir`

Recommended rollout path:
1. Keep `/erpyar/` as staging route for content/design QA.
2. Map `erpyar.ir` to the Press site using your normal **Site Domain** process.
3. Make homepage point to Erpyar by one of these options:
   - Set website home page route to `erpyar`.
   - Add a route rule/redirect from `/` to `/erpyar/` for that domain.
   - Use domain-level redirect rules only if home-page route override is not desired.

Suggested production choice:
- Preferred: set home page route to `erpyar` for the target domain, avoiding broad global redirect side effects.

## 9) Limitations in Phase 1

- Placeholder links and placeholder Persian copy are used.
- No live integration to product/pricing/marketplace backend APIs.
- No A/B structure, analytics events, or conversion tracking yet.
- No domain-conditional routing logic added in this phase.

## 10) Recommended next phase

1. Connect cards/sections to live Press APIs (products, plans, marketplace).
2. Add domain-aware home routing for `erpyar.ir` with minimal side effects.
3. Replace placeholder links with real routes.
4. Add SEO enrichments (structured data, canonical, social previews).
5. Add visual QA pass and basic automated UI checks for RTL/responsive behavior.
