# Asumi Cinematic Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve a responsive, animated React Hero at the public root of `asumi.ir` while preserving Press administration routes.

**Architecture:** A dedicated Vite app under `dashboard/asumi` renders the public marketing Hero and emits stable static assets into `press/public/asumi_site`. A host-aware Press resolver maps only the root route of `asumi.ir` to `press/www/asumi.html`; all reserved and non-Asumi requests retain Frappe's resolver. The frontend separates tokens, atoms, molecules, motion hooks, and the Hero organism.

**Tech Stack:** React 19, TypeScript, Vite, GSAP, Vitest, SVG, CSS variables, Frappe/Press.

## Global Constraints

- Preserve `/desk`, `/dashboard`, `/api`, `/assets`, `/files`, `/private`, and `/app` on `asumi.ir`.
- Preserve all behavior for every non-Asumi host.
- Do not add Three.js, React Three Fiber, a video background, or a custom cursor.
- Use only SVG, CSS, and GSAP for scene and scroll motion.
- The Hero CTA is a non-navigating button until the product section exists.
- Start with `#080A0B`; implement both Midnight Horizon and Morning Horizon themes.
- Respect `prefers-reduced-motion: reduce`; use only a 300ms fade and no parallax in that mode.
- Use stable build filenames so the Frappe HTML shell can load the deployed assets without a manifest lookup.

---

### Task 1: Scaffold the isolated Asumi React application

**Files:**
- Create: `dashboard/asumi/package.json`
- Create: `dashboard/asumi/tsconfig.json`
- Create: `dashboard/asumi/vite.config.ts`
- Create: `dashboard/asumi/vitest.config.ts`
- Create: `dashboard/asumi/index.html`
- Create: `dashboard/asumi/src/main.tsx`
- Create: `dashboard/asumi/src/App.tsx`
- Create: `dashboard/asumi/src/styles/global.css`
- Create: `dashboard/asumi/src/test/setup.ts`
- Modify: `package.json`
- Modify: `.gitignore`
- Test: `dashboard/asumi/src/App.test.tsx`

**Interfaces:**
- Consumes: browser DOM element `#root` and Vite build environment.
- Produces: `AsumiApp`, mounted by `main.tsx`, and `yarn run build-asumi-app` at repository root.

- [ ] **Step 1: Write the failing application render test**

```tsx
import { render, screen } from '@testing-library/react';
import { AsumiApp } from './App';

test('renders the Asumi brand heading', () => {
  render(<AsumiApp />);
  expect(screen.getByRole('heading', { name: 'ASUMI' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd dashboard/asumi && yarn test --run src/App.test.tsx`

Expected: FAIL because the application and test tooling do not exist yet.

- [ ] **Step 3: Add the package and Vite configuration**

Create `dashboard/asumi/package.json` with React, React DOM, GSAP, TypeScript,
Vite, Vitest, jsdom, Testing Library, and their TypeScript types. Configure the
scripts as:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest",
    "typecheck": "tsc -b --pretty false"
  }
}
```

Use `vite.config.ts` to emit to `../../press/public/asumi_site`, use base URL
`/assets/press/asumi_site/`, empty the output directory, and emit stable names:

```ts
rollupOptions: {
  output: {
    entryFileNames: 'assets/main.js',
    chunkFileNames: 'assets/[name].js',
    assetFileNames: 'assets/[name][extname]',
  },
}
```

Create the minimal `AsumiApp` with the `ASUMI` heading and mount it from
`main.tsx`. Import `global.css`, set `lang="fa"` and `dir="rtl"` on the root
document, and include an accessible default background. Add `vitest.config.ts`
with `environment: 'jsdom'`, the test setup import, and React Testing Library
cleanup in `src/test/setup.ts`.

Add this root script to `package.json`:

```json
"build-asumi-app": "cd dashboard/asumi && yarn build"
```

Append `press/public/asumi_site` to `.gitignore`; generated assets remain runtime
artifacts, while all React source is committed.

- [ ] **Step 4: Install only the new app dependencies and run the test**

Run: `cd dashboard/asumi && yarn install --frozen-lockfile || yarn install`

Run: `yarn test --run src/App.test.tsx`

Expected: PASS with one Asumi brand-heading test.

- [ ] **Step 5: Commit the scaffold**

```bash
git add dashboard/asumi package.json .gitignore
git commit -m "feat: scaffold Asumi React app"
```

### Task 2: Route the Asumi public root without affecting Press

**Files:**
- Create: `press/www/asumi.html`
- Modify: `press/routing.py`
- Create: `press/tests/test_asumi_routing.py`

**Interfaces:**
- Consumes: request host from `frappe.local.request.host` and requested path.
- Produces: `resolve_path(path: str) -> str`, returning `asumi` only for the
  root path of `asumi.ir` and `www.asumi.ir`.

- [ ] **Step 1: Write failing resolver tests**

```python
from unittest.mock import patch

