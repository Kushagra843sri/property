# Morning review

(Work in progress: sections 1 to 6 are filled in as the overnight run completes. Entries below are already known.)

## 3. Not verified / known risks

- **THREE.Clock deprecation warning (dev console).** Installed versions are already the latest stable: `three@0.187.0`, `@react-three/fiber@9.8.2` (peer range `three >=0.156`). R3F 9.8.2 still creates a `THREE.Clock` internally; the only newer builds are `10.0.0-alpha/canary`, which I did not adopt. Harmless warning; it disappears when R3F ships a release using `THREE.Timer`. Our own code (`components/three/HeroScene.tsx`) uses `clock.elapsedTime` from R3F state, so it needs no change.
- Browser-extension attributes on `<body>` (e.g. `cz-shortcut-listen`) caused a hydration warning; fixed with `suppressHydrationWarning` on `<body>`. A scan of `app/`, `components/` and `lib/` found no real SSR/client mismatches: every `window`/`document` use is inside effects or handlers, `new Date()` is only in the server-rendered footer, and number formatting uses an explicit `en-IN` locale.
