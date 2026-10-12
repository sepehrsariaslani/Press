# Asumi Press Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Asumi's black-and-red design consistently to every Press frontend route under `/dashboard/*` while preserving its existing actions, routes, permissions, and data behavior.

**Architecture:** Add a scoped dashboard token and compatibility layer after the existing Frappe UI stylesheet. Apply it at the Vue application root so all routed pages inherit the same surfaces, typography, controls, and responsive behavior. Refine the shared navigation and reusable components where CSS alone cannot provide the intended hierarchy; leave page business logic and routing unchanged.

**Tech Stack:** Vue 3, Vite, Tailwind CSS 3, Frappe UI, CSS custom properties, existing Peyda font files.

## Global Constraints

- Use the live Asumi identity: near-black `#080808`, charcoal `#171414`, Asumi red `#c63140`, bright red `#ff6670`, warm light text `#ede9e4`, and muted text `#a9a3a0`.
- Do not use gold, gold gradients, or gold status accents.
- Use black and charcoal for the dashboard frame and surfaces. Reserve red for primary actions, selected navigation, links, and high-priority emphasis; do not make every panel or control red.
- Keep the visual language operational and calm. Use clear typography, deliberate spacing, subtle borders, and restrained elevation rather than cinematic effects or decorative glow.
- Use the existing Asumi typography where available: Vazirmatn for Persian and Manrope for Latin text and numbers. Preserve correct RTL reading order while keeping identifiers, URLs, code, and numeric values legible in their natural direction.
- The public Asumi marketing pages and the ERP Desk under `/hesab/*` are outside this redesign. Existing routes, APIs, permission checks, data, actions, and business rules remain intact.
- Keep Persian labels and messages in Persian where they already exist; do not translate product terminology or user data as part of the redesign.
- Do not communicate status through color alone. Preserve screen-reader labels for icon-only controls and meaningful accessible names for navigation.

---

### Task 1: Add Asumi Dashboard Tokens and Global Surface Mapping

**Files:**
- Create: `dashboard/src/assets/asumi-dashboard.css`
- Modify: `dashboard/src/assets/style.css`
- Modify: `dashboard/src/App.vue`

**Interfaces:**
- Produces: `.asumi-dashboard` root class and the `--asumi-*` color, spacing, focus, and surface tokens used by all dashboard routes.
- Consumes: existing Peyda font declarations, Tailwind utility classes, and Frappe UI variables imported by `style.css`.

- [ ] Define dark dashboard tokens for page background `#080808`, raised surface `#171414`, hover surface `#211c1c`, text `#ede9e4`, muted text `#a9a3a0`, and Asumi reds `#c63140` / `#ff6670`.
- [ ] Override Frappe UI surface, ink, outline, and primary variables beneath `.asumi-dashboard` so built-in components inherit the same palette.
- [ ] Map common Tailwind white and gray background, text, and border utilities to the tokens, including hover and focus states. Keep green success, amber warning, red error, and blue informational states semantically distinct.
- [ ] Add `.asumi-dashboard` to the root element in `App.vue` and import `asumi-dashboard.css` after `frappe-ui/style.css` through `style.css`.
- [ ] Keep LTR values readable with scoped `dir="ltr"` content and avoid globally reversing code, URL, or identifier content.

### Task 2: Apply the Brand to the Dashboard Shell and Navigation

**Files:**
- Modify: `dashboard/src/components/navigation/sidebar/Sidebar.vue`
- Modify: `dashboard/src/components/navigation/sidebar/Item.vue`
- Modify: `dashboard/src/components/navigation/sidebar/ItemGroup.vue`
- Modify: `dashboard/src/components/MobileNav.vue`
- Modify: `dashboard/src/components/MobileNavItem.vue`
- Modify: `dashboard/src/components/MobileNavItemGroup.vue`
- Modify: `dashboard/src/components/Header.vue`
- Modify: `dashboard/src/App.vue`

**Interfaces:**
- Consumes: `.asumi-dashboard` tokens from Task 1.
- Produces: shared dark sidebar, mobile navigation, page header, active route, hover, team switcher, and notification surfaces.

- [ ] Style the authenticated sidebar with a charcoal surface, quiet border, readable labels, and a red active-route marker without changing its navigation data or team permissions.
- [ ] Use an Asumi wordmark treatment in the shared desktop and mobile shell while retaining the existing team switcher, help, notification, search, and logout controls.
- [ ] Style page headers and mobile navigation as matching dark surfaces with visible dividers and focus states.
- [ ] Preserve standalone login, onboarding, and site-login layouts when `App.vue` hides the sidebar.

### Task 3: Theme Reusable Controls, Tables, Dialogs, and Feedback

**Files:**
- Modify: `dashboard/src/components/ActionButton.vue`
- Modify: `dashboard/src/components/Form.vue`
- Modify: `dashboard/src/components/FilterControl.vue`
- Modify: `dashboard/src/components/GenericList.vue`
- Modify: `dashboard/src/components/ObjectList.vue`
- Modify: `dashboard/src/components/TabsWithRouter.vue`
- Modify: `dashboard/src/components/GenericDialog.vue`
- Modify: `dashboard/src/components/DialogWrapper.vue`
- Modify: `dashboard/src/components/AlertBanner.vue`
- Modify: `dashboard/src/components/CustomToast.vue`
- Modify: `dashboard/src/components/navigation/sidebar/Notifications.vue`
- Modify: `dashboard/src/assets/asumi-dashboard.css`

**Interfaces:**
- Consumes: palette and surfaces from Task 1 plus shell context from Task 2.
- Produces: consistent button, form, tab, list, dialog, toast, alert, and notification patterns without changing component props or event behavior.

