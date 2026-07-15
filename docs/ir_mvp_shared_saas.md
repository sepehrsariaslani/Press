# Iran Shared SaaS MVP (Admin Managed)

This guide captures the MVP flow implemented in Press for:

- shared SaaS onboarding
- private app delivery via private git
- manual prepaid billing without exposing source code or server shell to customers

## New admin APIs

All methods below are `System Manager` only.

- `press.saas.api.mvp_admin.provision_customer_site`
- `press.saas.api.mvp_admin.create_saas_subscription`
- `press.saas.api.mvp_admin.record_manual_payment`
- `press.saas.api.mvp_admin.suspend_saas_subscription`
- `press.saas.api.mvp_admin.activate_saas_subscription`

### Provision a customer site

Required input:

- `product_trial`: Product Trial doc name
- `team`: Team doc name
- `subdomain`: customer subdomain

Optional:

- `domain`: defaults to Product Trial domain
- `cluster`: defaults to selected domain's default cluster
- `saas_app_plan`: if provided, subscription is created/linked
- `interval`: Daily/Monthly/Annual (default Monthly)

## Manual prepaid billing

Implemented with the doctype `Manual Payment Record`.

Workflow:

1. Create record with `saas_app_subscription`, payment details, and `reference_no`.
2. Submit record.
3. On submit, subscription end date is extended by selected cycles.
4. Subscription is moved to Active and site is activated.

Design notes:

- duplicate submitted payment references are blocked per team
- cancellation is intentionally blocked to avoid accidental billing rollback

## Read-only server audit

Use `deployment/mvp_read_only_audit.sh` for baseline checks:

```bash
./deployment/mvp_read_only_audit.sh 62.60.207.82 sepehr
```

The script does not mutate host configuration. It collects:

- OS and uptime
- CPU, memory, disk
- open ports
- service status
- version info (python/node/mariadb/redis/nginx/bench/docker)
- recent error-level journal logs

## Private app delivery baseline

- keep modified apps in private git repositories
- use read-only deploy keys on infrastructure only
- do not give customers SSH, shell, or git credentials
- pin app release by branch/tag in App Source/App Release workflows

## Offline GitHub sync (Laptop -> VPS via SCP)

Use this when VPS cannot access `github.com` directly.

1. Clone private repo on your laptop (where GitHub works):

```bash
mkdir -p ~/offline-repos
cd ~/offline-repos
git clone --branch version-15 --single-branch git@github.com:YOUR_ORG/erpnext.git erpnext
```

2. Pack and upload to VPS:

```bash
tar -czf erpnext.tgz erpnext
scp erpnext.tgz sepehr@62.60.207.82:/tmp/
```

3. Extract on VPS:

```bash
ssh sepehr@62.60.207.82
sudo mkdir -p /opt/offline/repos
sudo tar -xzf /tmp/erpnext.tgz -C /opt/offline/repos
sudo chown -R frappe:frappe /opt/offline/repos/erpnext
```

4. Use local path in bench/press:

```bash
bench get-app --branch version-15 file:///opt/offline/repos/erpnext
```

For Press Agent repo, use the same pattern and set:

`Press Settings -> agent_repository_owner = file:///opt/offline/repos/agent`
