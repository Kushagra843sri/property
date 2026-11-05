# STATUS

Resume point for a fresh session. Read `CLAUDE.md` first, then this file.

## Done

- Phase 0 (setup): repo, tooling, env validation, config, base Express app, Next.js scaffold, CI, README. Merged to `main`.

## Next

- Phase 1 core backend (models, auth, properties, interests, enquiries, admin, seed). Branch `feat/phase-1-backend`.
- Then STOP at "Design direction agreed": write `docs/design-directions.md`, wait for the owner's pick.

## Decisions / notes

- No remote; merge phases into `main` locally, never push.
- Express 5: `req.query` read-only -> in-house sanitizer, validated input in `req.validated`.
- `ui-ux-pro-max` skill is NOT installed (skipped). `pick-ui-library`, `prototype`, `review-animations` are on disk but may not appear in a session's skill list.
- `npm audit`: only a moderate dev-only `minimatch` advisory (typescript-eslint transitive); high/critical = 0.

## Open questions

- None.

## Env vars needed (all in `server/.env.example`, table in README)

Required now: `MONGODB_URI`, `CORS_ORIGINS`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.
Later (provider credentials): Resend, Twilio, Cloudinary, `DEALER_NOTIFY_EMAIL`.
