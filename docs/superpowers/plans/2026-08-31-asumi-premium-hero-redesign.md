# Asumi Premium Hero Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a focused premium Asumi loader and Hero with a natural fabric-light surface and corrected brand hierarchy.

**Architecture:** OGL renders a lightweight full-screen Strands loader. React Three Fiber renders the Hero's decorative horizon, hairline orbits, layered shader surfaces, and particles while React DOM/GSAP owns all text and sequencing.

**Tech Stack:** React 19, TypeScript, GSAP, OGL, Three.js, React Three Fiber, Vitest, CSS

## Global Constraints

- Build only the loader and Hero in this phase.
- Keep the existing SVG scene as a reduced-motion and WebGL fallback, but restyle it to match the same visual hierarchy.
- Keep `/desk`, `/dashboard`, and `/api` unchanged.
- Preserve lazy loading and cap WebGL DPR at `1.5`.

---

### Task 1: Lock The Brand Frame With Tests

- [ ] Update tests to require `آینده‌ای روشن`, a loading status, the Hero host, and no `What We Build` section.
- [ ] Run the focused tests and confirm they fail before implementation.

### Task 2: Add The Strands Loader

- [ ] Install `ogl` and local variable fonts.
- [ ] Add a typed `Strands` component with resize, visibility pause, reduced-motion handling, and WebGL cleanup.
- [ ] Add the Asumi loading veil and an inline pre-React fallback.
- [ ] Re-run focused tests.

### Task 3: Replace Line Geometry With Surface Shaders

- [ ] Remove tube ribbons and circular sun geometry.
- [ ] Add anisotropic horizon and reflection shaders.
- [ ] Add layered subdivided fabric planes with vertex displacement and rim-light alpha.
- [ ] Replace torus meshes with offset hairline orbit loops and keep particles behind the content.

### Task 4: Correct Hierarchy And Motion

- [ ] Remove the temporary lower section and pill CTA.
- [ ] Apply local Manrope and Vazirmatn variable fonts.
- [ ] Sequence the approved reveal only after the loader exits.
- [ ] Keep the complete composition static for reduced motion and mobile fallback.

### Task 5: Verify And Deliver

- [ ] Run the complete test suite, typecheck, and production build.
- [ ] Verify generated assets and live root, admin, dashboard, and API routes.
- [ ] Commit and push the source on the current server branch.
