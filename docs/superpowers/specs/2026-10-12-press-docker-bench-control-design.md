# Press control for the existing Docker Bench

## Status

Design for user review. No runtime records, Docker services, or site data have
been changed.

## Context

`asumi.ir` hosts the Press app in a self-hosted Docker Compose bench. The same
bench and shared app directories host `boller.ir`, `dehati.ir`, `denroom.ir`,
and `veederakht.ir`. Press currently has no Server, Bench, or Site records for
these installations. Press's existing-bench flow creates Press-managed sites
and restores site files into a new bench; it is not an in-place registration
flow for this Compose stack.

The five sites have different installed-app sets. The control plane must
discover each site's installed apps rather than assume every app is installed
everywhere. The four customer sites are the managed targets. `asumi.ir` hosts
the control plane and is excluded from the customer-site inventory. The user
has approved shared bench operations that can affect `asumi.ir`, provided the
panel names that impact, creates backups before changes, and requests a
separate confirmation.

## Goal

Provide an authenticated Press dashboard to inspect and operate the existing
Docker host and the four customer sites without moving them to another bench.
The dashboard must make the distinction between site-scoped actions and
shared-bench actions clear before an operation starts.

## Scope

### Host and bench overview

- Show Docker host health, available memory and disk, Compose service status,
  current bench/app versions, and the last successful inventory refresh.
- Show the four managed sites and each site's installed apps and versions.
- Refresh inventory from the running bench. Discovery may report `asumi.ir`
  for impact analysis, but must not create it as a managed customer site.
- Present each site as a separate entry while identifying that all five sites
  share one database service and one Compose project.

### Site-scoped operations

- Create and list a site backup, including the database and public/private
  files, with the resulting file names, size, and completion status.
- Restore a selected backup only to its matching site. Before restoring,
  create a fresh backup of the target site and require a second confirmation
  naming the target domain and selected backup.
- Enable or disable maintenance mode, clear the site's cache, enable or
  disable its scheduler, and run that site's migration.
- Show site-specific operational logs with credentials, tokens, and connection
  strings redacted.

Site-scoped operations must validate the target against the four configured
domains. The agent must reject an unknown domain, `asumi.ir`, or a path that is
not a registered site directory.

### Shared-bench operations

- Show status for the shared web, worker, scheduler, websocket, database, and
  Redis services.
- Restart an explicitly selected service or the Compose stack.
- Deploy a pinned app revision from an allowlisted app repository. Before
  starting, inspect the working tree, identify every installed site that uses
  the app, and show the exact revision and affected domains.
- Before a code deployment, back up all five sites because app code and
  services are shared. Migrate only the sites whose installed-app inventory
  includes the deployed app, then restart the required services.
- Stop the remaining deployment steps on a failed backup, migration, or
  restart. Keep the operation record and logs, and require the operator to
  choose recovery; do not silently restore a database.

Every shared-bench operation must display that it may interrupt or migrate
`asumi.ir` and the customer sites. It requires an additional confirmation
before execution. After the preview is acknowledged, Press creates a backup
of every site that the shared operation can affect. Code deployments and
service restarts therefore back up all five sites. After backups finish, Press
requests a second confirmation naming the exact action, revision or service,
and affected domains before making the shared change. A failed backup
prevents the shared change from starting. Backup and migration operations
must use a bench-wide lock so concurrent jobs cannot change the same site or
app revision.

## Architecture

### Press app

Add Press-managed records for one Docker host, the four target sites, and
operations. The host record stores the private agent endpoint, encrypted
authentication material, connection state, and last inventory time. Each site
record stores its exact domain, host link, enabled state, optional Team link,
and the most recently discovered installed apps. The operation record stores
the requesting user, operation kind, target, impact summary, status, timestamps,
and sanitized result details.

The dashboard is available only to the Press `Administrator` user for the
first release. Team links are optional metadata; this release does not create
or expose customer team access. In particular, it must not create a new Team
for `boller.ir` without a separate request.

Press APIs validate user permission, allowed operation, target domain, and
required confirmations. They create an operation record and return its ID;
long-running work is queued and displayed through operation status polling.

### Docker host agent

