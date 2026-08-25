# Erpyar Phase 1.6 Validation Report

Date: 2026-04-28

## Deployment status

Initial runtime status (before fix):
- `press/www/erpyar/*` not present in running backend container.
- `press/routing.py` not present.
- `hooks.py` did not contain `website_path_resolver`.
- Result: `Host: erpyar.ir /` served login page and `/erpyar/` was 404.

Actions performed:
1. Synced Phase 1 + 1.5 files into runtime app path in container.
2. Restarted backend/websocket containers.
3. Cleared cache and website cache for `erpyar.ir`.
4. Diagnosed stale hook cache and removed `app_hooks` cache key.
5. Re-cleared cache and validated hook load.
6. Set `Website Settings.home_page = erpyar` as fallback on `erpyar.ir`.

Runtime app version traceability:
- `frappe 16.16.0 UNVERSIONED`
- `press 0.7.0 UNVERSIONED`
- No git metadata inside runtime image (`NO_GIT_METADATA`).

## Runtime checks performed

- Verified deployed files in running container:
  - `/home/frappe/frappe-bench/apps/press/press/www/erpyar/*`
  - `/home/frappe/frappe-bench/apps/press/press/routing.py`
  - `website_path_resolver` in `/home/frappe/frappe-bench/apps/press/press/hooks.py`
- Confirmed hook loading after cache cleanup:
  - `frappe.get_hooks('website_path_resolver') -> ['press.routing.resolve_path']`
- HTTP smoke tests via backend container with host header simulation.

## Smoke test results

1. `Host: erpyar.ir GET /`
- After fix: `200`, `X-Page-Name: erpyar`, Erpyar title/body markers present.

2. `Host: erpyar.ir GET /erpyar/`
- After fix: `200`, `X-Page-Name: erpyar`, Erpyar markers present.

3. `Host: erpyar.ir GET /saas`
- Unchanged: `301` redirect to `/saas-app`.

4. `Host: erpyar.ir GET /saas-app`
- Unchanged: `200`, `X-Page-Name: saas-dashboard`.

5. `Host: erpyar.ir GET /login` and `/dashboard`
- Unchanged: both return expected pages (`X-Page-Name: login` and `dashboard`).

6. Non-erpyar host root (`Host: denroom.ir GET /`)
- Unchanged: still serves its own root (`X-Page-Name: home-page`).

## Root-cause diagnosis of mismatch

Why root initially still showed login / `/erpyar/` 404:
- Runtime deployment mismatch: new files were absent in the running container.
- Hook cache mismatch: `app_hooks` cache retained old hook map until explicit deletion.

## Final go-live readiness

Status: **Ready**, with caveat.
- Routing behavior for erpyar host now works as intended.
- Existing `/saas` and `/saas-app` behavior remains intact.
- Other hosts are not globally affected.

Caveat:
- Changes were applied to the running container for validation; ensure the same changes are baked into the canonical deployment artifact/image to survive full re-deploy/recreate.

## Recommendation about Website Settings fallback

Recommended: **Yes**.
- `Website Settings.home_page = erpyar` on `erpyar.ir` is a safe fallback (site-specific) and was applied.
- It does not create global `/` impact on other domains.
