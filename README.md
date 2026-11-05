# Property Dealer Website

A website for a single property dealer to showcase the properties he manages and capture leads
(OTP signup, "Interested" button, admin panel). Next.js client + Express/MongoDB API.

See `CLAUDE.md` for project rules and `ARCHITECTURE.md` for structure, data model and API.

## Prerequisites

- Node.js 20+ (developed on 22) and npm
- MongoDB: an Atlas cluster or a local `mongod`. **Tests do not need it** (they use `mongodb-memory-server`,
  which downloads a MongoDB binary on first run).
- Accounts needed later (not required to run in development): Resend (email), Twilio (SMS),
  Cloudinary (images), Atlas (database).

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

In development the console mailer/SMS print OTPs to the server log and the mock image store returns
placeholder URLs. Production refuses to start with these fallbacks.

## Environment variables (`server/.env`)

| Name                                                                   | Purpose                                          | Example                              | Required                                        |
| ---------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------ | ----------------------------------------------- |
| `NODE_ENV`                                                             | `development` / `test` / `production`            | `development`                        | no (default `development`)                      |
| `PORT`                                                                 | API port                                         | `4000`                               | no                                              |
| `LOG_LEVEL`                                                            | pino level                                       | `info`                               | no                                              |
| `MONGODB_URI`                                                          | MongoDB connection string                        | `mongodb://127.0.0.1:27017/property` | yes                                             |
| `CORS_ORIGINS`                                                         | Comma-separated exact allowed origins            | `http://localhost:3000`              | yes                                             |
| `TRUST_PROXY`                                                          | Reverse-proxy hops (for correct client IPs)      | `1`                                  | production (must be > 0)                        |
| `JWT_ACCESS_SECRET`                                                    | Signs access tokens, 32+ chars                   | _(generate)_                         | yes                                             |
| `JWT_REFRESH_SECRET`                                                   | Signs refresh tokens, 32+ chars                  | _(generate)_                         | yes                                             |
| `COOKIE_DOMAIN`                                                        | Cookie domain if client/API are on sibling hosts | `.example.com`                       | no                                              |
| `MAIL_PROVIDER`                                                        | `console` (dev only) or `resend`                 | `resend`                             | no (default `console`; forbidden in production) |
| `RESEND_API_KEY`, `MAIL_FROM`                                          | Resend credentials and sender                    | _(provider)_                         | when `MAIL_PROVIDER=resend`                     |
| `DEALER_NOTIFY_EMAIL`                                                  | Where "Interested"/enquiry alerts go             | `dealer@example.com`                 | production                                      |
| `SMS_PROVIDER`                                                         | `console` (dev only) or `twilio`                 | `twilio`                             | no (default `console`; forbidden in production) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`               | Twilio credentials                               | _(provider)_                         | when `SMS_PROVIDER=twilio`                      |
| `IMAGE_PROVIDER`                                                       | `mock` (dev only) or `cloudinary`                | `cloudinary`                         | no (default `mock`; forbidden in production)    |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary credentials                           | _(provider)_                         | when `IMAGE_PROVIDER=cloudinary`                |
| `CLOUDINARY_FOLDER`                                                    | Upload folder                                    | `properties`                         | no                                              |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                        | Used only by `npm run seed` to create the admin  | _(choose; 12+ chars)_                | for seeding                                     |

The client has no env vars yet.

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

## Seeding

```bash
cd server
ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='a-long-passphrase' npm run seed
```

This creates the admin account and clearly fake sample properties (title prefixed `[SAMPLE]`).
Admin accounts are never created through public signup.

## Deployment

Not set up yet. Overview and hosting details will live in `docs/handover.md`.
