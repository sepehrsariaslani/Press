# Press Erpyar Phase 2.5

## Backend strategy
- Added a dedicated backend DocType (`Erpyar Lead`) inside Press to persist Contact/Demo leads.
- Added one host-restricted, guest whitelisted API method:
  - `press.api.erpyar.submit_lead`
- Kept surface area minimal (single endpoint, strict field allowlist, host checks, input validation).

## DocType
- Name: `Erpyar Lead`
- Module: `Press`
- Status workflow field:
  - `New`, `Contacted`, `Qualified`, `Lost`

## API behavior
- Accepts only `lead_type` in `{contact, demo}`.
- Accepts only hosts `{erpyar.ir, www.erpyar.ir}`.
- Validates required fields:
  - both: `full_name`, `phone`
  - contact: `message`
  - demo: `product_interest`
- Sanitizes and length-limits all inputs.
- Enforces source path mapping:
  - contact -> `/contact`
  - demo -> `/demo`
- Adds anti-spam controls:
  - rate limit (`20 requests / 10 minutes`)
  - honeypot field (`website`) must be empty
- Safe JSON responses:
  - success: `{ok: true, ...}`
  - validation failure: `{ok: false, ...}` + 4xx status
  - server failure: `{ok: false, ...}` + 500 status (traceback only in server logs)

## Frontend updates
- Contact and Demo forms now submit to backend endpoint.
- localStorage kept only for draft/autosave (`erpyar_contact_draft`, `erpyar_demo_draft`).
- Success shown only after real backend success response.
- Backend failure now shows user-facing error (no fake success).
- Added hidden honeypot input to both forms.

## Build/deploy
- Rebuilt Erpyar frontend assets.
- Regenerated route-specific Erpyar shells.
- Built and deployed official Docker image (`den-v16-erpnext:custom`).
- Ran site cache clear.
- Migrated `erpyar.ir` site to sync new DocType.

## Verification summary
- Valid contact lead submitted and persisted.
- Valid demo lead submitted and persisted.
- Invalid lead_type rejected (400).
- Honeypot payload rejected (400).
- Invalid source path rejected (400).
- Unchanged core routes confirmed (`/saas`, `/saas-app`, `/login`, `/dashboard`, `/api/method/ping`, other host root).