from press.routing import resolve_path


def test_asumi_root_uses_public_shell():
    with patch('press.routing.get_request_host', return_value='asumi.ir'):
        assert resolve_path('') == 'asumi'


def test_asumi_reserved_paths_use_frappe_resolver():
    with patch('press.routing.get_request_host', return_value='asumi.ir'):
        with patch('press.routing.default_resolve_path', return_value='dashboard') as fallback:
            assert resolve_path('dashboard') == 'dashboard'
            fallback.assert_called_once_with('dashboard')
```

- [ ] **Step 2: Run the routing tests to verify failure**

Run: `bench --site asumi.ir run-tests --app press --module press.tests.test_asumi_routing`

Expected: FAIL because the host helper and Asumi mapping do not exist.

- [ ] **Step 3: Implement the host-aware mapping and HTML shell**

Define `ASUMI_HOSTS = {'asumi.ir', 'www.asumi.ir'}` and a small
`get_request_host()` helper in `press/routing.py`. Return `asumi` only where
the host is in `ASUMI_HOSTS` and the stripped path is empty. Delegate every
other request to `default_resolve_path(path)`.

Create `press/www/asumi.html` as a small public shell:

```html
<!doctype html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ASUMI | آینده ای روشن</title>
    <script type="module" src="/assets/press/asumi_site/assets/main.js"></script>
  </head>
  <body><div id="root"></div></body>
</html>
```

- [ ] **Step 4: Run the routing test and browser route checks**

Run: `bench --site asumi.ir run-tests --app press --module press.tests.test_asumi_routing`

Run: `curl -I https://asumi.ir/ https://asumi.ir/desk https://asumi.ir/dashboard`

Expected: routing test passes; root returns the Asumi shell after the app is
built; Desk and Dashboard continue to return their native Frappe/Press pages.

- [ ] **Step 5: Commit routing integration**

```bash
git add press/routing.py press/www/asumi.html press/tests/test_asumi_routing.py
git commit -m "feat: route Asumi public root"
```

### Task 3: Build the theme system and reusable primitives

**Files:**
- Create: `dashboard/asumi/src/styles/tokens.css`
- Create: `dashboard/asumi/src/hooks/useTheme.ts`
- Create: `dashboard/asumi/src/hooks/useReducedMotion.ts`
- Create: `dashboard/asumi/src/components/atoms/BrandMark.tsx`
- Create: `dashboard/asumi/src/components/atoms/AsumiButton.tsx`
- Create: `dashboard/asumi/src/components/atoms/Particle.tsx`
- Create: `dashboard/asumi/src/components/molecules/ThemeToggle.tsx`
- Create: `dashboard/asumi/src/components/molecules/BrandLockup.tsx`
- Test: `dashboard/asumi/src/hooks/useTheme.test.tsx`
- Test: `dashboard/asumi/src/components/molecules/ThemeToggle.test.tsx`

**Interfaces:**
- Consumes: `Theme = 'dark' | 'light'` and browser media/storage APIs.
- Produces: `useTheme(): { theme, setTheme, toggleTheme }`, semantic theme
  controls, and reusable brand primitives.

- [ ] **Step 1: Write failing theme tests**

