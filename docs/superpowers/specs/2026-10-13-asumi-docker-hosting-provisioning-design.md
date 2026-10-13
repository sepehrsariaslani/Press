# Asumi shared-Docker hosting provisioning

> **Superseded:** On 2026-10-13 the product owner clarified that Asumi does not own a multi-tenant hosting server; new customer sites must receive a separately purchased HostIran VPS and be provisioned through Press's managed Server/Bench flow. Do not enable or extend the shared-Docker new-site sales path described below. See `2026-10-13-asumi-hostiran-dedicated-hosting-design.md`.

## Goal

Provision a customer-owned Frappe site on the existing Asumi Docker Bench after a ZarinPal payment has been verified. This replaces a Frappe Cloud dependency for the new-site hosting path while keeping the current Press-managed existing-site upgrade path intact.

## Approved boundary

- Provisioning is initiated only by the paid-order worker after payment verification.
- The target is exactly one validated subdomain beneath `asumi.ir`.
- The only execution target is the configured existing shared Docker Bench.
- The plan's selected apps must be installed on that Bench and within the plan allowlist.
- Provisioning is refused unless the wildcard DNS, wildcard TLS, Docker agent, payment, and resource-reserve checks all pass at checkout and again before delivery.
- A complete backup of the five existing sites is required before the first site mutation. The agent stores the backup metadata and provisioning operation in its protected local audit database.
- The Docker agent accepts the operation only through the existing HMAC-authenticated private API. It does not accept arbitrary paths, Compose project names, shell commands, or domains.
- The customer receives access through a System Manager account created on the new site. A generated password is held only in memory on the agent and delivered through the existing Asumi email service after provisioning succeeds; it must not be stored in operation arguments or results.
- The customer site is tracked in a dedicated Asumi-hosted-site record linked to the order and team. The normal Press `Site` creation API is not called for this backend.
- Operation IDs are idempotent. Failed operations remain visible for admin recovery, and retries revalidate the paid order, the reserved subdomain, and the target site's installed apps.
- Expiry places the hosted site in maintenance mode without deleting its data. Renewal restores service. No automatic deletion is allowed.

## Out of scope

- Registering domains, editing DNS, issuing TLS certificates, or changing ingress configuration.
- Creating a new Bench or server, installing new apps on the shared Bench, or running arbitrary migrations.
- Provisioning from unpaid, pending, refunded, cancelled, or unrelated orders.
- Installing a new Marketplace app as part of new-site creation.
- Removing sites or deleting customer data.

## Failure handling

- Any missing readiness prerequisite blocks checkout and the final provision attempt.
- If any of the five required backups is incomplete, no site creation command runs.
- If site creation or an app install fails, the order remains failed for retry/review; backups and the operation record remain available.
- A retry for the same order may continue a partially created site only when the domain remains reserved by that exact order and the requested app set is compatible.
- Secrets are excluded from agent logs, audit arguments, operation results, and error text.

## Acceptance checks

1. Reject non-Asumi domains, malformed labels, unknown apps, and mismatched order/team/subdomain.
2. Reject every order status other than verified `Paid`/`Provisioning` for the exact Hosting order.
3. Refuse the operation when any readiness check, capacity check, or full backup fails.
4. Verify a successful, idempotent operation creates the site, installs only selected allowlisted apps, creates the named admin, and records the operation and backup IDs.
5. Verify no password appears in persisted SQLite rows, logs, API response, or operation result.
6. Verify refunds and expiry do not delete a site, and expired access is put in maintenance mode.
7. Keep public hosting checkout disabled until all live readiness checks and the real production ZarinPal credential are configured.
