# ROADMAP.md — Task Tracker

Claude: work top-down, one item at a time, tick `[x]` when the definition of done in `CLAUDE.md` is met. Ask before reordering or adding scope.

## Phase 0 — Setup

- [x] Repo, monorepo folders, TypeScript, ESLint, Prettier, Husky pre-commit
- [x] Env validation, `.env.example`, config modules
- [x] MongoDB connection, base Express app with helmet, CORS, rate limit, error handler, logger
- [x] Next.js app with design tokens, fonts, layout shell
- [x] CI: lint, typecheck, test, audit
- [x] Design direction agreed (delegated to the build agent: Ledger, retinted green and gold; see docs/design-directions.md and docs/MORNING-REVIEW.md) (palette, type, motion tokens) — run `ui-ux-pro-max`, `Hallmark`, `emil-design-eng`; get owner sign-off on wireframes/mood before building pages

## Phase 1 — Core backend

- [x] Models: User, Property, Interest, Enquiry, AuditLog (+ indexes)
- [x] Auth module: signup, OTP, sessions, refresh, logout, admin login
- [x] Properties module: public list/detail with filters + pagination
- [x] Interests module (idempotent) + dealer notification
- [x] Enquiries module
- [x] Admin modules: properties CRUD + image upload, users/leads, interests, enquiries, CSV export, stats
- [x] Seed script: admin user + sample properties (clearly fake)

## Phase 2 — Public site

- [x] Layout: header, footer with contact block, sticky mobile call/WhatsApp
- [x] Home page with hero (3D + poster fallback), featured listings, trust section
- [x] Listings page: filter bar, cards, skeletons, pagination, URL-synced filters
- [x] Property detail: gallery, specs, amenities, map, sticky "Interested" panel
- [x] Contact page + form
- [x] About, Privacy, Terms pages
- [x] SEO: metadata, sitemap, robots, JSON-LD

- [x] Area search: area field on listings (`address.locality`), dealer's top areas first, others alphabetical; `GET /properties/areas`; "Popular areas" on home
- [x] Optional price: listings without a price show none; price range filter and price sort hidden behind `FEATURES.priceFilters` (standby)
- [ ] Before enabling price sort: unpriced listings sort last (Mongo sorts null first ascending)

## Phase 3 — Accounts and lead flow

- [x] Signup/login/OTP UI with consent checkbox
- [x] "Interested" button flow incl. logged-out resume
- [x] Account page: my interests, edit profile, withdraw consent/delete account

## Phase 4 — Admin panel

- [x] Admin login, protected layout
- [x] Dashboard (counts, recent leads, top-interest listings)
- [x] Listings manager (create/edit/hide/feature/sold, multi-image upload with reorder)
- [x] Leads manager (filters, status, notes, per-listing interest view, CSV export)
- [x] Enquiries inbox

## Phase 5 — Polish and launch

- [ ] Motion pass: `find-animation-opportunities` → `improve-animations` → `review-animations`
- [x] Performance pass (`animation-performance`, Lighthouse) and a11y pass
- [x] `break-ui` pass; fix edge cases
- [ ] Security checklist run end-to-end (`SECURITY.md` §11)
- [x] E2E suite green
- [x] Docs complete (README, API, admin guide, handover) (drafts; need the owner's real details)
- [ ] Deploy (staging → production), domain, SSL, backups, monitoring
- [ ] Handover walkthrough with client

## Phase 5b — Simpler sign-in, no SMS (owner decision 2026-11-23)

- [x] Email + password sign-up and login (password stored only after the emailed code is verified), forgot password via the same code
- [x] Google sign-in (needs the owner's OAuth client ID in `GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`)
- [x] Remove SMS/Twilio and phone verification; phone is collected, optional, unique where present
- [x] "Interested": ask a Google sign-up for a phone number first; confirmation email to the user; `wa.me` link in the dealer alert
- [x] WhatsApp button on every listing card and detail page ("Need details regarding it." plus the listing link)
- [ ] Create the Google OAuth client ID and set it on Render and Vercel
- [ ] Drop the old `phone_1` index on any existing database (see `docs/deploy.md`)
- [ ] Video links on listings (Bunny Stream embeds), pending approval of the data-model change

## Phase 6 — Ideas for later (do NOT build without approval)

- [ ] Bulk email/WhatsApp promotion to consenting users
- [ ] Saved searches and alerts
- [ ] Map-based search, locality price charts, EMI calculator
- [ ] Admin 2FA (TOTP)
- [ ] Multi-language (Hindi)

## Content needed from client

- [ ] Logo file (gold winged emblem on a dark tile), brand guide if any, dealer photo and bio
- [ ] Confirm the business name spelling: "Shree Shyam Properties" (client) vs "Shri Shyam" (shop sign); it is one constant in `client/lib/site.ts`
- [ ] Confirm both phone numbers (9238306976, 8368966790 are UNVERIFIED, digits partly hidden on the sign) and which one is on WhatsApp
- [ ] Contact details: email, office address, map location, opening hours (phone numbers: see above)
- [ ] Business facts for the About page: story, years of experience, areas served
- [ ] Property data and photos
- [ ] Privacy policy / terms review
- [ ] Domain and hosting decisions
