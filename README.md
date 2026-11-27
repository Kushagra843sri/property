# Property Dealer Website

A website for a single property dealer to showcase the properties he manages and capture leads
(password or Google sign-in with an emailed verification code, "Interested" button, admin panel).
Next.js client + Express/MongoDB API.

See `CLAUDE.md` for project rules and `ARCHITECTURE.md` for structure, data model and API.

## Prerequisites

- Node.js 20+ (developed on 22) and npm
- MongoDB: an Atlas cluster or a local `mongod`. **Tests do not need it** (they use `mongodb-memory-server`,
  which downloads a MongoDB binary on first run).
- Accounts needed later (not required to run in development): Resend (email), Cloudinary (images),
  Atlas (database), and optionally a Google Cloud OAuth client ID (Google sign-in). There is no SMS.

## Setup

```bash
git clone <repo> && cd <repo>
npm install                       # root: husky + lint-staged + prettier
cd server && npm install && cp .env.example .env
# edit server/.env: set MONGODB_URI and two JWT secrets (command is in .env.example)
cd ../client && npm install
```

Run (two terminals):

```bash
cd server && npm run dev          # http://localhost:4000/api/v1/health
cd client && npm run dev          # http://localhost:3000
```

In development the console mailer prints verification codes to the server log and the mock image
store returns placeholder URLs. Production refuses to start with these fallbacks.

## Environment variables (`server/.env`)

| Name                                                                   | Purpose                                          | Example                               | Required                                        |
| ---------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------- | ----------------------------------------------- |
| `NODE_ENV`                                                             | `development` / `test` / `production`            | `development`                         | no (default `development`)                      |
| `PORT`                                                                 | API port                                         | `4000`                                | no                                              |
| `LOG_LEVEL`                                                            | pino level                                       | `info`                                | no                                              |
| `MONGODB_URI`                                                          | MongoDB connection string                        | `mongodb://127.0.0.1:27017/property`  | yes                                             |
| `CORS_ORIGINS`                                                         | Comma-separated exact allowed origins            | `http://localhost:3000`               | yes                                             |
| `TRUST_PROXY`                                                          | Reverse-proxy hops (for correct client IPs)      | `1`                                   | production (must be > 0)                        |
| `JWT_ACCESS_SECRET`                                                    | Signs access tokens, 32+ chars                   | _(generate)_                          | yes                                             |
| `JWT_REFRESH_SECRET`                                                   | Signs refresh tokens, 32+ chars                  | _(generate)_                          | yes                                             |
| `CLIENT_URL`                                                           | Public site URL used in dealer-email links       | `https://example.com`                 | no (defaults to first `CORS_ORIGINS`)           |
| `COOKIE_DOMAIN`                                                        | Cookie domain if client/API are on sibling hosts | `.example.com`                        | no                                              |
| `MAIL_PROVIDER`                                                        | `console` (dev only) or `resend`                 | `resend`                              | no (default `console`; forbidden in production) |
| `RESEND_API_KEY`, `MAIL_FROM`                                          | Resend credentials and sender                    | _(provider)_                          | when `MAIL_PROVIDER=resend`                     |
| `DEALER_NOTIFY_EMAIL`                                                  | Where "Interested"/enquiry alerts go             | `dealer@example.com`                  | production                                      |
| `GOOGLE_CLIENT_ID`                                                     | Public OAuth client ID for Google sign-in        | `1234-abc.apps.googleusercontent.com` | no (without it Google sign-in is unavailable)   |
| `IMAGE_PROVIDER`                                                       | `mock` (dev only) or `cloudinary`                | `cloudinary`                          | no (default `mock`; forbidden in production)    |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary credentials                           | _(provider)_                          | when `IMAGE_PROVIDER=cloudinary`                |
| `CLOUDINARY_FOLDER`                                                    | Upload folder                                    | `properties`                          | no                                              |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                        | Used only by `npm run seed` to create the admin  | _(choose; 12+ chars)_                 | for seeding                                     |

### Client (`client/.env.local`, see `client/.env.example`)

| Name                           | Purpose                                                                      | Example                               | Required                 |
| ------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------- | ------------------------ |
| `NEXT_PUBLIC_API_URL`          | API base URL used by the browser and server components                       | `http://localhost:4000/api/v1`        | no (this is the default) |
| `NEXT_PUBLIC_SITE_URL`         | Public site URL for canonical links, sitemap and JSON-LD                     | `https://example.com`                 | production               |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same value as the server's `GOOGLE_CLIENT_ID`; empty hides the Google button | `1234-abc.apps.googleusercontent.com` | no                       |

Business name, phone numbers, address and hours are constants in `client/lib/site.ts` (marked PLACEHOLDER until confirmed). Colours, fonts and motion values are tokens in `client/styles/tokens.css`. The 3D hero can be switched off with one line in `client/lib/flags.ts`.

## Scripts

| Where  | Command                               | What                           |
| ------ | ------------------------------------- | ------------------------------ |
| server | `npm run dev`                         | API with reload                |
| server | `npm run build` / `npm start`         | compile to `dist/` / run it    |
| server | `npm run lint` / `typecheck` / `test` | static checks and Vitest       |
| server | `npm run seed`                        | create admin + sample listings |
| client | `npm run dev` / `build` / `start`     | Next.js                        |
| client | `npm run lint` / `typecheck`          | static checks                  |

A Husky pre-commit hook runs Prettier and ESLint on staged files. CI (`.github/workflows/ci.yml`)
runs lint, typecheck, test, build and `npm audit --audit-level=high` for both apps.

## Admin account and sample data

```bash
cd server
# Any environment (including production): create the admin from env values only.
ADMIN_EMAIL=owner@yourdomain.com ADMIN_PASSWORD='a long passphrase' npm run create-admin
# After `npm run build`, on a server without dev tools:  npm run create-admin:prod

# Development only (refuses to run when NODE_ENV=production): demo admin + [SAMPLE] listings
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='demo-admin-passphrase-1' npm run seed
```

`create-admin` never inserts sample data and, in production, rejects demo/example credentials. Admin accounts are never created through public signup.

## Deployment

Plan (not executed): `docs/deploy.md` (Render API, Vercel website, Atlas, split-domain cookie/CSRF notes, env checklist, backups). Day-to-day use: `docs/admin-guide.md`; handover notes: `docs/handover.md`. Previously:

Not set up yet. Overview and hosting details will live in `docs/handover.md`.
