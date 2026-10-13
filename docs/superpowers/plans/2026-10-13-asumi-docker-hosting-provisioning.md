# Asumi shared-Docker hosting provisioning implementation plan

## Goal and guardrails

Implement the approved, limited shared-Docker path in `2026-10-13-asumi-docker-hosting-provisioning-design.md`. Do not create a live customer site or enable public paid hosting while live checkout, wildcard DNS/TLS, and resource prerequisites are false.

## Tasks

### 1. Agent operation validation and audit behavior

- Add failing tests for exact `*.asumi.ir` domain validation, app allowlisting, argument shape, HMAC route authentication, operation idempotency, and secret redaction.
- Add a `create_hosted_site` operation to the private Docker agent. It must make complete backups of all five current sites, read the DB root credential only into memory, create/reconcile one site on the fixed shared Bench, and report only safe metadata.
- Ensure passwords and customer email are not stored in SQLite operation arguments/results or logs.

### 2. Asumi hosted-site tracking and commerce lifecycle

- Add an `Asumi Hosted Site` DocType with team, owner, FQDN, apps, plan, status, originating order, agent operation ID, and backup summary.
- Add a hosted-site Link and operation identifier to `Commerce Order`.
- Route only verified paid new-site hosting orders to the Docker agent; revalidate settings, wildcard DNS/TLS, plan/app allowlist, and capacity immediately before sending.
- Store and poll the operation safely; on success, create/update the hosted-site record, activate the order, and send the customer access email from Asumi's configured outgoing mail account.
- Support same-plan renewals and expiry by toggling the hosted site's maintenance state, preserving all data.

### 3. Readiness and admin controls

- Make hosting readiness identify the fixed shared Docker Bench as the target, while preserving external DNS/TLS and resource gates.
- Validate hosting plan apps against the installed shared-Bench app inventory and avoid requiring Frappe Cloud Server/Bench/Release Group resources for Docker-backed plans.
- Keep existing-site plan upgrades on the standard Press path.
- Keep ZarinPal checkout fail-closed when the real Merchant ID is absent or sandbox mode is on.

### 4. Verification and release

- Run focused Docker-agent, commerce, and Frappe integration tests on an isolated disposable site.
- Run Python static checks and relevant Press/dashboard builds only where affected.
- Recheck the live readiness checklist. Do not create a real paid order/site to test deployment.
- Commit the reviewed implementation with a Persian message describing the change and rationale.

## Self-review before implementation

- Do not store generated passwords or customer PII in the agent audit database. Persist only the operation ID, safe site/app metadata, and verified backup metadata.
- The DB root credential is retrieved from the fixed Compose `db` service and passed to the backend process over stdin; it is never returned to Press.
- Reuse one operation manager and one Compose project from the protected agent config; reject user-supplied command/path/Compose values.
- Full backups must be independently verified before any `bench new-site` command.
- All creation and renewal operations are idempotent and use an order reservation/lock to prevent duplicate subdomains.
- Public checkout and creation remain blocked by any missing live prerequisite.
