# Remove Legacy Asumi Frontends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove obsolete SaaS and Erpyar public interfaces while preserving Press administration and live customer sites.

**Architecture:** Delete only the two unneeded frontend source trees and generated public shells. Remove their Frappe routes so the old URLs no longer resolve. Native Press and Frappe routes remain unchanged.

**Tech Stack:** Git, Frappe website routing, Press.

## Global Constraints

- Preserve `/dashboard`, `/desk`, customer sites, databases, and Docker runtime.
- Delete `dashboard/saas`, `dashboard/erpyar`, their generated HTML, and Erpyar static output.
- Remove only `/saas-app` route rules and `/saas` redirect.
- Do not introduce the React replacement in this change.

---

### Task 1: Delete obsolete public interfaces

**Files:**
- Delete: `dashboard/saas/`, `dashboard/erpyar/`, `press/www/saas-dashboard.html`, `press/www/erpyar-app*.html`, `press/public/erpyar_site/`
- Modify: `press/hooks.py`
- Test: Frappe import check and HTTP route verification

- [ ] **Step 1: Remove legacy tracked assets and source trees**

Run:

    git rm -r dashboard/saas dashboard/erpyar press/www/saas-dashboard.html press/www/erpyar-app*.html press/public/erpyar_site

Expected: only specified tracked legacy files are staged for deletion.

- [ ] **Step 2: Remove obsolete routes**

Delete these entries from `press/hooks.py`:

    {"from_route": "/saas-app", "to_route": "saas-dashboard"},
    {"from_route": "/saas-app/<path:app_path>", "to_route": "saas-dashboard"},
    {"source": "/saas", "target": "/saas-app"},

Expected: no Frappe route references a deleted public shell.

- [ ] **Step 3: Validate server imports and routes**

Run:

    docker exec den-v16-backend bash -lc 'cd /home/frappe/frappe-bench && bench --site asumi.ir execute frappe.get_all --kwargs "{\"doctype\": \"Team\", \"fields\": [\"name\"], \"limit_page_length\": 1}"'

Then request `/saas-app`, `/desk`, `https://dehati.ir/`, `https://denroom.ir/`, and `https://veederakht.ir/`.

Expected: `/saas-app` no longer returns the old app; native admin and live site availability are unaffected.

- [ ] **Step 4: Commit and push the removal**

    git add press/hooks.py
    git commit -m "chore: remove legacy Asumi frontends"
    git push origin server-snapshot-20260825

Expected: GitHub snapshot branch contains the cleanup.
