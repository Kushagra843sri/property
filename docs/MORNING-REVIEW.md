# Morning review

Everything below was done unattended. No deployments, no pushes, no real emails/SMS/uploads (dev adapters only). All work is merged to `main` locally; nothing was pushed (there is no remote).

## 1. Decisions I made for you

| Decision                                                                                                                                                                                                                                                                                                    | Why                                                          | Alternatives                           | How to change                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Design: Direction A (Ledger), retinted green and gold** with a lazy 3D hero as an upgrade.                                                                                                                                                                                                                | You delegated it; the client later described green and gold. | B or C in `docs/design-directions.md`. | Edit `client/styles/tokens.css` (colours, type scale, motion tokens). Fonts: `client/app/layout.tsx`.         |
| **3D hero behind one flag.** Wireframe skyline (React Three Fiber), poster image always painted first, mounted after idle, paused off-screen/hidden tab, skipped for reduced motion, data-saver, no WebGL; lighter on mobile (fewer towers, no pointer reaction, DPR 1).                                    | Your request; protects LCP.                                  | Static poster only.                    | Set `hero3d: false` in `client/lib/flags.ts` (three.js is then never downloaded).                             |
| **Business name** "Shree Shyam Properties", one constant `BUSINESS_NAME`. **The shop sign says "Shri Shyam"; spelling unconfirmed.**                                                                                                                                                                        | As instructed.                                               | n/a                                    | `client/lib/site.ts`.                                                                                         |
| **Phone numbers 9238306976 and 8368966790 are UNVERIFIED placeholders**, used only in `client/lib/site.ts` (checked: nowhere else). First number is "main" and also used for WhatsApp.                                                                                                                      | Digits partly hidden on the sign.                            | n/a                                    | Edit `PHONE_DIGITS` / `WHATSAPP_DIGITS` in `site.ts`.                                                         |
| **Property types** are now `flat, shop, office, pg, room, villa, house, plot, commercial, other`. `apartment` was replaced by `flat` (data model change you requested). **BHK is required for flats and rejected for every other type** (create and update; changing a flat to another type drops its BHK). | Client facts.                                                | Keep `apartment`.                      | `server/src/models/property.ts`, `server/src/modules/admin/schema.ts` (`bhkProblem`), `propertiesService.ts`. |
| **UI type chips**: Flat, Shop, Office, PG room, Furnished room. Villa/house/plot/commercial still work via the API but have no chip. BHK chips appear only after choosing Flat; the URL parser ignores `bhk` unless `type=flat`.                                                                            | Matches the client's services.                               | Add chips in `QUICK_TYPES`.            | `client/lib/listing-query.ts`.                                                                                |
| **Buy and Rent have equal weight**: two identical hero buttons and two identical entry tiles; quick links for PG rooms, Furnished rooms, 1/2/3 BHK flats, Shops, Offices.                                                                                                                                   | Your request.                                                | n/a                                    | `client/app/(public)/page.tsx` (`QUICK`).                                                                     |
| **Gold is accent only.** `--gold` (#c9a227) is decorative; text uses `--gold-ink` (on light) and `--gold-bright` (on the dark green).                                                                                                                                                                       | Raw gold fails AA on light surfaces.                         | n/a                                    | Tokens.                                                                                                       |
| **Header and footer are deep green**, panels white, page background warm off-white.                                                                                                                                                                                                                         | "Deep green background with gold lettering, white panels".   | Light header.                          | Tokens + `Header.tsx`/`Footer.tsx`.                                                                           |
| **Placeholder emblem** (simple winged mark on a dark tile) behind one component.                                                                                                                                                                                                                            | Real logo not supplied.                                      | n/a                                    | Replace `LogoMark` in `client/components/layout/Wordmark.tsx`.                                                |
| **Next.js Cache Components turned off** (the create-next-app default). Pages use server components with time-based revalidation (home 1 min, listings 30 s, detail 60 s).                                                                                                                                   | Simpler and predictable for a first build.                   | Re-enable later.                       | `client/next.config.ts`.                                                                                      |
| **OTP via email by default** (phone/SMS optional per signup).                                                                                                                                                                                                                                               | SMS needs paid credentials.                                  | SMS default.                           | `channel` in signup.                                                                                          |
| **Withdrawing consent keeps the account** (status `withdrawn`), blocks new interests and excludes the user from CSV; **Delete account** permanently removes the user, interests and sessions.                                                                                                               | DPDP mindset from SECURITY.md.                               | Soft delete.                           | `server/src/modules/users/routes.ts`.                                                                         |
| **Placeholder photos are generated SVG artwork** in `client/public/placeholders/` (script `client/scripts/gen-placeholders.mjs`); sample listings point at them.                                                                                                                                            | No real photos exist.                                        | Stock photos.                          | Delete samples; upload real photos in admin.                                                                  |
| **Legal pages are drafts** with a visible "not reviewed by a legal professional" notice.                                                                                                                                                                                                                    | Required by SECURITY.md.                                     | n/a                                    | Edit `LegalPage` consumers; remove the notice after review.                                                   |
| **`apple-design`/`emil-design-eng`/`hallmark` applied manually.**                                                                                                                                                                                                                                           | Skills loaded; their long procedures not run end to end.     | n/a                                    | n/a                                                                                                           |
| **Maps use OpenStreetMap embeds** (no API key). Office coordinates are placeholders.                                                                                                                                                                                                                        | No Google key.                                               | Google Maps.                           | `SITE.geo` in `site.ts`.                                                                                      |
| **E2E demo server** (`npm run dev:memory`) uses an in-memory MongoDB and exposes the OTP outbox on `127.0.0.1:4001`. Dev only; refuses production.                                                                                                                                                          | Playwright needs OTPs without real email.                    | n/a                                    | `server/scripts/dev-memory.ts`.                                                                               |
| **Sitemap lists only public listings**, `/admin` and `/account` are noindex and disallowed in robots.                                                                                                                                                                                                       | SEO hygiene.                                                 | n/a                                    | `client/app/robots.ts`.                                                                                       |

## 2. Blockers and things that need you

1. **Confirm the business name spelling** ("Shree Shyam" vs "Shri Shyam"): edit `BUSINESS_NAME` in `client/lib/site.ts`.
2. **Confirm both phone numbers and which is on WhatsApp**: edit `PHONE_DIGITS` and `WHATSAPP_DIGITS` in `client/lib/site.ts`. (Also in ROADMAP "Content needed from client".)
3. **Real logo file** (gold winged emblem on a dark tile): replace `LogoMark` in `Wordmark.tsx`; add favicon/app icon (`client/app/icon.png`).
4. **Client content**: email, office address, opening hours, map coordinates (`SITE` in `site.ts`), dealer bio and photo (`SITE.dealer`, About page), real property data and photos (admin panel).
5. **MongoDB Atlas**: create a cluster, a least-privilege DB user, allow your server's IP, put the connection string in `server/.env` as `MONGODB_URI`.
6. **Email (Resend or Brevo/SES)**: sets `MAIL_PROVIDER=resend`, `RESEND_API_KEY`, `MAIL_FROM` (verified domain), `DEALER_NOTIFY_EMAIL`. Plugs into `server/src/providers/mailer.ts`. Needed for OTP emails and the dealer's "Interested" alerts.
7. **SMS (optional)**: Twilio (`SMS_PROVIDER=twilio`, `TWILIO_*`) in `server/src/providers/sms.ts`; or choose an Indian provider and I will add an adapter.
8. **Cloudinary**: `IMAGE_PROVIDER=cloudinary`, `CLOUDINARY_*` for photo uploads (`server/src/providers/imageStore.ts`).
9. **Admin account**: `cd server && ADMIN_EMAIL=... ADMIN_PASSWORD='12+ char passphrase' npm run seed` against the real database (sample listings are only inserted outside production).
10. **JWT secrets**: generate two 48-byte secrets (command in `server/.env.example`).
11. **Legal review** of Privacy Policy and Terms (both are drafts), including the governing-law city.
12. **Hosting, domain, SSL, backups, Sentry/uptime monitoring, Dependabot**: Phase 5, not started.

## 3. Not verified / known risks

- **Resend, Twilio and Cloudinary adapters have never run against live accounts.** They follow the providers' documented REST APIs.
- **Rate limiter is in-memory** (single API instance). Use a shared store before scaling out.
- **Performance is not measured**: no Lighthouse run, no real-device test, no 60fps profiling. The 3D hero is built to be cheap and lazy but is unmeasured. LCP/CLS/INP budgets from STYLE.md are unchecked.
- **Contrast**: every token pair is calculated (`npm run contrast`, also a Vitest test) and passes AA, but only token pairs are checked; text laid over photos and the 3D scene is not.
- **Accessibility** was reviewed by hand and with Playwright role queries only; no axe/Lighthouse pass and no screen-reader test. Keyboard: skip link, focus rings and the native `<dialog>` focus trap are in place.
- **Skills**: `ui-ux-pro-max` is not installed. `animation-performance`, `review-animations`, `break-ui` and `find-animation-opportunities` were **not run**; their principles were applied by hand (transform/opacity only, reduced-motion fallback, long text wrapping, empty/error/loading states) and a few edge cases are tested. `hallmark`'s `sloplint` was not run.
- **THREE.Clock deprecation warning** in the dev console: installed `three@0.187.0` and `@react-three/fiber@9.8.2` are already the latest stable; R3F still creates a `THREE.Clock` internally and only 10.x alpha/canary builds differ, so I did not upgrade. Harmless.
- **Hydration**: `suppressHydrationWarning` on `<body>` for browser-extension attributes; a scan found no real SSR/client mismatches.
- Draft statements on the legal pages and About page are placeholders, not facts.
- **Signup squatting edge**: someone can pre-register another person's email with a different phone; the victim can still log in via email OTP.
- Optional fields cannot be cleared (set to empty) from the admin edit form; omitting a field leaves the old value.
- Multi-instance or serverless hosting for the API is untested (cookies, rate limiter, in-memory state).
- A `wip:` commit (`dd8736c`) was created by an earlier session interruption; it is part of history and harmless.
- `npm audit`: high/critical = 0 in both apps. Moderate dev-only `minimatch` advisories remain in the eslint toolchain.

## 4. What was completed, in order

| #   | Work                                                                                                                                                | Commit                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1   | Phase 0 setup (repo, tooling, env validation, base Express app, Next scaffold, CI, README)                                                          | `3cb87ca` to `c7ff855`           |
| 2   | Phase 1 backend (models, OTP auth, properties, interests, enquiries, admin API, seed; 104 tests)                                                    | `36bdda2`, `59d3846`, `b9542c7`  |
| 3   | Design directions proposal                                                                                                                          | `aa794f4`, `7a92287`             |
| 4   | Phase 2 public site: tokens, fonts, shell, home, listings, detail, contact, about, privacy, terms, SEO, 3D hero                                     | `617c604`                        |
| 5   | Property types flat/shop/office/pg/room, BHK for flats only, new seed (server)                                                                      | `5dc8971`                        |
| 6   | Green and gold theme, Shree Shyam Properties branding, Buy/Rent parity, PG/room quick links, Playwright, dev-memory server                          | `6af330e`                        |
| 7   | Client tests (filters, formatting, tokens, forms, interest flow)                                                                                    | `d28cf55`                        |
| 8   | Phase 3: My account (interests, name, consent, delete), docs/roadmap                                                                                | `038db00`                        |
| 9   | Mobile detail layout fix, card wrapping; merge of phases 2 and 3                                                                                    | `7ced3cc`, `f239b4e`             |
| 10  | Phase 4 admin panel UI (login, dashboard, listings with photo upload/reorder/delete, leads with status and notes, interests, enquiries, CSV export) | `ce2c7bb` and the merge after it |

**Final check results** (run after the last code change): server lint, typecheck, build clean, 106 tests passed; client lint, typecheck, build clean, 25 unit tests passed, contrast all pairs pass; Playwright 7 passed (journeys 1 to 4, account, keyboard, mobile 360px); `npm audit --audit-level=high` clean for both apps.

**Screenshots** (`docs/screenshots/`, 1280px and 360px): home, listings, listings-rent-pg, detail, contact, about, admin-dashboard, admin-listings, admin-leads, admin-new-listing. Example: `docs/screenshots/home-1280.png`, `docs/screenshots/home-360.png`. (Fixed elements such as the mobile call bar appear mid-page in full-page captures; the map frame is blank offline.)

## 5. Where to start tomorrow

1. Read this file, then open `docs/screenshots/home-1280.png` and `home-360.png` and run the site (section 6) to judge the look.
2. Send me answers on name spelling, phone numbers and the WhatsApp number (section 2, items 1 and 2), plus the logo file.
3. Create the Atlas cluster and the Resend account, fill `server/.env`, and run the seed with a real admin passphrase.
4. Replace the sample listings: sign in at `/admin`, delete the `[SAMPLE]` ones, add real listings with photos.
5. Tell me to start Phase 5 (performance and accessibility measurement, deployment prep), and get the legal review started.

## 6. How to run it locally and view each page

```bash
# terminal 1: API with in-memory database, sample data, OTP outbox
cd server && npm install && npm run dev:memory
# terminal 2: website
cd client && npm install && npm run dev
```

Open http://localhost:3000. When you sign up, the 6-digit code is printed in the API terminal and shown at http://127.0.0.1:4001/outbox.

| Page                          | URL                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| Home                          | `/`                                                                                              |
| All properties, filters       | `/listings` (try `/listings?purpose=rent&type=pg`)                                               |
| Property detail               | open any card                                                                                    |
| Contact                       | `/contact`                                                                                       |
| About, Privacy, Terms         | `/about`, `/privacy`, `/terms`                                                                   |
| My account (after signing in) | `/account`                                                                                       |
| Admin                         | `/admin`, sign in with `admin@example.com` / `demo-admin-passphrase-1` (demo only)               |
| Admin pages                   | `/admin/listings`, `/admin/listings/new`, `/admin/leads`, `/admin/interests`, `/admin/enquiries` |

Checks: `cd server && npm run lint && npm run typecheck && npm test && npm run build`; `cd client && npm run lint && npm run typecheck && npm test && npm run build && npm run contrast`; `cd client && npm run e2e` (starts the demo API if it is not running).

To use a real MongoDB instead of the in-memory one: copy `server/.env.example` to `server/.env`, fill `MONGODB_URI` and the secrets, then `npm run dev`.
