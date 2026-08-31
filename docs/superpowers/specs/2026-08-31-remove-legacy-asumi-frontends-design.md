# Remove Legacy Asumi Frontends

## Objective

Remove the unused SaaS and Erpyar marketing frontends so Asumi can be rebuilt
from scratch as a React application.

## Scope

Delete the legacy source applications:

- `dashboard/saas/`
- `dashboard/erpyar/`

Delete their generated website shells and static files:

- `press/www/saas-dashboard.html`
- `press/www/erpyar-app*.html`
- `press/public/erpyar_site/`

Remove the `/saas-app` route rules and `/saas` redirect from `press/hooks.py`.

## Preserved Components

- Native Press dashboard at `/dashboard`
- Frappe Desk at `/desk`
- All customer sites and their databases
- Press backend, teams, server configuration, and Docker runtime

## Result

Until the React marketing site is introduced, `asumi.ir` continues to serve
the existing Frappe root page. The removed public URLs return not found instead
of the old design.

## Verification

Run a source build/import validation for Press, confirm the old paths no longer
resolve, and confirm `/desk` and the active customer sites still respond.
