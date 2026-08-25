# Press Erpyar Phase 2.4

## Recommended strategy
Use route-specific prerender shell pages (static HTML) for Erpyar public routes, generated at build time.

Why this strategy:
- Keeps current Vue SPA intact.
- Avoids full SSR complexity/risk.
- Makes per-route title/description/canonical/OpenGraph visible in initial server HTML.
- Stays host-aware and explicit through `press.routing.resolve_path`.

## Implemented
1. Added build-time shell generator:
- `dashboard/erpyar/scripts/generate-route-shells.mjs`
- Reads built asset paths from `press/www/erpyar-app.html`
- Generates route-specific files in `press/www/`

2. Updated Erpyar frontend build command:
- `dashboard/erpyar/package.json`
- `build` now runs Vite build + shell generator

3. Added explicit route-to-shell mapping:
- `press/routing.py`
- Maps only Erpyar public routes to dedicated shell pages

4. Kept SEO static endpoints host-scoped:
- `robots.txt` and `sitemap.xml` remain Erpyar-specific

5. Applied docs safety fix:
- `press/overrides.py`
- Allows `/docs` on `erpyar.ir`/`www.erpyar.ir` even when global Press docs publishing is disabled

## Generated prerender shells
- `press/www/erpyar-app.html`
- `press/www/erpyar-app-products.html`
- `press/www/erpyar-app-products-erpnext.html`
- `press/www/erpyar-app-products-crm.html`
- `press/www/erpyar-app-products-hr.html`
- `press/www/erpyar-app-products-hosting.html`
- `press/www/erpyar-app-marketplace.html`
- `press/www/erpyar-app-pricing.html`
- `press/www/erpyar-app-docs.html`
- `press/www/erpyar-app-contact.html`
- `press/www/erpyar-app-demo.html`

Each shell includes:
- title
- meta description
- canonical
- OG title/description/url
- noscript body content
- same Vue assets for hydration

## Deploy
Official path used:
- `docker build -t den-v16-erpnext:custom .`
- `docker compose up -d backend websocket queue-short queue-long scheduler`
- site cache clear for `erpyar.ir`

## Verification highlights
- Server-visible route metadata verified over HTTPS via curl/requests.
- All target Erpyar routes return 200 and route-specific `x-page-name`.
- `/saas`, `/saas-app`, `/login`, `/dashboard`, `/api/*` unchanged.
- `denroom.ir` root unchanged.

## Schema impact
- No DocType added.
- No Custom Field added.
