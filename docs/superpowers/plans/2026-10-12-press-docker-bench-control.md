# Press Docker Bench Control Implementation Plan

> **For agentic workers:** Implement one task at a time and stop at each production rollout checkpoint. This plan is sequential because the Press API, dashboard, and host agent share one operation protocol.

**Goal:** Add a Press dashboard on `asumi.ir` that manages `boller.ir`, `dehati.ir`, `denroom.ir`, and `veederakht.ir` on their current Docker Compose bench.

**Architecture:** A Python 3.12 standard-library agent runs as a host service and exposes a private, authenticated, typed API. The Press app stores host/site/operation records, validates every request, and queues long-running operations. A Vue dashboard shows the four target sites and requires a two-stage backup and confirmation flow for shared-bench writes. Press web and worker containers do not receive the Docker socket.

**Tech Stack:** Frappe/Press 16, Python 3.12 standard library, Vue 3, `frappe-ui`, Vite, systemd, Docker Compose.

## Global Constraints

- Manage exactly `boller.ir`, `dehati.ir`, `denroom.ir`, and `veederakht.ir` as customer sites.
- Keep `asumi.ir` out of the customer-site list; include it in impact and backup sets for shared operations.
- Keep all five sites on the existing Compose bench; do not create native Press Cloud `Server`, `Bench`, or `Site` records.
- Shared service restarts and app deployments back up all five sites, show the `asumi.ir` impact, and require a second confirmation after backups finish.
- Migrate only the sites whose discovered installed-app list includes the app being deployed.
- Reject arbitrary shell commands, arbitrary filesystem paths, arbitrary container names, and unknown site domains.
- Store shared credentials outside source control and never include secret values or raw site configuration in API responses or logs.
- Restrict the dashboard API to the Frappe `Administrator` user. Leave `boller.ir` without a Team link until one is explicitly requested.
- Preserve the existing local modifications to `press/routing.py` and `press/www/asumi.html` in the primary checkout; never reset or overwrite them during integration or deployment.
- Do not add or run automated tests unless the user explicitly requests tests. Use compile, lint, build, and read-only production checks for this work.

---

### Task 1: Build the host agent and private protocol

**Files:**
- Create: `press/docker_control_agent/__init__.py`
- Create: `press/docker_control_agent/config.py`
- Create: `press/docker_control_agent/auth.py`
- Create: `press/docker_control_agent/inventory.py`
- Create: `press/docker_control_agent/operations.py`
- Create: `press/docker_control_agent/service.py`
- Create: `press/docker_control_agent/README.md`
- Create: `press/docker_control_agent/systemd/press-docker-control-agent.service`
- Create: `press/docker_control_agent/config.example.json`

**Interfaces:**
- `load_config(path: str) -> AgentConfig` reads the protected host config, verifies the configured Compose root, backend container, allowed services, app root, backup root, and exact site lists, and fails closed if any path is outside its configured root.
- `verify_request(method: str, path: str, timestamp: str, nonce: str, body: bytes, signature: str) -> None` verifies the HMAC, request age, and one-use nonce before dispatch.
- `get_inventory(config: AgentConfig) -> dict` returns host resources, Compose status, all five domains, and the installed app/version list reported by `bench --site <domain> list-apps --format json`.
- `start_operation(operation_id: str, action: str, target: str | None, arguments: dict) -> dict` accepts only the action allowlist and stores a durable job record before returning.
- `get_operation(operation_id: str) -> dict` returns the saved state and sanitized result for that operation only.

- [ ] **Step 1: Add configuration validation and fixed inventory.**

Create `config.example.json` with the fixed Compose project directory, Compose file, backend container, app directory, backup directory, exact four customer domains, `asumi.ir` impact domain, and the allowed Compose service names. Read the HMAC key only from a root-readable environment file. Resolve configured paths with `realpath` and reject paths outside the configured project or backup roots.

Use these domain lists:

```json
{
  "customer_sites": [
    "boller.ir",
    "dehati.ir",
    "denroom.ir",
    "veederakht.ir"
  ],
  "impact_sites": [
    "asumi.ir",
    "boller.ir",
    "dehati.ir",
    "denroom.ir",
    "veederakht.ir"
  ]
}
```

- [ ] **Step 2: Implement signed request validation.**

Canonicalize each request as `METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + NONCE + "\n" + SHA256(BODY)`. Verify its HMAC-SHA256 with `hmac.compare_digest`, reject timestamps older than 30 seconds, cap request bodies at 64 KiB, and record consumed nonces in the agent's SQLite state database. Return the same generic authentication error for invalid signatures and expired/replayed requests.

