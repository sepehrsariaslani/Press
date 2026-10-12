# Asumi Public Site Restore Implementation Plan

> **Inline execution:** This plan is being implemented in the current session, without creating agents or separate chats.

**Goal:** Restore the former black-and-red Asumi public site, including its scroll-driven flashlight story, module pages, and pricing screens.

**Architecture:** Restore the public marketing UI from historical commit `77597c317` into `dashboard/asumi`, then build it through the existing Vite-to-Frappe asset sync. Keep `/marketplace`, `/saas`, and `/pricing` on their current database-backed catalog pages; direct the old site’s customer-area navigation to the current `/dashboard/orders` surface rather than reviving the retired customer portal APIs.

**Tech Stack:** React, TypeScript, Vite, Vitest, Frappe website assets.

## Global Constraints

- Preserve the existing public catalog and Press dashboard routes.
- Do not modify the unrelated worktree change in `press/routing.py`.
- Use the historical Asumi implementation as the design source; do not invent a replacement design.
- Publish only public pages; no customer login state or private data is used for visual checks.

---

### Task 1: Reproduce the missing public experience

**Files:**
- Modify: `dashboard/asumi/src/App.test.tsx`
- Test: `dashboard/asumi/src/App.test.tsx`

- [x] Replace the hero-only assertion with a regression assertion for the evidence board, six story chapters, and fifteen module cards.
- [x] Run `cd dashboard/asumi && yarn test --run src/App.test.tsx` and confirm it fails because the current app has no story or module sections.

### Task 2: Restore the historic public site

**Files:**
- Restore public UI source from: commit `77597c317`, under `dashboard/asumi/src/components/site`, `dashboard/asumi/src/product`, `dashboard/asumi/src/story`, and `dashboard/asumi/src/styles`.
- Modify: `dashboard/asumi/src/App.tsx`, `dashboard/asumi/src/App.test.tsx`, and `dashboard/asumi/src/components/site/SiteHeader.tsx`.
- Preserve: current `dashboard/asumi/package.json`, Vite configuration, and the existing Frappe catalog templates.

- [x] Restore the historical site, module, and pricing components without restoring the retired `customer-portal` implementation.
- [x] Route the site header’s customer-area link to `/dashboard/orders` and retain the historical in-page pricing and website-design estimators.
- [x] Run `cd dashboard/asumi && yarn test --run` and `cd dashboard/asumi && yarn build`; confirm story, pricing, type-check, and asset-shell sync pass.

### Task 3: Verify and publish the restored public site

**Files:**
- Build output: `press/public/asumi_site` and `press/www/asumi.html`.

- [x] Capture post-build screenshots at the same public routes and viewport as `/tmp/asumi-restore-audit/before-root.png`, `/tmp/asumi-restore-audit/before-pricing.png`, and `/tmp/asumi-restore-audit/before-marketplace.png`.
- [x] Verify the public root, pricing catalog, and marketplace return HTTP 200 and every root asset referenced by `press/www/asumi.html` returns HTTP 200.
- [x] Deploy the static build to the already-authorized shared Bench and verify the live public pages without running a database migration.
- [x] Keep the final screenshots under `/tmp/asumi-restore-audit` for the handoff, including the restored story at several scroll positions.
- [x] Reproduce and fix the public catalog contrast issue: Frappe pages used a white body background while Asumi's commerce text uses light colors. Apply the dark page surface to `/saas` and `/marketplace` through their page contexts.
- [x] Add regression coverage for the catalog and marketplace page classes; both focused modules pass (21 tests).
- [x] Fix Frappe's direct dark heading color override, version the stylesheet URL to bypass stale browser cache, and verify the rebuilt stylesheet returns HTTP 200.
- [x] Verify `/`, `/saas`, `/pricing`, and `/marketplace` at 320, 768, and 1440 px after the approved Asumi migration and shared Bench reload: all return HTTP 200, have no horizontal overflow or CSS/JS failures, and the story changes as the page scrolls.
