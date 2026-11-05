# ROADMAP.md — Task Tracker

Claude: work top-down, one item at a time, tick `[x]` when the definition of done in `CLAUDE.md` is met. Ask before reordering or adding scope.

## Phase 0 — Setup

- [ ] Repo, monorepo folders, TypeScript, ESLint, Prettier, Husky pre-commit
- [ ] Env validation, `.env.example`, config modules
- [ ] MongoDB connection, base Express app with helmet, CORS, rate limit, error handler, logger
- [ ] Next.js app with design tokens, fonts, layout shell
- [ ] CI: lint, typecheck, test, audit
- [ ] Design direction agreed (palette, type, motion tokens) — run `ui-ux-pro-max`, `Hallmark`, `emil-design-eng`; get owner sign-off on wireframes/mood before building pages

## Phase 1 — Core backend

- [ ] Models: User, Property, Interest, Enquiry, AuditLog (+ indexes)
- [ ] Auth module: signup, OTP, sessions, refresh, logout, admin login
- [ ] Properties module: public list/detail with filters + pagination
- [ ] Interests module (idempotent) + dealer notification
- [ ] Enquiries module
- [ ] Admin modules: properties CRUD + image upload, users/leads, interests, enquiries, CSV export, stats
- [ ] Seed script: admin user + sample properties (clearly fake)

## Phase 2 — Public site

- [ ] Layout: header, footer with contact block, sticky mobile call/WhatsApp
- [ ] Home page with hero (3D + poster fallback), featured listings, trust section
- [ ] Listings page: filter bar, cards, skeletons, pagination, URL-synced filters
- [ ] Property detail: gallery, specs, amenities, map, sticky "Interested" panel
- [ ] Contact page + form
- [ ] About, Privacy, Terms pages
- [ ] SEO: metadata, sitemap, robots, JSON-LD

## Phase 3 — Accounts and lead flow

- [ ] Signup/login/OTP UI with consent checkbox
- [ ] "Interested" button flow incl. logged-out resume
- [ ] Account page: my interests, edit profile, withdraw consent/delete account

## Phase 4 — Admin panel

- [ ] Admin login, protected layout
- [ ] Dashboard (counts, recent leads, top-interest listings)
- [ ] Listings manager (create/edit/hide/feature/sold, multi-image upload with reorder)
- [ ] Leads manager (filters, status, notes, per-listing interest view, CSV export)
- [ ] Enquiries inbox

## Phase 5 — Polish and launch

- [ ] Motion pass: `find-animation-opportunities` → `improve-animations` → `review-animations`
- [ ] Performance pass (`animation-performance`, Lighthouse) and a11y pass
- [ ] `break-ui` pass; fix edge cases
- [ ] Security checklist run end-to-end (`SECURITY.md` §11)
- [ ] E2E suite green
- [ ] Docs complete (README, API, admin guide, handover)
- [ ] Deploy (staging → production), domain, SSL, backups, monitoring
- [ ] Handover walkthrough with client

## Phase 6 — Ideas for later (do NOT build without approval)

- [ ] Bulk email/WhatsApp promotion to consenting users
- [ ] Saved searches and alerts
- [ ] Map-based search, locality price charts, EMI calculator
- [ ] Admin 2FA (TOTP)
- [ ] Multi-language (Hindi)

## Content needed from client

- [ ] Logo, brand colors (if any), dealer photo and bio
- [ ] Contact details: phone, WhatsApp, email, office address, hours
- [ ] Property data and photos
- [ ] Privacy policy / terms review
- [ ] Domain and hosting decisions
