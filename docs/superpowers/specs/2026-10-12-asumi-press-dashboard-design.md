# Asumi Press Dashboard Design

## Goal

Apply Asumi's red-and-black visual identity consistently across the Press dashboard so site owners and system administrators get one coherent, readable interface for managing sites, servers, benches, billing, Marketplace, seller tools, settings, and operational utilities.

## Design Direction

- Use the live Asumi identity: near-black `#080808`, charcoal `#171414`, Asumi red `#c63140`, bright red `#ff6670`, warm light text `#ede9e4`, and muted text `#a9a3a0`.
- Do not use gold, gold gradients, or gold status accents.
- Use black and charcoal for the dashboard frame and surfaces. Reserve red for primary actions, selected navigation, links, and high-priority emphasis; do not make every panel or control red.
- Keep the visual language operational and calm. Use clear typography, deliberate spacing, subtle borders, and restrained elevation rather than cinematic effects or decorative glow.
- Use the existing Asumi typography where available: Vazirmatn for Persian and Manrope for Latin text and numbers. Preserve correct RTL reading order while keeping identifiers, URLs, code, and numeric values legible in their natural direction.

## Scope

Apply the design across all Press frontend routes served under `/dashboard/*`, including:

- Dashboard home, sites, site details, creation, deployment and migration flows.
- Servers, benches/release groups, jobs, logs, analytics, backups, and operational tools.
- Billing, invoices, balances, payment methods, payouts, subscriptions, and checkout.
- Marketplace browsing and app details, seller dashboard, app listings, and seller settings.
- Account and team settings, permissions, developer settings, partner administration, and system utilities.
- Login, signup, invitation, password reset, onboarding, and other dashboard entry flows.

The public Asumi marketing pages and the ERP Desk under `/hesab/*` are outside this redesign. Existing routes, APIs, permission checks, data, actions, and business rules remain intact.

## Shared Dashboard Foundation

1. Establish a small dashboard token layer for background, elevated surface, border, text, muted text, primary red, focus ring, and semantic states. Map shared components to those tokens instead of applying page-specific colors.
2. Align the authenticated shell, sidebar, mobile navigation, page header, breadcrumbs, content width, and scroll behavior with the same visual system.
3. Reuse consistent patterns for cards, tables, filters, tabs, forms, buttons, dialogs, alerts, empty states, loading states, and errors. Existing components should retain their current behavior and data contracts.
4. Keep dense operational information compact enough for desktop use while giving headings, field labels, and action groups a clear hierarchy.
5. Keep authentication and onboarding pages visually related to Asumi but use a focused layout that does not show the authenticated navigation shell.

## Component and Interaction Rules

- Primary buttons use Asumi red with readable text and visible hover, focus, disabled, and loading states. Secondary actions use charcoal surfaces or quiet outlines.
- Destructive actions must be clearly identified and must continue to use the existing confirmation behavior. Red alone must not be the only signal that an action is destructive.
- Tables keep readable row separation, clear column labels, usable filters, and horizontal overflow on narrow screens where columns cannot be safely collapsed.
- Forms preserve validation messages and submission behavior; errors and success states use both text and semantic color.
- Statuses retain meaning with labels or icons in addition to color. Use distinct accessible colors for success, warning, and neutral states; reserve Asumi red for errors and urgent states.
- Focus indicators must remain visible on the dark surfaces. Respect reduced-motion preferences and avoid introducing animation that delays or obscures an action.

## Responsive Behavior

- At desktop widths, preserve the dashboard's information density and navigation structure.
- At tablet and mobile widths, use the existing mobile navigation pattern, stack forms and summary cards, and prevent dialogs and action bars from extending beyond the viewport.
- Ensure content remains usable from 320 CSS pixels wide, with RTL layouts tested for overflow and reversed control ordering.

## Accessibility and Localization

- Maintain semantic heading order, keyboard access, visible focus, and sufficient text/control contrast on black and charcoal surfaces.
- Keep Persian labels and messages in Persian where they already exist; do not translate product terminology or user data as part of the redesign.
- Do not communicate status through color alone. Preserve screen-reader labels for icon-only controls and meaningful accessible names for navigation.

## Non-Goals

- No changes to server behavior, permissions, authentication, billing rules, API contracts, or Press's routing model.
- No change to the customer-facing Asumi marketing site or Hesabyar ERP Desk.
- No feature additions, feature removals, or changes to the information architecture as part of this visual redesign.
- No use of the outdated gold palette currently present in the local Asumi token file; the dashboard token layer must match the live red-and-black brand direction.

## Acceptance Criteria

- Every routed `/dashboard/*` view uses the shared Asumi red-and-black foundation, including pages that omit the authenticated sidebar.
- Shared navigation and reusable controls look and behave consistently across site, server/bench, billing, Marketplace/seller, settings, and system-tool sections.
- No gold styling remains in the redesigned dashboard interface.
- Existing interactions, routes, permission boundaries, validation, confirmation prompts, and data displays remain functional.
- Persian RTL, Latin identifiers, forms, tables, dialogs, and navigation remain legible and usable at desktop, tablet, and mobile widths.
- Loading, empty, success, warning, and error states are all represented within the same design system and remain understandable without color.
