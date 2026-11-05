# Design directions

Three distinct directions for the public site. Pick one (or tell me what to mix) and I will turn it into design tokens, fonts and the layout shell, then build Phase 2 pages. Nothing is built yet.

**How this was made.** I read `hallmark`, `emil-design-eng` and `apple-design` and applied their rules (token-only colour and type, no tracked-caps labels, no invented stats or testimonials, transform/opacity-only motion, a designed fallback for every 3D or motion piece). `ui-ux-pro-max` is **not installed**, so it was skipped. `find-animation-opportunities` audits existing screens, so it runs once pages exist (Phase 5). Colours below are proposals: I have **not yet measured contrast**; I will verify WCAG AA when the tokens go in and adjust if anything fails.

**Shared across all three** (from STYLE.md): light mode only, one icon set (Lucide), `next/image` with 4:3 cards and 16:9 hero, prices in ₹ lakh/crore via `Intl.NumberFormat('en-IN')`, listing photos are always the hero, `prefers-reduced-motion` replaces movement with fades, any 3D lazy-loaded behind a poster image.

---

## A. Ledger — quiet, editorial, high-trust

A private-office feel: warm paper, deep green, a little brass. The photographs do the talking; type is large and confident.

- **Palette:** paper `#F5F1EA` · ink `#14181B` · primary forest `#1F3D36` · accent brass `#B08A4A` · neutrals warm grey scale · semantic: success green, warn amber, error brick.
- **Type:** headings **Newsreader** (serif, large, tight tracking at display sizes); body and UI **Instrument Sans**. Prices set in the serif at size, so the number is the first thing read.
- **Motion personality:** composed and slow-to-settle. Masked line reveals on headings (450 ms, ease-out), 60 ms stagger on card grids, image zoom inside the card frame on hover, shared-element card to detail. Nothing bounces.
- **Hero concept:** one full-bleed photograph of a featured property (poster paints first, so LCP is a plain image), a slow 8 % scale drift, headline masked-reveal over it. No WebGL.
- **Listing cards:** large 4:3 image, price in serif, a one-line spec row in the body face, a thin brass rule that draws on hover.
- **Strengths:** best LCP and lowest risk, scales to a dealer with few or mixed-quality photos, feels established.
- **Risks:** less "wow" than a 3D hero; depends on good photography (placeholder stand-ins until the dealer's photos arrive).

## B. Blueprint — precise, architectural, a little technical

Cool grey and graphite with one vermilion signal. Reads like an architect's drawing set: grids, fine lines, exact numbers.

- **Palette:** off-white `#F4F6F7` · graphite `#101418` · primary slate `#2F3B45` · accent vermilion `#E4572E` · cool neutral scale · semantic as above.
- **Type:** headings **Familjen Grotesk**; body **Public Sans**. Specs (BHK, area, floor) in a tidy two-column fact table style, sentence case, no capitals tracking.
- **Motion personality:** exact and snappy. 150–250 ms ease-out, springs (`stiffness 260, damping 28`) on interactive controls, filter chips that slide to selection, results re-layout with layout animation, hairline grid lines that draw in on load.
- **Hero concept:** a stylised wireframe building that assembles line by line and tilts with cursor or scroll (React Three Fiber, lazy, paused off-screen, under 1.5 MB, DPR capped at 1.75). Poster image first; reduced-motion, no-WebGL and data-saver get the static poster. Mobile gets a lighter, non-interactive version.
- **Listing cards:** crisp edges, 4:3 image, fact row with fine dividers, vermilion only on the "Interested" action and status tags.
- **Strengths:** most distinctive and memorable; the 3D piece differentiates a small dealer's site.
- **Risks:** the highest performance and maintenance cost; the hero needs a real 3D asset or my stylised scene; can feel cold if the dealer's brand is personal and warm.

## C. Warm Home — friendly, family-focused, approachable

Cream, terracotta and sage. Rounder, softer, reassuring: aimed at families buying their first home.

- **Palette:** cream `#FBF6EE` · deep brown ink `#2B211C` · primary terracotta `#C65D3B` · accent sage `#6F8F72` · warm neutral scale · semantic as above.
- **Type:** headings **Young Serif**; body **Figtree**. Slightly larger body size and generous line height.
- **Motion personality:** gentle spring. Soft 8–12 px rises on entry, cards float up and tilt a few degrees toward the cursor on featured items, "Interested" confirms with a soft press-and-morph, never confetti.
- **Hero concept:** layered photograph collage (a few property photos at different depths) with light parallax on pointer/scroll, transforms only. Optional 3D is skipped.
- **Listing cards:** rounded corners (one radius scale), warm tag chips, price with a friendly "₹ 85 lakh" format.
- **Strengths:** approachable, good for lead capture on mobile, moderate performance cost.
- **Risks:** easiest to drift into generic "cosy template" if the photography is weak; needs discipline to avoid cute decoration.

---

## Comparison

|                        | A Ledger      | B Blueprint           | C Warm Home     |
| ---------------------- | ------------- | --------------------- | --------------- |
| Feel                   | premium, calm | precise, modern       | warm, welcoming |
| Hero                   | photo         | 3D wireframe + poster | layered photos  |
| Perf risk (LCP/INP)    | lowest        | highest               | low–medium      |
| Depends on photos      | heavily       | moderately            | heavily         |
| Distinctiveness        | medium        | high                  | medium          |
| Build effort (Phase 2) | lowest        | highest               | medium          |

## Recommendation

**A (Ledger)**, with B's lazy 3D hero as an optional upgrade later if you want more spectacle. It gives the best trust signal for a single dealer, the safest Lighthouse scores, and lets the real property photos be the star. If you want the site to stand out visually from other dealers, choose **B**.

## What I need from you

1. Your pick (A, B, C, or a mix, e.g. "A palette with B's hero").
2. Any brand colours or a logo from the dealer (Content needed from client). If they exist they override the palette above.
3. Whether a 3D hero is wanted at all (STYLE.md lists it, but it is the main cost driver).

After your answer I will: set up tokens, fonts and the layout shell, run `find-animation-opportunities` on the plan, and start Phase 2 (layout, home, listings).