- [ ] Style primary actions in Asumi red; keep secondary and quiet actions charcoal or outlined, with visible hover, disabled, loading, and keyboard focus states.
- [ ] Restyle inputs, selects, date pickers, filters, tab bars, table headers, rows, empty states, and selection states while preserving current validation and row actions.
- [ ] Restyle modal overlays and dialog surfaces, retaining existing confirmation flows and button ordering.
- [ ] Preserve semantic success, warning, information, and error colors with labels or icons in addition to color.
- [ ] Keep table and code-oriented content horizontally scrollable when narrow screens cannot safely collapse columns.

### Task 4: Cover Sites, Servers, Benches, and Operational Pages

**Files:**
- Review: routed views listed in `dashboard/src/router.js`
- Review: generated site, server, and bench routes in `dashboard/src/objects/site.js`
- Review: generated server routes in `dashboard/src/objects/server.js`
- Review: generated bench routes in `dashboard/src/objects/bench.ts`
- Modify: `dashboard/src/assets/asumi-dashboard.css`

**Interfaces:**
- Consumes: shared tokens and components from Tasks 1–3.
- Produces: visually consistent site, server, bench, deployment, log, Docker control, and developer-tool routes while keeping their data and operation flows unchanged.

- [ ] Check site, server, bench, deployment, logs, Docker control, and developer-tool views for white/gray utility classes and inline colors; add scoped token mappings in `asumi-dashboard.css` so these routed views inherit the approved system.
- [ ] Keep charts, code editors, terminal/log output, destructive confirmations, Docker operation warnings, and server health states legible and semantically distinct.
- [ ] Preserve every existing page action, route, access guard, confirmation, loading state, and data display.

### Task 5: Cover Billing, Marketplace, Seller, Settings, and Partner Pages

**Files:**
- Review: `dashboard/src/pages/Billing.vue`
- Review: `dashboard/src/pages/Checkout.vue`
- Review: `dashboard/src/pages/Subscription.vue`
- Review: `dashboard/src/pages/Partners.vue`
- Review: `dashboard/src/pages/PartnerAdmin.vue`
- Review: `dashboard/src/pages/Seller.vue`
- Review: `dashboard/src/pages/Settings.vue`
- Review: `dashboard/src/pages/seller/SellerOverview.vue`
- Review: `dashboard/src/pages/seller/SellerApps.vue`
- Review: `dashboard/src/pages/seller/SellerSubscriptions.vue`
- Review: `dashboard/src/components/billing/`
- Review: `dashboard/src/components/marketplace/`
- Review: `dashboard/src/components/partners/`
- Review: `dashboard/src/components/settings/`
- Modify: `dashboard/src/assets/asumi-dashboard.css`

**Interfaces:**
- Consumes: shared tokens, navigation, and reusable controls from Tasks 1–3.
- Produces: consistent finance, Marketplace, seller, settings, partner, and system-administration screens.

- [ ] Map the white, gray, and Frappe UI color tokens used by summaries, invoice and payout tables, payment forms, plan cards, Marketplace listings, seller tabs, settings panels, and partner dashboards through `asumi-dashboard.css`.
- [ ] Preserve payment provider artwork, price values, team/account permission conditions, existing confirmation dialogs, and all backend interactions.
- [ ] Keep error and payment states identifiable without relying only on red or green.

### Task 6: Theme Authentication, Onboarding, and Other Standalone Routes

**Files:**
- Review: `dashboard/src/pages/LoginSignup.vue`
- Review: `dashboard/src/pages/Welcome.vue`
- Review: `dashboard/src/pages/SetupAccount.vue`
- Review: `dashboard/src/pages/ResetPassword.vue`
- Review: `dashboard/src/pages/SiteLogin.vue`
- Review: `dashboard/src/pages/Enable2FA.vue`
- Review: `dashboard/src/pages/Impersonate.vue`
- Review: `dashboard/src/pages/InstallApp.vue`
- Review: `dashboard/src/pages/CreateSiteForMarketplaceApp.vue`
- Review: `dashboard/src/pages/PrivateStatusPage.vue`
- Review: `dashboard/src/pages/404.vue`
- Review: `dashboard/src/pages/signup/`
- Modify: `dashboard/src/assets/asumi-dashboard.css`

**Interfaces:**
- Consumes: `.asumi-dashboard` tokens and shared form/button styles.
- Produces: Asumi-branded standalone flows that do not depend on the authenticated sidebar.

- [ ] Map the shared dark surfaces, red primary actions, validation feedback, and responsive layout rules for authentication, site setup, checkout, invitation, and status pages in `asumi-dashboard.css`, keeping their standalone layouts independent of the authenticated sidebar.
- [ ] Keep page titles, login and signup conditions, form submissions, redirects, billing flows, and access rules unchanged.

### Task 7: Review Route Coverage, Responsive States, and Build

**Files:**
- Review: all routed views in `dashboard/src/router.js` and `dashboard/src/objects/*.js`
- Review: `dashboard/src/assets/asumi-dashboard.css`
- Review: affected dashboard components and page files from Tasks 1–6

**Interfaces:**
- Consumes: all redesigned dashboard routes and tokens.
- Produces: a buildable Press dashboard with documented route coverage and responsive visual behavior.

- [ ] Compare every route in `dashboard/src/router.js` and generated site/server/bench routes against the scope in `docs/superpowers/specs/2026-10-12-asumi-press-dashboard-design.md`.
- [ ] Check CSS at 320px, tablet, and desktop widths; verify RTL controls, dialogs, tables, long identifiers, and focus visibility.
- [ ] Run `yarn --cwd dashboard lint` and `yarn --cwd dashboard build`; fix any introduced lint or production-build errors.
- [ ] Review the final diff to confirm no changes to API calls, permissions, router paths, or business logic, and commit the implementation with a Persian message describing what changed and why.
