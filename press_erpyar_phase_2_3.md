# Press Erpyar Phase 2.3

## Goal
Improve Erpyar public SPA content structure, SEO metadata baseline, and lead-capture groundwork without impacting existing Press/SaaS routes.

## Implemented
- Expanded all Erpyar Vue public pages with production-oriented Persian content.
- Added reusable content/data layer in `dashboard/erpyar/src/content.js`.
- Added client-side SEO helper in `dashboard/erpyar/src/seo.js`:
  - dynamic title
  - dynamic meta description
  - OpenGraph tags
  - canonical link
- Updated Vue router metadata for all public routes.
- Added host-scoped SEO static endpoints for Erpyar:
  - `/robots.txt` -> `erpyar-robots.txt`
  - `/sitemap.xml` -> `erpyar-sitemap.xml`
- Added frontend-only lead capture groundwork:
  - Contact form with validation
  - Demo request form with validation
  - localStorage persistence (`erpyar_leads`)

## Routing Safety
- No changes to `/saas` / `/saas-app` route rules.
- Host-aware resolver still only affects:
  - `erpyar.ir`
  - `www.erpyar.ir`
- Non-Erpyar hosts keep default resolver behavior.

## Build & Deploy
- Erpyar SPA rebuilt via Vite.
- Built assets persisted in source under `press/public/erpyar_site/assets/*`.
- Official image rebuilt and deployed via:
  - `docker build -t den-v16-erpnext:custom .`
  - `docker compose up -d backend websocket queue-short queue-long scheduler`
- Cache refresh executed for `erpyar.ir`.

## Validation
- Public Erpyar routes serve `x-page-name: erpyar-app`.
- `/erpyar` route remains available.
- `/saas`, `/saas-app`, `/login`, `/dashboard` unchanged.
- `denroom.ir` root unchanged.

## Limitations
- SPA per-route title/description updates happen client-side after JS mount; raw HTML response contains base meta tags.
- Lead-capture data currently stored client-side only; backend API not yet connected.

## Recommended Next Phase
- Add minimal backend endpoint for lead capture and persist to one dedicated DocType.
- Add server-side SEO strategy for richer crawler behavior (SSR/prerender or static route pages for critical landing URLs).
