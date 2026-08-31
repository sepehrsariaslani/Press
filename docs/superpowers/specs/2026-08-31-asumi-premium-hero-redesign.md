# Asumi Premium Hero Redesign

## Goal

Replace the current line-art treatment with a natural, premium cinematic composition focused only on the Asumi brand and sunrise.

## Root Cause

The current wave uses narrow tube paths, so it reads as an ECG/sine graph. The sun uses circular geometry and radial opacity, so it reads as a yellow disc. Large symmetric torus meshes compete with the logo and flatten the scene.

## Approved Composition

- Background: `#080A0B`, restrained vignette, no visible card or dashboard treatment.
- Horizon: a tiny white-gold source near the lower center, wide horizontal bloom, haze, and vertical reflection. No large circular sun.
- Orbits: three hairline ellipses at `6%` to `15%` opacity with different sizes, offsets, and depth.
- Light wave: a broad translucent subdivided surface growing from the horizon toward the right, with charcoal body, soft distortion, gold rim light, and no stroke-based silhouette.
- Content: only `ASUMI`, `明日美`, `A Beautiful Tomorrow`, and `آینده‌ای روشن`, centered with generous breathing room.
- Typography: geometric sans, light weight, and wide tracking for ASUMI; restrained serif only for the English tagline; proper Persian half-space.
- Hierarchy: brand first, Japanese mark second, meaning third, light atmosphere last.

## Loader

Use the supplied React Bits Strands technique through OGL for a short loading veil. Restrict its palette to warm white, copper gold, and graphite; lower waviness and saturation so it reads as a luminous atmospheric halo rather than a rainbow sine graph. Keep an inline black-and-gold fallback in `index.html` before React mounts.

## Motion

The loader fades before the Hero timeline begins. The Hero sequence is darkness, horizon source, bloom/reflection, orbit draw, wordmark, Japanese mark, English tagline, Persian tagline, fabric growth, particles, then pointer interaction. Reduced-motion users receive the complete static frame without the timeline.

## Scope

Remove the temporary `What We Build` preview and do not add any lower-page sections. Navigation polish and product pages remain future work.
