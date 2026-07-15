# Erpyar Phase 1.7 - Persistence & Official Deploy Validation

Date: 2026-04-28

## Source of truth identified
- Docker image build context: `/home/sepehr/den-v16-docker`
- Press app canonical path for image build: `/home/sepehr/den-v16-docker/apps/press`
- Image build copies app code from `apps/` into runtime (`Dockerfile`: `COPY apps/ /opt/custom-apps/`)

## Persisted changes in source of truth
- `press/www/erpyar/__init__.py`
- `press/www/erpyar/data.py`
- `press/www/erpyar/index.py`
- `press/www/erpyar/index.html`
- `press/routing.py`
- `press/hooks.py` with `website_path_resolver = ["press.routing.resolve_path"]`
- `press_erpyar_phase_1.md`
- `press_erpyar_phase_1_5.md`

## Official deploy method used
- `docker compose build backend websocket queue-short queue-long scheduler`
- `docker compose up -d backend websocket queue-short queue-long scheduler`

## Runtime verification
- Files exist in running container under `/home/frappe/frappe-bench/apps/press/press/www/erpyar/`
- `press/routing.py` exists in running container
- `frappe.get_hooks('website_path_resolver') -> ['press.routing.resolve_path']`
- `Website Settings.home_page` for `erpyar.ir` is `erpyar`

## External HTTPS verification
- `https://erpyar.ir/` -> `200`, `X-Page-Name: erpyar`
- `https://erpyar.ir/erpyar/` -> `301` to `/erpyar` (canonical) then Erpyar page
- `https://erpyar.ir/saas` -> unchanged `301` to `/saas-app`
- `https://erpyar.ir/saas-app` -> unchanged `200`, `X-Page-Name: saas-dashboard`
- `https://erpyar.ir/login` -> unchanged `200`, `X-Page-Name: login`
- `https://erpyar.ir/dashboard` -> unchanged `200`, `X-Page-Name: dashboard`

## Host isolation verification
- `https://denroom.ir/` -> unchanged `200`, `X-Page-Name: home-page`

## Rollback
1. Remove `website_path_resolver` from `press/hooks.py`
2. Remove `press/routing.py`
3. Optionally remove `press/www/erpyar/`
4. Rebuild/redeploy official image via docker compose build + up
5. Optionally set `Website Settings.home_page` back to previous value on `erpyar.ir`