- [ ] **Step 3: Implement read-only health and inventory handlers.**

Use subprocess argument arrays with `shell=False`. Read memory and disk from the host, run `docker compose ps --format json` only against the configured Compose directory/file, and query the five sites from the fixed backend container. Return domain, status, installed app, version, and branch fields only. Never return `site_config.json`, database credentials, or raw environment output.

- [ ] **Step 4: Add durable operation submission and polling.**

Persist the operation ID, action, target, state, start/end times, bounded progress text, and sanitized result in SQLite under `/var/lib/press-docker-control-agent/`. Make repeated submission of the same ID idempotent. Return `Accepted`, `Running`, `Success`, or `Failure`; reject an operation ID reused with a different action or payload.

- [ ] **Step 5: Add the systemd unit and operator instructions.**

Run the agent independently of the Compose stack so it remains available while Docker services restart. Bind only to the Docker bridge host-gateway address, require HMAC authentication on every endpoint, and do not expose or publish the agent port publicly. The service may invoke Docker because it is the host control point; Press containers must not mount `/var/run/docker.sock`. Document the privileges, config path, key rotation, start/stop/status commands, and recovery steps in `README.md`.

- [ ] **Step 6: Run non-test static checks for the agent.**

Run:

```bash
python3 -m compileall press/docker_control_agent
ruff check press/docker_control_agent
ruff format --check press/docker_control_agent
```

Expected: compilation and lint/format checks complete without errors. Do not run a test suite.

### Task 2: Add Press host, site, and operation records

**Files:**
- Create: `press/press/doctype/docker_control_host/docker_control_host.json`
- Create: `press/press/doctype/docker_control_host/docker_control_host.py`
- Create: `press/press/doctype/docker_control_site/docker_control_site.json`
- Create: `press/press/doctype/docker_control_site/docker_control_site.py`
- Create: `press/press/doctype/docker_control_site_app/docker_control_site_app.json`
- Create: `press/press/doctype/docker_control_site_app/docker_control_site_app.py`
- Create: `press/press/doctype/docker_control_operation/docker_control_operation.json`
- Create: `press/press/doctype/docker_control_operation/docker_control_operation.py`
- Modify: `press/press/doctype/__init__.py` only if an explicit registration is required by the existing Frappe convention

**Interfaces:**
- `Docker Control Host` stores the private endpoint, encrypted HMAC key, agent/protocol version, connection status, last inventory time, and Compose project label.
- `Docker Control Site` stores one of the exact four customer domains, its host, enabled state, optional Team link, and discovered app rows. It does not link to the native Press `Site` doctype.
- `Docker Control Operation` stores action, target, impact domains, selected revision/service, confirmation state, status, timestamps, sanitized progress, and sanitized result.
- `assert_docker_control_admin() -> None` permits only `frappe.session.user == "Administrator"` and is called by every API method and document action.

- [ ] **Step 1: Define the three DocTypes and app child table.**

Follow the JSON/controller patterns of `Site Backup` and `Agent Job`. Make host credentials Password fields; make discovered state and operation output read-only. Define operation states as `Preparing Backup`, `Awaiting Confirmation`, `Queued`, `Running`, `Success`, and `Failure`. Define the app child table with `app`, `version`, and `branch` fields.

- [ ] **Step 2: Apply exact-domain validation in controllers.**

Share one constant containing the four customer domains. Reject `asumi.ir`, any other hostname, duplicate domains, and a site whose host is not the sole registered Docker Control Host. Keep the Team field optional; do not create or infer a Team for Boller.

- [ ] **Step 3: Add explicit idempotent registration.**

Create an Administrator-only API action `register_current_bench()` that calls the authenticated read-only inventory endpoint, verifies that all five expected domains exist, and creates one host record and exactly four customer-site records. Store `asumi.ir` only in the host impact inventory, not as a `Docker Control Site`. If any expected domain is missing or unexpected, return the discrepancy and create no records. A repeated successful call updates inventory without duplicating records.

- [ ] **Step 4: Check generated DocType metadata and formatting.**

Run `python3 -m compileall` on the four new controller packages and `ruff check`/`ruff format --check` on their Python files. Inspect each JSON file for valid JSON and confirm permissions do not grant access to non-Administrator users.

### Task 3: Add the Press client, authorization, and operation state machine

**Files:**
- Create: `press/docker_control/client.py`
- Create: `press/docker_control/permissions.py`
- Create: `press/docker_control/operations.py`
- Create: `press/api/docker_control.py`
- Modify: `press/hooks.py` only if the new background operation poller requires a scheduled hook

