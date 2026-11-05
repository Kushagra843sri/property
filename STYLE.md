# STYLE.md — Design, Motion and UI Quality

Goal: a real-estate site that feels **premium, custom-designed and alive**. Use MagicBricks as a **layout and UX baseline** (listing cards, filter bar, detail page structure), but the visual identity, motion and polish must be our own. It must not look vibe-coded or like a default template.

---

## 0. Mandatory: use the design skills

Before writing or changing any UI, check which skills are installed (look in the project/user skills directories) and **invoke the relevant ones**. Do not guess skill names; use only the ones that exist, and tell the owner if an expected one is missing.

Expected skills (some come from the owner's skill pack):

| Skill                                          | Use it for                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `Hallmark`                                     | Overall visual polish and craft pass on pages/components                  |
| `ui-ux-pro-max`                                | UX decisions, layout, hierarchy, accessibility, component patterns        |
| `emil-design-eng`                              | Emil Kowalski-style design engineering: details, feel, micro-interactions |
| `animate`                                      | Adding animation to a component or page                                   |
| `animation-vocabulary`                         | Choosing correct motion terminology, easing and patterns                  |
| `animation-performance`                        | Keeping motion at 60fps (transforms/opacity only, GPU-friendly)           |
| `find-animation-opportunities`                 | Auditing a screen for places motion adds value                            |
| `improve-animations`                           | Refining existing animation (timing, easing, choreography)                |
| `review-animations`                            | Reviewing motion before merge                                             |
| `remove-animations`                            | Removing motion that is gratuitous or hurting UX/performance              |
| `apple-design`                                 | Apple-grade restraint, spacing, typography                                |
| `break-ui`                                     | Stress-testing UI to find broken states and edge cases                    |
| `pick-ui-library`                              | Choosing a UI/component library (ask owner before adding)                 |
| `prototype`                                    | Quick prototypes of an interaction before full build                      |
| `ask-sonner`                                   | Toast notifications with Sonner                                           |
| `animate-expo`, `mobile-native`, `write-swift` | Not used in this project (web only); ignore                               |

**Workflow for every UI task:**

1. Run `find-animation-opportunities` / `ui-ux-pro-max` to plan.
2. Build with `emil-design-eng` + `animate` + `animation-vocabulary`.
3. Run `Hallmark` for the polish pass.
4. Run `animation-performance` + `review-animations` + `break-ui` before calling it done.

---

## 1. Design principles

- **Restraint over decoration.** Few colors, strong typography, generous whitespace, consistent spacing scale. Motion supports hierarchy; it never competes with the property photos, which are the hero.
- **Real estate = trust.** Clean, confident, high-end. Prices, BHK, area and location must be scannable at a glance.
- **Consistency.** One design token set (colors, radii, shadows, spacing, type scale, easing, durations) defined once in Tailwind config / CSS variables. Never hardcode one-off values.
- **Every state is designed:** hover, focus, active, disabled, loading (skeletons, not spinners where possible), empty, error, success.

### Avoid (these scream "vibe-coded")

- Default Tailwind blue/purple gradients, generic glassmorphism everywhere, emoji as icons
- Identical card grids with no hierarchy, centered-everything layouts, lorem ipsum, stock "Welcome to our website" copy
- Random bounce/wiggle animations, motion on every element, heavy parallax that fights scrolling
- Inconsistent radii/shadows/spacing, mixed icon sets, low-contrast text
- Fake testimonials/stats. Never fabricate content; use clearly marked placeholders and flag them.

---

## 2. Typography, color, layout

- Choose a distinctive but readable pairing (one display/serif or geometric face for headings, one clean sans for body). Load with `next/font`, no layout shift, max two families.
- Define a type scale (fluid with `clamp()`), 1.5–1.7 body line-height, max ~70ch line length.
- Palette: one primary, one accent, neutral scale, semantic colors (success/warn/error). Support light mode first; dark mode only if the owner asks. WCAG AA contrast minimum.
- Grid: 12-col desktop, consistent gutters, mobile-first. Test at 360, 390, 768, 1024, 1280, 1536px.
- Icons: a single set (e.g. Lucide). Consistent stroke width.
- Images: `next/image`, correct `sizes`, blur placeholders, consistent aspect ratios (e.g. 4:3 cards, 16:9 hero), never layout shift.

---

## 3. Motion system

Define motion tokens once and reuse them:

```
duration: fast 150ms | base 250ms | slow 450ms | hero 800ms+
easing:  out  cubic-bezier(0.22, 1, 0.36, 1)      // entrances
         inOut cubic-bezier(0.65, 0, 0.35, 1)      // transitions
         spring { stiffness: 260, damping: 28 }    // interactive elements
```

Principles:

- Motion must **explain** something: where something came from, what changed, what is interactive.
- Animate **`transform` and `opacity` only**. Never animate `width/height/top/left/box-shadow` on large elements.
- Entrances ease-out, exits faster than entrances. UI feedback under 200ms.
- **Stagger** related items (cards, filter chips) 40–80ms; keep total sequences short.
- Use shared-element/layout transitions for listing card → detail page.
- Respect `prefers-reduced-motion`: replace movement with fades or nothing. Mandatory, no exceptions.
- Scroll-driven effects must never block or hijack native scroll (no scroll-jacking).

### Motion inventory (build these, polish them)

- **Hero:** subtle 3D property visual or scene with cursor/scroll-reactive depth, text reveal (split lines, masked), CTA micro-interaction
- **Listing cards:** hover lift + image parallax/zoom inside the frame, price/tag reveal, staggered load-in, smooth favorite/"Interested" button feedback (press, success morph, confetti-free)
- **Filters:** animated chip selection, smooth result re-layout (layout animation), skeleton → content cross-fade
- **Detail page:** gallery with fluid transitions/lightbox, sticky contact/"Interested" panel, section reveals on scroll
- **Page transitions:** shared-element transition from card to detail; route fade/slide that doesn't delay navigation
- **Numbers/stats:** count-up on viewport entry (once)
- **Nav/footer:** magnetic or underline-slide hover, smooth mobile menu, sticky header that condenses on scroll
- **Toasts/feedback:** Sonner, consistent copy and timing
- **Forms/OTP:** animated validation, field focus states, success state

### 3D (React Three Fiber / three.js)

Use 3D with intent, e.g. a hero scene (stylized building/skyline), a floating property model, or depth-tilt on featured cards.

- **Lazy-load** all 3D (`next/dynamic`, `ssr: false`), render only when in viewport, pause when off-screen.
- Keep models light (compressed glTF/Draco, textures ≤ 1024px where possible, target < 1.5MB total for 3D assets).
- Cap DPR (`dpr={[1, 1.75]}`), no heavy post-processing, no shadows unless essential.
- **Fallbacks are required:** static image/poster for low-end devices, `prefers-reduced-motion`, no WebGL, and data-saver. Mobile gets a lighter version.
- Never put 3D in the critical path of LCP; the hero must paint a poster image first.

---

## 4. Performance budget (motion must not cost the experience)

- LCP < 2.5s on mid-range mobile over 4G; CLS < 0.1; INP < 200ms
- Initial JS per route as small as possible; split heavy libs (three, gsap) into lazy chunks
- 60fps target for all animations; profile with Chrome Performance panel and report findings
- Use `will-change` sparingly and remove after animation

---

## 5. Accessibility (non-negotiable)

- Semantic HTML, landmarks, correct heading order
- All interactive elements keyboard-reachable with a visible focus ring
- Alt text on property images (describe the room/view), labels on every input, `aria-live` for toasts and form errors
- Touch targets ≥ 44px
- Don't convey state by color alone

---

## 6. Content rules

- Currency formatted for India (₹, lakh/crore with `Intl.NumberFormat('en-IN')`), area in sq.ft with units
- Real copy only. If real content isn't available, use obvious placeholders and list them in `ROADMAP.md` under "Content needed from client".
- Consistent terminology (BHK, carpet area, possession, etc.).
