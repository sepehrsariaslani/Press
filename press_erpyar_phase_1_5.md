# Erpyar Phase 1.5 Report (Production-safe root mapping)

Date: 2026-04-28

## Inspection summary

### 1) Is `erpyar.ir` a separate Frappe site?
Yes.
- Found site directory: `den-v16-runtime/sites/erpyar.ir`
- Site config host: `"host_name": "https://erpyar.ir"`
- Site record confirms primary host mapping: `Site.name = erpyar.ir`, `Site.host_name = erpyar.ir`

### 2) Is `erpyar.ir` only a domain alias on another site?
No.
- `Site Domain` record for this site exists and is active:
  - `domain = erpyar.ir`
  - `redirect_to_primary = 0`

### 3) Is there a reverse proxy/domain mapping layer?
Yes, at platform level there is host-based site routing (multi-site behavior), and Press uses Site/Site Domain mapping.
- In this runtime compose stack, no dedicated nginx service is defined in `docker-compose.yml`.
- Requests are still host-aware (`Host: erpyar.ir`) and routed to the correct site by Frappe site resolution.

### 4) How is current root `/` served?
Current root for `Host: erpyar.ir` returns login page.
- Response headers include: `X-Page-Name: login`

### 5) Is there `press/www/index.html` root page?
No.
- No `press/www/index.html` exists.

### 6) Is Website Settings Home Page used?
Yes (Frappe default mechanism).
- `Website Settings.home_page` for `erpyar.ir` is currently empty.
- With empty value, Frappe falls back to `login` for Guest.

### 7) Existing `website_route_rules` in hooks.py?
Yes:
- `/dashboard/<path:app_path>` -> `dashboard`
- `/saas-app` -> `saas-dashboard`
- `/saas-app/<path:app_path>` -> `saas-dashboard`

### 8) Any host-based route mechanism already used?
Yes, host-based site resolution exists (multi-site) and Site Domain mapping is already in use.
In app-level website routing, there was no host-specific root resolver before this phase.

## Chosen routing/domain strategy

Chosen: **Option C (host-aware root handler in Press app)**

Why:
- Isolated and production-safe: only affects `erpyar.ir` host root path.
- No global `/` redirect.
- No changes to `/saas` or `/saas-app` logic.
- Keeps `/erpyar/` as direct testing route.
- Avoids relying on infra-level nginx changes for this phase.

Behavior implemented:
- If request host is `erpyar.ir` or `www.erpyar.ir` and path is `/`, serve route `erpyar`.
- For all other hosts/paths, fallback to Frappe default resolver.

## Implementation details

1. Added a host-aware website path resolver:
- `press/routing.py`
  - `resolve_path(path)`
  - maps only root + Erpyar host to `erpyar`
  - delegates all other cases to default Frappe `resolve_path`

2. Registered resolver hook:
- `press/hooks.py`
  - `website_path_resolver = ["press.routing.resolve_path"]`

No changes were made to:
- `/saas`
- `/saas-app`
- DocTypes / Custom Fields

## Rollback plan

If rollback is needed:
1. Remove hook from `press/hooks.py`:
   - delete `website_path_resolver = ["press.routing.resolve_path"]`
2. Remove file `press/routing.py` (or stop referencing it).
3. Clear cache / restart workers after deploy.

This reverts root routing behavior to prior default.

## Validation checklist (post-deploy)

- `https://erpyar.ir/` shows Erpyar homepage content.
- `https://erpyar.ir/erpyar/` still works.
- `/saas` and `/saas-app` remain unchanged.
- Press dashboard routes continue working.
- No global root redirect affects other domains.
- No DocTypes added.
- No Custom Fields added.

## Warnings

- This phase assumes `press/www/erpyar/` is present in the deployed Press build.
- In environments where that route is not yet deployed, root mapping to `erpyar` will not render as intended.

## Next recommended phase

1. Deploy this Press app change to the runtime used by `erpyar.ir`.
2. Run route-level smoke tests for `erpyar.ir` and at least one non-erpyar domain.
3. Replace placeholder links/content with real destinations and API-fed content.
4. Optionally set `Website Settings.home_page = erpyar` on `erpyar.ir` as an explicit operational fallback.