**Interfaces:**
- `DockerControlClient.health() -> dict`
- `DockerControlClient.inventory() -> dict`
- `DockerControlClient.submit(operation_id: str, action: str, target: str | None, arguments: dict) -> dict`
- `DockerControlClient.get_operation(operation_id: str) -> dict`
- API methods: `get_dashboard_data()`, `refresh_inventory()`, `prepare_operation(action, target=None, arguments=None)`, `confirm_operation(operation, confirmation_token)`, and `get_operation(operation)`.

- [ ] **Step 1: Add one backend authorization guard.**

Implement `assert_docker_control_admin()` in `permissions.py`. Call it before reading host/site data, creating operation records, refreshing inventory, or confirming an operation. Do not rely on hidden navigation or DocType permissions as the only access check.

- [ ] **Step 2: Implement the authenticated Press-to-agent client.**

Build request signatures with the matching canonical format from Task 1, generate a fresh nonce for each request, and use the Password field through `get_password()`. Set bounded connect/read timeouts. Convert network, authentication, protocol-version, and malformed-response failures into sanitized operation errors; never log request signatures, keys, request bodies containing credentials, or site configuration.

- [ ] **Step 3: Implement idempotent inventory refresh.**

Update host health and the four site app tables only after validating the entire inventory response. A response containing a missing customer domain, a duplicate domain, an unrecognized app structure, or an incompatible protocol version must leave existing inventory unchanged and return a useful error.

- [ ] **Step 4: Implement the shared-operation two-confirmation flow.**

`prepare_operation()` validates the action and target, computes the affected domain list, records the operator, and requests the required backup set. When backup completes, move the operation to `Awaiting Confirmation` and issue a short-lived, single-use confirmation token. `confirm_operation()` verifies the current Administrator, token hash, expiry, exact action/revision/service, and displayed affected domains before queueing the write operation. Reusing a token fails.

- [ ] **Step 5: Add job locking and terminal status handling.**

Acquire one host-level lock for every operation that can mutate app code, site data, or Compose service state. Keep read-only health/inventory requests outside the lock. Mirror agent progress and terminal results into the Press operation record. If the agent is unreachable or returns a protocol error, mark the record failed and retain sanitized details; do not retry a non-idempotent restore or deployment automatically.

- [ ] **Step 6: Run compile and lint checks.**

Run:

```bash
python3 -m compileall press/docker_control press/api/docker_control.py
ruff check press/docker_control press/api/docker_control.py
ruff format --check press/docker_control press/api/docker_control.py
```

Expected: the Press API and client compile and lint cleanly. Do not run `bench run-tests`.

### Task 4: Add the Administrator-only dashboard

**Files:**
- Create: `dashboard/src/pages/DockerControl.vue`
- Create: `dashboard/src/components/docker-control/HostSummary.vue`
- Create: `dashboard/src/components/docker-control/ManagedSites.vue`
- Create: `dashboard/src/components/docker-control/OperationDetails.vue`
- Create: `dashboard/src/components/docker-control/ConfirmDockerOperation.vue`
- Create: `dashboard/src/data/dockerControl.js`
- Modify: `dashboard/src/router.js`
- Modify: `dashboard/src/components/navigation/sidebar/NavList.vue`
- Modify: `dashboard/src/utils/translate.js` if the existing translation mechanism needs explicit Persian strings

**Interfaces:**
- Route `/docker-control` loads `DockerControl.vue` and redirects non-system sessions away; the backend still enforces the exact Administrator user.
- `dockerControl.js` exports resources for host summary, managed-site inventory, inventory refresh, operation preparation, second confirmation, and operation status.
- `ConfirmDockerOperation.vue` receives an operation preview and emits `prepare` or `confirm` only for the exact preview shown.

- [ ] **Step 1: Add the route and navigation entry.**

Add a lazy-loaded route named `Docker Control` under the dashboard router. Add a Persian sidebar item with a server icon, visible only to a system session; the backend exact-user check remains mandatory.

- [ ] **Step 2: Build the read-only overview first.**

Show Docker host connectivity, resource summary, Compose service state, and exactly four site cards. Each site card shows domain, refresh time, and its discovered app/version rows. Render `asumi.ir` only in an impact badge, never as a managed-site card.

- [ ] **Step 3: Add operation history and failure details.**

List recent operations with status, actor, target, start/end time, and sanitized output. Poll an active operation by its Press operation ID. Do not render raw tracebacks, config JSON, secrets, or arbitrary file paths.

- [ ] **Step 4: Add the two-stage confirmation interface.**

