# ARCHITECTURE.md

Source of truth for structure, data model, and API. Update it whenever these change.

---

## 1. System overview

```
Browser ──► Next.js (client) ──► Express API (server) ──► MongoDB
                                      │
                                      ├──► Cloudinary/S3 (images)
                                      ├──► Email provider (verification codes, user and dealer notifications)
                                      └──► Google (ID-token verification for Google sign-in)
```

- Client renders public pages (SSR/ISR for SEO), calls the API for data and auth.
- Server owns all business logic, auth, validation, and notifications.

## 2. Folder structure

```
/client
  /app                 routes (App Router)
    (public)/          home, listings, listings/[slug], about, contact, privacy, terms
    (auth)/            login, signup, verify
    account/           user profile, my interests
    admin/             admin panel (protected)
  /components
    ui/                design-system primitives
    listings/ forms/ layout/ motion/ three/
  /lib                 api client, utils, formatters, constants
  /styles              tokens, globals
/server
  /src
    /config            env, db, cors, helmet
    /models            Mongoose schemas
    /modules           feature modules: auth, users, properties, interests, enquiries, admin
      each: routes.ts · controller.ts · service.ts · schema.ts (zod)
    /middleware        auth, csrf, sanitize, validate, rateLimit, upload, errorHandler
    /providers         mailer, google, imageStore (adapters: console/mock for dev, real for prod)
    /utils             logger, otp, phone, password, csv, pagination
    app.ts · server.ts
/docs                  ADRs, API reference
```

## 3. Data model (MongoDB / Mongoose)

**User**

```
name, email (unique, lowercase), phone? (E.164; unique where present; collected, not verified),
role: 'user' | 'admin', passwordHash? (argon2id; users get it only after the emailed code is verified),
googleSub? (unique where present), emailVerified, phoneVerified (unused),
consent: { given, at, version },
status: 'active' | 'withdrawn',
leadStatus: 'new' | 'contacted' | 'interested' | 'closed',
adminNotes[], createdAt, updatedAt
```

**Property**

```
title, slug (unique), description,
type: 'flat' | 'shop' | 'office' | 'pg' | 'room' | 'villa' | 'house' | 'plot' | 'commercial' | 'other',
         (bhk is required for 'flat' and rejected for every other type)
purpose: 'buy' | 'rent',
price, priceUnit, bhk, bathrooms, carpetArea, builtUpArea, areaUnit,
furnishing, floor, totalFloors, facing, ageOfProperty, possession,
address: { line, locality, city, state, pincode }, geo: { lat, lng },
amenities[], images[{ url, publicId, alt, order }],
status: 'available' | 'sold' | 'rented' | 'hidden',
featured, viewCount, createdAt, updatedAt
```

Indexes: `slug`, compound on `(status, city, purpose, type, price)`, `bhk`, text index on `title/locality`.

**Interest**

```
user (ref), property (ref), createdAt, notified (bool)
```

Unique index: `(user, property)`.

**Enquiry** (contact form)

```
name, email, phone, message, property? (ref), status, createdAt
```

**Otp** (implementation detail of the OTP design)

```
identifier (unique; normalized email), channel ('email'), codeHash (HMAC), attempts, lastSentAt, expiresAt (TTL)
```

**RefreshToken** (rotating sessions)

```
user, tokenHash (HMAC), family, expiresAt (TTL), revokedAt
```

**AuditLog** (admin actions)

```
admin (ref), action, entity, entityId, meta, createdAt
```

## 4. API (REST, prefix `/api/v1`)

Public

- `GET /properties` — filters: `city, locality, purpose, type, bhk, minPrice, maxPrice, furnishing, sort, page, limit`
- `GET /properties/:slug`
- `POST /enquiries` — contact form (rate-limited, honeypot)

Auth

- `POST /auth/signup` · `POST /auth/login` (email + password) · `POST /auth/google` (ID token)
- `POST /auth/otp/request` · `POST /auth/otp/verify` (email code; with `password` it also sets/resets the password)
- `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me`
- `POST /auth/admin/login`

User (auth required)

- `POST /properties/:id/interest` · `DELETE /properties/:id/interest`
- `GET /me/interests` · `PATCH /me` (name, consent, phone) · `DELETE /me` (withdraw consent / delete)

Admin (admin role)

- `GET/POST/PATCH/DELETE /admin/properties` · `GET /admin/properties/:id` · `POST/PATCH/DELETE /admin/properties/:id/images` (add / reorder+alt / remove)
- `GET /admin/users` · `PATCH /admin/users/:id` (status, notes)
- `GET /admin/interests` (filter by property/user/date)
- `GET /admin/enquiries` · `PATCH /admin/enquiries/:id`
- `GET /admin/export/leads.csv`
- `GET /admin/stats` — dashboard counts

Conventions

- Response: `{ data, meta? }` on success; `{ error: { code, message, details? } }` on failure.
- All list endpoints paginated. Zod validation on every route. See `SECURITY.md`.

## 5. Key flows

**Signup:** form (name, email, phone, password, consent) → `POST /auth/signup` (no password sent) → code emailed → `POST /auth/otp/verify` with the code **and** the password → email verified, password stored, session cookies set. Nobody can set a password on an email address they do not control.

**Sign in:** `POST /auth/login` (email + password), or Google (`POST /auth/google`: ID token checked against our client ID, `email_verified` required, linked to an existing user by email, never to an admin, consent required for a new account). Forgot password = request a code, then verify it with a new password.

**Interested:** click → if logged out, open the sign-in modal and resume after login → if the account has no phone (Google sign-up) ask for it once (`PATCH /me`) → `POST /properties/:id/interest` → upsert interest → email the dealer (user details, a `wa.me` WhatsApp link, the listing link) and send the user a confirmation email → UI confirms, button becomes "Interest sent". Listings also have a WhatsApp button that opens a chat with the message "Need details regarding it." and the listing link (WhatsApp shows the photo as a link preview).

**Admin lead handling:** admin opens Leads → filter by property/status/date → update status, add notes → export CSV.

## 6. Decisions log

Record significant decisions as short ADRs in `/docs/adr/NNNN-title.md` (context, decision, consequences).
