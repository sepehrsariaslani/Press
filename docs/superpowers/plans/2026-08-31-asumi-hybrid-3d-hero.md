# Asumi Hybrid 3D Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved nine-stage cinematic Asumi hero for desktop with a reliable SVG fallback.

**Architecture:** React and GSAP own semantic content and the intro/scroll timeline. A lazy React Three Fiber scene owns only decorative light, orbit, wave, and particle layers; a pure capability policy selects it only on suitable desktop devices.

**Tech Stack:** React 19, TypeScript, GSAP, Three.js, React Three Fiber, Vitest, CSS

## Global Constraints

- Preserve `/desk`, `/dashboard`, and `/api` routing.
- Keep `HorizonScene` as the fallback.
- Respect reduced motion and never hijack scrolling.
- Cap WebGL DPR at `1.5`, use no real-time shadows, and pause rendering outside the viewport.
- Keep all meaningful text in accessible DOM.

---

### Task 1: Renderer Capability Policy

**Files:**
- Create: `dashboard/asumi/src/scene/capabilities.ts`
- Test: `dashboard/asumi/src/scene/capabilities.test.ts`

**Interfaces:**
- Produces: `canUseCinematicScene(input: SceneCapabilities): boolean`

- [ ] **Step 1: Write failing tests** for desktop WebGL acceptance and reduced-motion, coarse-pointer, narrow-screen, and unavailable-WebGL rejection.
- [ ] **Step 2: Run** `npm test -- --run src/scene/capabilities.test.ts` and confirm the missing module failure.
- [ ] **Step 3: Implement** a pure capability predicate with a `900px` minimum viewport.
- [ ] **Step 4: Re-run the focused test** and confirm it passes.

### Task 2: Cinematic Three.js Scene

**Files:**
- Create: `dashboard/asumi/src/components/three/CinematicHorizon.tsx`
- Create: `dashboard/asumi/src/components/three/AsumiCanvas.tsx`
- Create: `dashboard/asumi/src/components/molecules/HybridHorizonScene.tsx`
- Modify: `dashboard/asumi/package.json`
- Test: `dashboard/asumi/src/components/molecules/HybridHorizonScene.test.tsx`

**Interfaces:**
- Consumes: `canUseCinematicScene`, `HorizonScene`
- Produces: `HybridHorizonScene({ reducedMotion, progress })`

- [ ] **Step 1: Write a failing component test** proving the SVG fallback is rendered when cinematic rendering is disallowed.
- [ ] **Step 2: Run the focused test** and confirm it fails before implementation.
- [ ] **Step 3: Install** `three`, `@react-three/fiber`, and `@react-three/drei` only in `dashboard/asumi`.
- [ ] **Step 4: Implement** the lazy canvas, layered sun/reflection, orbit rings, shader ribbons, instanced particles, pointer damping, visibility pause, and fallback boundary.
- [ ] **Step 5: Re-run focused tests** and confirm they pass.

### Task 3: Nine-Beat DOM Choreography And Scroll Handoff

**Files:**
- Modify: `dashboard/asumi/src/components/organisms/AsumiHero.tsx`
- Modify: `dashboard/asumi/src/components/organisms/AsumiHero.test.tsx`
- Modify: `dashboard/asumi/src/App.tsx`
- Modify: `dashboard/asumi/src/styles/global.css`

**Interfaces:**
- Consumes: `HybridHorizonScene`
- Produces: staged brand reveal and a non-blocking `#what-we-build` handoff preview

- [ ] **Step 1: Extend the hero test** to require the cinematic scene host and scroll destination.
- [ ] **Step 2: Run the focused hero test** and confirm the new assertions fail.
- [ ] **Step 3: Replace the scene mount**, coordinate the approved intro beats with GSAP, map passive scroll progress to visual exit state, and add the compact four-offering transition preview.
- [ ] **Step 4: Add desktop, responsive, and reduced-motion styling** without changing existing public routes.
- [ ] **Step 5: Re-run focused tests** and confirm they pass.

### Task 4: Build, Runtime Verification, And Delivery

**Files:**
- Modify: `press/public/asumi_site/**` through the Vite build

**Interfaces:**
- Produces: deployable Asumi assets served by Frappe

- [ ] **Step 1: Run** `npm test -- --run`, `npm run typecheck`, and `npm run build` in `dashboard/asumi`.
- [ ] **Step 2: Check generated asset references** and verify `/`, `/desk`, `/dashboard`, and `/api/method/ping` remain reachable.
- [ ] **Step 3: Inspect the final diff** for accidental Press backend or route changes.
- [ ] **Step 4: Commit and push** the verified source and generated frontend assets to the current branch.