Before a shared write, show the exact revision or service, backup domains, migration domains, expected interruption, and the explicit `asumi.ir` impact. The first button prepares the backup operation. After all backups succeed, show a second confirmation naming the exact action and impact. Disable the second button after one submission or token expiry.

- [ ] **Step 5: Build and lint the dashboard.**

Run:

```bash
cd dashboard
yarn lint
NODE_OPTIONS=--max-old-space-size=6144 yarn build
```

Expected: lint is clean and Vite emits production assets. The 6144 MiB Node heap cap leaves memory for the 8 GiB host and its running Docker services. Do not run `yarn test`.

### Task 5: Implement safe site-scoped operations

**Files:**
- Modify: `press/docker_control_agent/operations.py`
- Modify: `press/docker_control/operations.py`
- Modify: `press/api/docker_control.py`
- Modify: `dashboard/src/pages/DockerControl.vue`
- Modify: `dashboard/src/components/docker-control/ManagedSites.vue`
- Modify: `dashboard/src/components/docker-control/ConfirmDockerOperation.vue`

**Interfaces:**
- Site actions: `backup_site`, `restore_site`, `set_maintenance`, `clear_cache`, `set_scheduler`, `migrate_site`, and `read_site_logs`.
- Each site action accepts one `target` from the four-domain allowlist. `restore_site` additionally requires a backup ID belonging to that same domain.
- `backup_site` returns backup artifact names and sizes only; it never returns backup contents or configuration files.

- [ ] **Step 1: Add site backup creation and listing.**

Run a fixed `bench --site <allowed-domain> backup --with-files --compress` command through the configured backend container. Resolve the produced files under the configured backup root, record sizes and timestamps, and redact config backup names from browser-facing output if they can contain credentials. Fail if a backup artifact escapes the backup root or is incomplete.

- [ ] **Step 2: Add restore validation and confirmation.**

Accept only an existing backup record whose domain matches the target site. Create and verify a new full backup of the target before restore. Require a separate confirmation that names the domain and backup ID. Invoke the fixed Frappe restore command with explicit database/public/private file paths; stop and retain the operation record if restore exits nonzero.

- [ ] **Step 3: Add maintenance, cache, scheduler, and migration handlers.**

Map each action to a fixed `bench --site <allowed-domain>` command. Never accept a free-form command or option from the dashboard. Migrations use the host lock and a verified site backup. Return the resulting scheduler/maintenance state from the site after each operation.

- [ ] **Step 4: Add bounded site log access.**

Return only the selected domain's recent application logs, cap output size, and redact bearer tokens, passwords, database URLs, authorization headers, and `site_config` contents before storing or returning it.

- [ ] **Step 5: Add site action controls and clear error messages.**

Expose each action from its site card. Disable mutating actions while an operation for that site or host is active. For restore and migrate, show a site-specific confirmation and the backup state. Translate agent errors into a short Persian message with an operation ID for follow-up.

### Task 6: Implement shared-bench status, restart, and pinned app deployment

**Files:**
- Modify: `press/docker_control_agent/inventory.py`
- Modify: `press/docker_control_agent/operations.py`
- Modify: `press/docker_control/operations.py`
- Modify: `press/api/docker_control.py`
- Modify: `dashboard/src/components/docker-control/HostSummary.vue`
- Modify: `dashboard/src/components/docker-control/ConfirmDockerOperation.vue`

**Interfaces:**
- Shared actions: `restart_service`, `restart_stack`, and `deploy_app_revision`.
- `deploy_app_revision` accepts an app name from the configured apps root and an immutable Git commit SHA; it does not accept a shell string, arbitrary branch checkout, or arbitrary filesystem path.
- The preflight response contains `revision`, `backup_domains`, `migration_domains`, `restart_services`, and `asumi_impact`.

- [ ] **Step 1: Add service allowlisting and impact reporting.**

Allow only the current Compose services: `backend`, `websocket`, `queue-short`, `queue-long`, `scheduler`, `db`, `redis-cache`, and `redis-queue`. Report that every restart can interrupt all five sites. Never allow `docker compose down`, volume removal, or an arbitrary service name.

- [ ] **Step 2: Add app revision preflight.**

Resolve the app directory under the fixed apps root, require a clean Git working tree, verify the requested SHA exists in that repository, and inspect all five installed-app lists. Return the exact sites to migrate and the full five-site backup set. Refuse unknown apps, dirty worktrees, missing commits, or incomplete inventory.

- [ ] **Step 3: Add staged deployment execution.**

