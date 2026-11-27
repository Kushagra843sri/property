# SECURITY.md — Security and Privacy Rules

This site stores **personal data** (names, phone numbers, emails, interests) and has an admin panel that exposes it. Treat security as a feature. These rules override convenience. If a task would violate them, stop and ask.

---

## 1. Secrets and configuration

- All secrets in environment variables. Never hardcode, never commit, never log.
- `.env*` in `.gitignore`. Maintain `.env.example` with names only (no values).
- Validate env on startup with Zod; fail fast if missing.
- Separate values for dev/staging/prod. Rotate anything that is ever exposed.
- If you see a secret in code or git history, flag it immediately.

## 2. Authentication

- Passwords: hash with **argon2id** (or bcrypt cost ≥ 12). Min length 8, check against common passwords. Never store or log plaintext.
- End users sign in with **email + password** or **Google** (owner's decision, 2026-11-23; see `docs/adr/0004-password-and-google-auth.md`). A user's password is stored only after an **emailed code proves they own the inbox** (so nobody can claim someone else's email), and the same code resets a forgotten password. No SMS.
- Sessions: **JWT access token (short-lived, ~15 min) + refresh token (rotating)** in **httpOnly, Secure, SameSite=Lax/Strict cookies**. Never in `localStorage`.
- OTP (email only): 6 digits, hashed at rest, expires in 5–10 min, max 5 attempts, resend cooldown, rate-limited per email **and** per IP. Password login has its own strict per-IP limit, a single generic failure message, and constant-time handling of unknown emails.
- Google sign-in: the server verifies the ID token (signature, expiry, issuer, **our client ID as audience**) and requires `email_verified`. It may link to an existing user by email but **never to an admin**; a new account needs explicit consent.
- Generic error messages on login/OTP failure (no user enumeration).
- Logout invalidates the refresh token server-side.

## 3. Authorization

- Roles: `user`, `admin`. Enforce **server-side on every route**; never trust client checks.
- Admin routes live under `/api/admin/*` behind admin middleware. Admin accounts are created via seed/CLI, **never via public signup**.
- One sign-in for everyone (owner decision, 2026-11-28): an admin uses the normal email + password form and the session role grants admin access. The shared login limit is strict (8 tries / 15 min / IP), admins are never linked to Google sign-in, and email-code password reset ignores admin accounts.
- Check ownership on every user-scoped resource (a user can only read/modify their own data).
- Admin panel: consider 2FA (TOTP) as a phase-2 hardening item; strong password and rate-limit login from day one.

## 4. Input handling

- Validate and sanitize **all** input with Zod (body, query, params, headers). Reject unknown fields.
- Mongo: use Mongoose schemas with types; never pass raw `req.body` into queries. Use `express-mongo-sanitize` (or equivalent) against operator injection (`$ne`, `$gt`...).
- Escape/sanitize any user-supplied text rendered as HTML. Never use `dangerouslySetInnerHTML` with user data.
- Limit body size, array lengths, string lengths, pagination `limit` (cap, e.g. 50).
- Normalize phone numbers (E.164) and emails (lowercase, trimmed) before storing/comparing.

## 5. Web protections

- **HTTPS only**, HSTS in production.
- `helmet` with a real CSP (no `unsafe-inline` where avoidable), `X-Content-Type-Options`, `Referrer-Policy`, frame protections.
- **CORS:** allow-list exact origins; no `*` with credentials.
- **CSRF:** SameSite cookies plus CSRF token/double-submit or custom header on state-changing requests.
- **Rate limiting** (`express-rate-limit` + store): strict on auth, OTP, contact form, and "Interested"; moderate on the rest.
- **Spam protection** on public forms: honeypot field + rate limit, plus Cloudflare Turnstile/hCaptcha if abuse appears.
- Idempotency: unique index on `(userId, propertyId)` for interests so double clicks never create duplicates.

## 6. File uploads (listing images)

- Admin-only. Check MIME type **and** magic bytes, extension allow-list (jpg, png, webp), max size (e.g. 5MB), max count per listing.
- Upload to Cloudinary/S3 via signed/server-side upload; never serve user files from the app server's disk.
- Strip EXIF/location metadata. Randomized filenames.

## 7. Data protection and privacy (India — DPDP Act 2023 mindset)

- Collect the minimum needed (name, phone, email). Don't collect what you don't use.
- Signup has an **explicit, unticked-by-default consent checkbox** to be contacted about properties, with links to Privacy Policy and Terms. Store consent: `consentGiven`, `consentAt`, `consentVersion`, IP optional.
- Provide a way for users to **withdraw consent / delete their account**; admin lead export must exclude users who withdrew.
- Don't log PII (phones, emails, OTPs, tokens). Mask in logs (`98****1234`).
- Encrypt DB at rest (managed Mongo/Atlas) and in transit (TLS). Restrict DB network access; no public DB.
- Admin CSV exports: admin-only, audit-logged.
- Privacy Policy and Terms pages must exist before launch. Flag to the owner that they should be reviewed by a legal professional.

## 8. Dependencies and supply chain

- Pin versions via lockfile; commit the lockfile.
- Run `npm audit` before merging; fix high/critical. Enable Dependabot/Renovate.
- Don't add small unmaintained packages for trivial tasks. Ask before adding any dependency.

## 9. Errors, logging, monitoring

- Central error handler. Client sees generic messages + a request ID; stack traces only in server logs.
- Structured logs (pino). Log auth events, admin actions (create/update/delete listing, export), and failures. Never log secrets or PII.
- Add uptime + error monitoring (e.g. Sentry) before launch.

## 10. Deployment

- Production runs with `NODE_ENV=production`; debug and source maps off for public.
- Least-privilege DB user; separate credentials per environment.
- Automated DB backups with a tested restore.
- Different admin credentials from dev; no default accounts.

---

## 11. Pre-merge security checklist

For any change touching auth, forms, uploads, admin, or user data:

- [ ] Input validated with Zod server-side
- [ ] Authz enforced server-side (role + ownership)
- [ ] No secrets or PII in code, logs, or responses
- [ ] Rate limiting applied where the endpoint is public
- [ ] No NoSQL injection / XSS vectors
- [ ] Error responses are generic
- [ ] New dependencies justified and audited
- [ ] Tests cover the unhappy path (unauthorized, invalid, duplicate, expired)

## 12. If you find a vulnerability

Stop, don't paper over it. Describe it to the owner (what, where, impact, proposed fix) before continuing. Never disable a security control to make a test or feature pass.
