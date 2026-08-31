# Asumi Hero and Design System Design

## Goal

Replace the public root of `asumi.ir` with a responsive React hero that expresses
the Asumi brand story: darkness becomes light, and light represents a bright
future. This phase creates only the hero and its reusable design-system
foundation. Product pages and CTA destinations are explicitly out of scope.

## Brand Direction

- Brand: `ASUMI` / `明日美`
- English line: `A Beautiful Tomorrow`
- Persian line: `آینده ای روشن`
- Motion story: `Darkness -> Light -> Clarity -> Future`
- Dark theme name: `Midnight Horizon`
- Light theme name: `Morning Horizon`
- Accent: copper-gold light, never neon or purple.

## Scope

- Create a separate `React + TypeScript + Vite` public frontend for `asumi.ir`.
- Route only the public root through the Asumi app; preserve native Frappe
  routes such as `/desk`, `/dashboard`, `/api`, `/assets`, `/files`, and `/app`.
- Implement dark and light themes, including a cinematic theme transition.
- Build the Hero from reusable atoms, molecules, and one Hero organism.
- Use SVG, CSS, and GSAP for all visual motion. Do not introduce Three.js or
  React Three Fiber in this phase.
- The CTA is visible and interactive but does not navigate until the products
  section exists.

## Out of Scope

- Product grid, pricing, customer portal, forms, analytics, and backend APIs.
- Any change to Press administration, client sites, or customer databases.
- WebGL, video backgrounds, and custom desktop cursors.

## Architecture

The new app lives in `dashboard/asumi`. Vite emits static assets to
`press/public/asumi_site` and a Frappe-rendered HTML shell to `press/www/asumi.html`.
The existing Press path resolver will receive a small Asumi-only host mapping for
the root route. It must defer all reserved routes to Frappe's default resolver.

The frontend is organized by visual responsibility:

- `styles/tokens.css`: colors, typography, spacing, radius, borders, light, and
  motion-duration variables for both themes.
- `components/atoms`: primitive visual components such as the brand mark, icon
  button, CTA button, and particle.
- `components/molecules`: theme switcher, brand lockup, and orbit composition.
- `components/organisms`: the complete Hero timeline and scene composition.
- `hooks`: motion preference, pointer parallax, and theme state behavior.

## Hero Scene

The Hero occupies `100svh` and starts visually black (`#080A0B`). It uses an
inline SVG scene composed of a horizon, reflective light, three orbit rings,
three layered translucent light waves, and a small deterministic particle set.
No raster image is required.

The initial animation is interruptible: the page remains scrollable immediately
and a reduced-motion visitor sees the final scene after a short fade. The normal
timeline completes in approximately three seconds:

1. A small horizon glow appears at the bottom center.
2. The glow expands into a sunrise and a blurred reflection.
3. The orbit rings draw with `stroke-dashoffset`, then drift slowly in opposing
   directions.
4. Light waves fade and slide into place.
5. `ASUMI` resolves from wide tracking and blur.
6. `明日美`, the English line, and Persian line reveal in sequence; the Persian
   word `روشن` coincides with a subtle horizon pulse.
7. Particles begin low-amplitude ambient movement.
8. Pointer parallax starts for desktop-capable pointers only.

The foreground content is centered and readable at every breakpoint. The
navigation is transparent at rest and gains a translucent blurred surface after
the visitor scrolls. The CTA remains a visual `button` with no action until a
product section is implemented.

## Interaction and Theme Behavior

- The scene layers respond to fine-pointer movement by at most 5px; the sunrise
  brightens by no more than 15% near the pointer.
- Theme selection is stored in `localStorage` and defaults to the user's system
  color preference if no selection has been stored.
- The theme switch animates the horizon from dark through copper-gold to ivory
  over 900-1200ms. It must not use a full-page flash.
- In light mode, the background is `#F4F0E8`, the horizon becomes champagne and
  ivory, and orbit lines use subdued gold at low opacity.
- On coarse pointers and small screens, pointer parallax is disabled, particles
  are reduced by half, and the intro is shortened.
- With `prefers-reduced-motion: reduce`, all long-running motion, parallax, and
  smooth scrolling are disabled. The completed Hero fades in within 300ms.

## Design Tokens

Dark theme uses:

- Background `#080A0B`
- Elevated `#0E1112`
- Surface `#141718`
- Hover `#1B1E1F`
- Primary text `#F4F0E8`
- Secondary text `#A9A49A`
- Asumi gold `#C8A66A`
- Bright gold `#E2BD76`
- Deep gold `#84683D`
- Olive graphite `#51564F`

Light theme uses `#F4F0E8` as its background with ivory surfaces, `#171918`
primary text, and the same copper-gold accent range at lower contrast.

Headings use a refined display serif, with a Persian-ready fallback; body copy
uses a readable Persian sans-serif and Inter fallback. The implementation must
not require a network font for first render.

## Accessibility and Performance

- Respect `prefers-reduced-motion`, keyboard focus, semantic buttons, and a
  visible focus indicator.
- Decorative scene SVGs are hidden from assistive technology; all meaningful
  text remains real HTML.
- Use `transform` and `opacity` for animation where possible, pause ambient
  animation when the Hero is outside the viewport, and avoid layout thrashing.
- Target 60 FPS on typical desktop hardware and 50-60 FPS on recent mobile
  devices without WebGL.

## Validation

- Type-check and production-build the new Vite app.
- Add focused component tests for theme persistence and reduced-motion behavior.
- Verify root routing on `asumi.ir`, while `/desk`, `/dashboard`, and `/api`
  still resolve through Frappe.
- Manually verify dark/light transition, mobile layout, keyboard focus, and
  reduced-motion behavior in a browser.