After the first confirmation, back up all five sites. After the second confirmation, check out only the pinned SHA, run the app's configured build action, migrate each site whose inventory contains the app, and restart only the required service set. Record every stage. If a stage fails, stop immediately and require an Administrator to choose code rollback or backup restoration; never perform an automatic database restore.

- [ ] **Step 4: Add service restart execution.**

After the first confirmation, back up all five sites. After the second confirmation names the selected service(s) and all affected domains, invoke fixed `docker compose restart <allowlisted-service>` arguments. For a stack restart, restart the configured service list in dependency-safe order without deleting volumes or recreating databases.

- [ ] **Step 5: Add impact and progress rendering.**

Show the first backup set, then the migration set, then the second confirmation. Display `asumi.ir` in both the warning and confirmation for every shared write. Preserve the operation history if a browser closes or the agent restarts.

### Task 7: Install on Asumi and complete the Food Partner release

**Files:**
- Deploy: the Press app commit from this branch to the existing `asumi.ir` Press installation
- Install: `/etc/systemd/system/press-docker-control-agent.service`
- Create outside source control: `/etc/press-docker-control-agent.json` and `/etc/press-docker-control-agent.env`
- Do not modify: `/home/sepehr/den-v16-docker/docker-compose.yml` unless read-only connectivity preflight proves the existing `dehati.ir:host-gateway` mapping is unavailable

**Interfaces:**
- The host agent listens only on the configured Docker bridge gateway and port; Press reaches it through the existing `dehati.ir:host-gateway` mapping.
- The initial registration creates one custom Docker Control Host and the exact four custom Docker Control Site records after successful read-only inventory.
- Food Partner revisions already prepared for deployment are `accounts@a16fc2d7763344b922dc7ac8d96893e6d54ae699` and `restaurant@4baecdeff4556216e678bdab94f435a2b8e3dea4`.

- [ ] **Step 1: Reconcile the feature branch with the running Asumi checkout.**

Inspect the running app commit and the existing local diffs in `press/routing.py` and `press/www/asumi.html`. Preserve those two user changes exactly. Build a release commit that contains this feature without resetting, force-checking-out, or overwriting the current production checkout.

- [ ] **Step 2: Install the agent service with protected credentials.**

Determine the current Compose bridge gateway from Docker's network data, create a host-only config with the fixed project/container/domain allowlists, generate an HMAC key, store it in a root-readable environment file, and install the systemd unit. Confirm from the Press container that the existing host-gateway alias reaches the configured private listener, and confirm the port is not bound to a public interface.

- [ ] **Step 3: Back up the shared sites and migrate Asumi's Press schema.**

Before a shared service restart, create successful database-and-files backups for all five sites. Deploy the Press code, then run `bench --site asumi.ir migrate` because Press is installed only on Asumi. Restart only the Press web/worker services required to load the new code; record that this interrupts all five sites and obtain the second confirmation before restarting.

- [ ] **Step 4: Register and verify read-only inventory.**

Use the Administrator-only registration action. Verify that the dashboard shows exactly the four customer domains, that each app list matches `bench --site <domain> list-apps --format json`, and that `asumi.ir` appears only in shared-impact summaries. Verify that no native Press Cloud `Server`, `Bench`, or `Site` records were created.

- [ ] **Step 5: Enable site writes and shared operations in stages.**

Enable site backup and cache/maintenance controls after the read-only inventory is correct. Enable restore and migration controls only after their operation records enforce the matching-site backup checks and explicit confirmations. Enable service restart and app deployment only after the five-site backup preview and second confirmation work end to end.

- [ ] **Step 6: Deploy the already-approved Food Partner revisions through Press.**

Prepare `accounts@a16fc2d7763344b922dc7ac8d96893e6d54ae699`; show all five sites in its backup set and all five sites in its migration set because each installs `accounts`. Build the frontend with `NODE_OPTIONS=--max-old-space-size=6144` on the 8 GiB host, then require the second confirmation that names `asumi.ir` and the other four sites before deployment. Prepare `restaurant@4baecdeff4556216e678bdab94f435a2b8e3dea4`; show all five sites in the backup set and migrate only `dehati.ir` and `veederakht.ir`, which install `restaurant`. Keep the customer-facing `asumi.ir` site outside the target list while naming it in the shared-operation warning.

- [ ] **Step 7: Run the final non-test build and production checks.**

Run the Press dashboard lint/build commands from Task 4 and Python compile/lint commands from Tasks 1 and 3. In the live UI, perform only read-only host status and inventory refresh after deployment; do not trigger destructive restore, migration, or service restart as a smoke check. Confirm the new Food Partner toggle is visible in Veederakht's Food Partner settings and report the deployed revision and operation IDs.
