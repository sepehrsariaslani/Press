# Asumi Hybrid 3D Hero Design

## Goal

Upgrade the existing Asumi hero into a cinematic desktop experience that follows the approved nine-beat sunrise storyboard while preserving an accessible, fast fallback.

## Approved Storyline

1. Begin in near-total darkness with a single horizon point.
2. Expand the sunrise and its vertical reflection.
3. Draw restrained orbital rings behind the focal point.
4. Reveal the spaced ASUMI wordmark.
5. Reveal the Japanese mark `明日美`.
6. Reveal `A Beautiful Tomorrow` and `آینده ای روشن`.
7. Introduce luminous ribbons and a sparse field of gold particles.
8. Enable damped pointer response for the light, camera, and ribbons.
9. Let scrolling compress the lockup and hand the viewer to an `آنچه می سازیم` preview.

## Architecture

- Keep all semantic text, navigation, controls, and GSAP choreography in React DOM.
- Render only the decorative sun, reflection, rings, ribbons, and particles in a lazy-loaded React Three Fiber canvas.
- Keep the current SVG `HorizonScene` as the fallback for reduced motion, coarse pointers, narrow viewports, unsupported WebGL, and loading/error states.
- Select the renderer through a pure capability function so the policy is independently testable.
- Use a small custom shader for the ribbons and additive materials for glow. Do not add a post-processing pipeline or real-time shadows.

## Performance And Accessibility

- Limit WebGL DPR to `1.5` and use `powerPreference: high-performance`.
- Pause the canvas when the hero is outside the viewport or the document is hidden.
- Avoid scroll hijacking. Scroll only changes presentation progress and never captures the user's wheel or touch input.
- Disable continuous pointer motion and show a complete static composition when `prefers-reduced-motion: reduce` is active.
- Keep the canvas `aria-hidden`; the complete brand message remains readable in DOM.
- Ensure the CTA and theme control remain keyboard reachable with visible focus.

## Visual Direction

- Preserve Asumi's near-black graphite field and copper-gold palette.
- The sun is a layered emissive point and soft halo at the horizon, not a literal sphere.
- Rings are thin, imperfectly offset orbital lines with slow restrained drift.
- Ribbons rise mainly from the right and cross the horizon with translucent additive blending.
- Particles remain sparse and are concentrated around the sunrise and ribbon wake.
- Pointer movement is capped to a subtle camera drift; text remains stable and legible.

## Scope

This phase implements the hero and a compact next-section transition preview only. Product pages, portfolio cards, product links, purchasing, and customer dashboard flows remain separate work.