Run a dedicated host-side agent outside the Press web and worker containers.
Press communicates with it over a private network using authenticated,
time-limited requests. Credentials are stored encrypted in Press and in the
agent's protected configuration, never in source control or operation output.

The agent exposes typed operations only. It does not accept arbitrary shell
commands, arbitrary Compose paths, arbitrary container names, or arbitrary
site paths. The Press containers do not receive the Docker socket. The agent
uses a fixed Compose project path and validates every domain, app repository,
revision, service, and backup path against configuration before acting.

The agent can report its own version and protocol version. Press rejects
unsupported protocol versions and reports a disconnected or incompatible
agent without starting a job.

### Operation lifecycle

1. Press validates the request and stores the actor, target, requested action,
   and impact summary in an operation record.
2. The agent receives the operation over the private authenticated channel
   and verifies its request signature, timestamp, and unique operation ID.
3. The agent validates all inputs and runs only the matching allowlisted
   handler. It reports progress and a sanitized result.
4. Press records the terminal status and exposes the result to the requesting
   Administrator.

Operations use idempotency keys, bounded timeouts, and one lock per shared
bench. Replayed, expired, or concurrently conflicting requests are rejected.
The UI retains failed operation records for diagnosis; secrets and raw
configuration files are never returned to the browser.

## Safety and recovery

- Initial registration and inventory refresh are read-only. They must show
  the discovered domains and installed apps before any write operation is
  enabled.
- Only the exact target domains `boller.ir`, `dehati.ir`, `denroom.ir`, and
  `veederakht.ir` are editable as customer sites. `asumi.ir` is listed only in
  shared-operation impact summaries and required backup sets.
- Restore requires a target-site backup, a selected backup belonging to the
  same domain, and a separate confirmation.
- Deployment requires a clean app working tree, an immutable commit or tag,
  a complete list of sites to migrate, successful backups for all five sites,
  and a second confirmation of the stated `asumi.ir` impact after backups
  complete. Any service restart similarly backs up all five sites and obtains
  a second confirmation naming the affected sites before restarting.
- No operation deletes backups automatically. Backup retention is read from
  the configured storage policy and is not changed by this feature.
- All actions are auditable by user, target, operation ID, revision where
  applicable, and completion result.
- Existing Press teams and current site configurations are not changed during
  onboarding. Optional Team assignment can be done later without changing the
  host or site domain.

## Non-goals

- Moving any site to a new Press-managed bench or changing DNS.
- Treating `asumi.ir` as a customer site or exposing it in the four-site list.
- Managing arbitrary hosts or provisioning cloud servers.
- Providing an interactive shell, unrestricted Docker control, or a public
  agent endpoint.
- Changing customer data, credentials, team membership, or backup retention
  while registering the control plane.

## Acceptance criteria

1. Press shows exactly the four requested customer sites after initial
   registration and discovers each site's actual installed-app set.
2. Initial host connection and inventory refresh do not write to site
   databases, alter Compose services, or create Press `Server`, `Bench`, or
   `Site` records for the native Press cloud model.
3. The dashboard distinguishes site actions from shared-bench actions and
   explains when an action includes `asumi.ir`.
4. A site backup and restore cannot target a different site's directory or
   backup. Restore cannot start without its pre-restore backup and confirmation.
5. A deployment cannot start with a dirty app working tree, an unpinned
   revision, a missing affected-site list, or an incomplete backup set.
6. Shared service restarts and deployments require a separate confirmation
   that names the impact on `asumi.ir`.
7. Every operation is authenticated, permission-checked, auditable, and
   returns a bounded, sanitized status and result.
8. The four sites remain on the existing Docker Compose bench throughout
   registration and management.

## Rollout sequence

1. Implement the host agent protocol and read-only health/inventory support.
2. Add Press host/site/operation records and the read-only dashboard; register
   the four exact target domains and verify their discovered app sets.
3. Add site backup and site-scoped operations, then verify backup/restore
   against a disposable site before enabling them for customer sites.
4. Add shared service controls and pinned app deployment behind impact
   previews, backups, confirmations, and the bench-wide operation lock.
5. Enable production write operations one category at a time after the
   read-only inventory and audit trail are verified.
