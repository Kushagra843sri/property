# STATUS

Resume point for a fresh session. Read `CLAUDE.md` first, then this file.

## Done

- Phase 0 (setup): merged to `main`.
- Phase 1 (core backend): models, auth (OTP + sessions + CSRF + admin login), public properties, interests + dealer notification, enquiries, admin API (listings, images, leads, CSV, stats), seed, provider adapters. 104 server tests green. Branch `feat/phase-1-backend`, merged to `main`.

## Next

- STOP at "Design direction agreed": `docs/design-directions.md` written; **waiting for the owner to pick a direction**. Do not build pages before that.
- Then Phase 0 leftover (design tokens, fonts, layout shell) and Phase 2.

## Decisions / notes

- No remote; merge phases into `main` locally, never push.
- Express 5: `req.query` read-only -> in-house sanitizer (rejects `$`/`.` keys), Zod output in `req.validated`.
- `ui-ux-pro-max` skill is NOT installed (skipped). `pick-ui-library`, `prototype`, `review-animations` exist on disk but may not show in a session's skill list.
- Resend / Twilio / Cloudinary adapters are written from the providers' documented REST APIs and are **untested against live accounts**. Verify when credentials exist.
- Rate limiter is in-memory (single instance). Needs a shared store before scaling out.
- API additions beyond ARCHITECTURE.md: image reorder/delete endpoints, `GET /admin/properties/:id`, `Otp` + `RefreshToken` models (see ADR 0003).
- Signup squatting edge: someone can pre-register a victim's email with a different phone; the victim can still log in via email OTP. Acceptable for now.
- `npm audit`: only moderate dev-only `minimatch` advisories (eslint toolchain); high/critical = 0.
- Pre-launch (SECURITY.md): Sentry/uptime, Dependabot, DB backups, legal review of Privacy/Terms, admin 2FA (phase 2 hardening).

## Open questions

- Which design direction (see docs/design-directions.md)?

## Env vars needed

See `server/.env.example` and the README table. Required to run: `MONGODB_URI`, `CORS_ORIGINS`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`. Later: Resend (`RESEND_API_KEY`, `MAIL_FROM`), `DEALER_NOTIFY_EMAIL`, Twilio, Cloudinary, `ADMIN_EMAIL`/`ADMIN_PASSWORD` for seeding.