```tsx
test('uses a saved theme preference', () => {
  localStorage.setItem('asumi-theme', 'light');
  const { result } = renderHook(() => useTheme());
  expect(result.current.theme).toBe('light');
});

test('theme toggle exposes an accessible label', () => {
  render(<ThemeToggle />);
  expect(screen.getByRole('button', { name: /تغییر به حالت روشن/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the theme tests to verify failure**

Run: `cd dashboard/asumi && yarn test --run src/hooks/useTheme.test.tsx src/components/molecules/ThemeToggle.test.tsx`

Expected: FAIL because the theme hook and components do not exist.

- [ ] **Step 3: Implement tokens, theme state, and primitives**

Define the exact dark palette from the approved spec in `tokens.css`, including
`#080A0B`, `#0E1112`, `#141718`, `#F4F0E8`, `#C8A66A`, `#E2BD76`, and
`#84683D`. Define the ivory Morning Horizon equivalents under
`[data-theme='light']`. Add spacing, radius, focus, opacity, and motion custom
properties.

`useTheme` must read `asumi-theme`, fall back to `prefers-color-scheme`, write
the chosen value back to storage, and set `document.documentElement.dataset.theme`.
`useReducedMotion` must subscribe to `(prefers-reduced-motion: reduce)`.

Build:

- `BrandMark` for the ASUMI wordmark.
- `BrandLockup` for ASUMI, 明日美, `A Beautiful Tomorrow`, and `آینده ای روشن`.
- `AsumiButton` with visible keyboard focus and a non-navigation button API.
- `Particle` as an `aria-hidden` decorative span.
- `ThemeToggle` as an accessible button with explicit current/next-theme labels.

- [ ] **Step 4: Run type and component tests**

Run: `cd dashboard/asumi && yarn typecheck && yarn test --run src/hooks/useTheme.test.tsx src/components/molecules/ThemeToggle.test.tsx`

Expected: type check and both test files pass.

- [ ] **Step 5: Commit the design system foundation**

```bash
git add dashboard/asumi/src
git commit -m "feat: add Asumi design tokens and primitives"
```

### Task 4: Implement the cinematic SVG scene and motion hooks

**Files:**
- Create: `dashboard/asumi/src/hooks/usePointerParallax.ts`
- Create: `dashboard/asumi/src/components/molecules/HorizonScene.tsx`
- Create: `dashboard/asumi/src/components/organisms/AsumiHero.tsx`
- Create: `dashboard/asumi/src/components/organisms/AsumiHeader.tsx`
- Modify: `dashboard/asumi/src/App.tsx`
- Modify: `dashboard/asumi/src/styles/global.css`
- Test: `dashboard/asumi/src/components/organisms/AsumiHero.test.tsx`

**Interfaces:**
- Consumes: `useTheme`, `useReducedMotion`, GSAP timeline, and pointer events.
- Produces: `AsumiHero` with `data-intro-complete`, an SVG scene, and disabled
  motion for reduced-motion and coarse-pointer visitors.

- [ ] **Step 1: Write failing Hero tests**

```tsx
test('renders each line of the approved brand lockup', () => {
  render(<AsumiHero />);
  expect(screen.getByText('明日美')).toBeInTheDocument();
  expect(screen.getByText('A Beautiful Tomorrow')).toBeInTheDocument();
  expect(screen.getByText('آینده ای روشن')).toBeInTheDocument();
});

test('does not bind pointer parallax when reduced motion is requested', () => {
  mockReducedMotion(true);
  render(<AsumiHero />);
  expect(screen.getByTestId('asumi-hero')).toHaveAttribute('data-parallax', 'off');
});
```

- [ ] **Step 2: Run the Hero tests to verify failure**

Run: `cd dashboard/asumi && yarn test --run src/components/organisms/AsumiHero.test.tsx`

Expected: FAIL because the Hero organism does not exist.

- [ ] **Step 3: Build the SVG scene and responsive Hero**

`HorizonScene` must render an accessible-hidden SVG containing:

- a horizon line and centered sun point;
- a blurred radial sunrise and irregular vertical reflection;
- three gold orbit paths drawn with stroke dash offset;
- three translucent Bezier light-wave paths on the right;
- a deterministic array of 24 decorative particles.

`AsumiHero` composes the header, scene, lockup, visual CTA `Explore Work`, and
theme toggle. Build a GSAP timeline with labels matching the approved story:
glow, reflection, orbit draw, wave reveal, wordmark, Japanese line, English and
Persian lines, pulse, CTA, then particles. Do not block scrolling during the
timeline.

`usePointerParallax` must use `requestAnimationFrame`, CSS custom properties,
and no more than 5px layer movement. Disable it for coarse pointers and
reduced-motion users. Use `IntersectionObserver` to pause ambient GSAP loops
when the Hero is out of view.

Style responsive desktop and mobile variants in `global.css`: mobile uses half
the particles, no pointer work, and a shorter 2.4 second introduction. The
navigation begins transparent and receives a blurred, bordered surface after
80px scroll.

- [ ] **Step 4: Run tests and build**

Run: `cd dashboard/asumi && yarn typecheck && yarn test --run src/components/organisms/AsumiHero.test.tsx && yarn build`

Expected: all commands pass and `press/public/asumi_site/assets/main.js` exists.

- [ ] **Step 5: Commit the Hero scene**

```bash
git add dashboard/asumi/src
git commit -m "feat: add Asumi cinematic hero"
```

### Task 5: Verify the deployed public page and native Press paths

**Files:**
- Modify: `package.json` only if `build-all` must invoke `build-asumi-app`.
- Test: `dashboard/asumi/src/App.test.tsx`

**Interfaces:**
- Consumes: built static output, `press/www/asumi.html`, and the Press resolver.
- Produces: a production build command that includes the Asumi frontend.

- [ ] **Step 1: Write a failing build-script assertion**

```tsx
import packageJson from '../../../package.json';

test('root build includes the Asumi application', () => {
  expect(packageJson.scripts['build-all']).toContain('build-asumi-app');
});
```

- [ ] **Step 2: Run the assertion to verify failure**

Run: `cd dashboard/asumi && yarn test --run src/App.test.tsx`

Expected: FAIL until the root build script invokes the new app build.

- [ ] **Step 3: Integrate and run production verification**

Append `yarn run build-asumi-app` to root `build-all` after the native Press
dashboard build. Run the full root build only after dependencies are present.
Run a Frappe site migration or cache clear after changing Python hooks, then
restart only the backend container so loaded hook configuration is refreshed.

- [ ] **Step 4: Run final checks**

Run:

```bash
cd dashboard/asumi && yarn typecheck && yarn test --run && yarn build
cd ../.. && yarn build
curl -I https://asumi.ir/
curl -I https://asumi.ir/desk
curl -I https://asumi.ir/dashboard
curl -I https://asumi.ir/api/method/ping
```

Expected:

- Asumi tests and builds pass.
- `asumi.ir/` returns the public shell and loads `/assets/press/asumi_site/assets/main.js`.
- `/desk`, `/dashboard`, and `/api/method/ping` remain native Frappe/Press routes.
- Browser verification confirms dark/light theme transition, keyboard focus,
  mobile layout, and reduced-motion fallback.

- [ ] **Step 5: Commit and push**

```bash
git add package.json dashboard/asumi/src/App.test.tsx
git commit -m "build: include Asumi frontend"
git push origin server-snapshot-20260825
```

## Plan Self-Review

- Spec coverage: Tasks 1-2 cover isolated React hosting and protected Press
  routes; Task 3 covers tokens and atomic design; Task 4 covers the approved
  Hero story, responsive motion, performance, and accessibility; Task 5 covers
  production build and live-route verification.
- Placeholder scan: no TODO/TBD or deferred implementation instructions appear.
- Type consistency: Theme is consistently `'dark' | 'light'`; the Hero exposes
  `data-parallax` and `data-intro-complete`; root routing returns the `asumi`
  page identifier.
