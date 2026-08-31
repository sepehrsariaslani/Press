# Asumi Site Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a separate Frappe site at `asumi.ir`, install Press on it, and make it reachable securely without changing existing sites.

**Architecture:** `asumi.ir` is a new Frappe site in the existing Docker bench. It uses the existing MariaDB, Redis, backend, scheduler, and websocket services. Frappe host-based routing maps the incoming hostname to the `sites/asumi.ir` directory; the existing web proxy must preserve the Host header.

**Tech Stack:** Frappe v16, Press app, Docker Compose, MariaDB, Redis, host reverse proxy and TLS.

## Global Constraints

- Create a new site only; never modify or delete `dehati.ir`, `denroom.ir`, or `veederakht.ir`.
- Install only `frappe` and `press` for this bootstrap.
- Do not print or commit the Administrator password.
- Keep `erpyar.ir` unchanged until `asumi.ir` is verified over HTTPS.
- Stop if `asumi.ir` already exists or Press installation fails.

---

### Task 1: Create the Frappe site

**Files:**
- Create: `/home/sepehr/den-v16-docker/runtime/sites/asumi.ir/site_config.json` through `bench new-site`.

**Interfaces:**
- Consumes: DNS records for `asumi.ir` and shared bench configuration at `sites/common_site_config.json`.
- Produces: an isolated Frappe site named `asumi.ir`.

- [ ] Verify that `sites/asumi.ir` is absent and `asumi.ir` resolves to `62.60.207.82`.
- [ ] Run `bench new-site asumi.ir` with database and Administrator passwords supplied only through command environment variables.
- [ ] Verify `curl -H 'Host: asumi.ir' http://127.0.0.1:8090/api/method/frappe.ping` returns `pong`.

### Task 2: Install Press

**Files:**
- Modify: `/home/sepehr/den-v16-docker/runtime/sites/asumi.ir/installed_apps.json` through Frappe installation.

**Interfaces:**
- Consumes: the new `asumi.ir` site and `/home/frappe/frappe-bench/apps/press`.
- Produces: an Asumi site with Frappe and Press installed.

- [ ] Confirm `python -c 'import press'` succeeds inside the bench.
- [ ] Run `bench --site asumi.ir install-app press`, `migrate --skip-search-index`, and `clear-cache`.
- [ ] Verify `bench --site asumi.ir list-apps` includes `frappe` and `press`; verify `/desk` is non-5xx locally.

### Task 3: Public delivery verification

**Files:**
- Verify: host proxy and TLS configuration, which are not committed to this repository.

**Interfaces:**
- Consumes: the new Frappe site and the existing listeners on ports 80 and 443.
- Produces: reachable HTTPS entrypoints for `asumi.ir` and `www.asumi.ir`.

- [ ] Test HTTP and HTTPS for both Asumi hostnames.
- [ ] If the proxy has no route or valid certificate, stop before changing `erpyar.ir` and report the exact missing configuration.
- [ ] Commit only this plan document; never commit runtime site files, database credentials, or Administrator credentials.
