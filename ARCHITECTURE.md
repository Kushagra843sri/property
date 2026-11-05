# ARCHITECTURE.md

Source of truth for structure, data model, and API. Update it whenever these change.

---

## 1. System overview

```
Browser ──► Next.js (client) ──► Express API (server) ──► MongoDB
                                      │
                                      ├──► Cloudinary/S3 (images)
                                      └──► Email/WhatsApp provider (OTP + dealer notifications)
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
    /middleware        auth, role, validate, rateLimit, errorHandler
    /utils             logger, otp, mailer, pagination
    app.ts · server.ts
/docs                  ADRs, API reference
```

## 3. Data model (MongoDB / Mongoose)

**User**

```
name, email (unique, lowercase), phone (unique, E.164),
role: 'user' | 'admin', passwordHash? (admin only),
emailVerified, phoneVerified,
consent: { given, at, version },
status: 'active' | 'withdrawn',
leadStatus: 'new' | 'contacted' | 'interested' | 'closed',
adminNotes[], createdAt, updatedAt
```

**Property**

```
title, slug (unique), description,
type: 'apartment' | 'villa' | 'plot' | 'commercial' | ...,
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

- `POST /auth/signup` · `POST /auth/otp/request` · `POST /auth/otp/verify`
- `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me`
- `POST /auth/admin/login`

User (auth required)

- `POST /properties/:id/interest` · `DELETE /properties/:id/interest`
- `GET /me/interests` · `PATCH /me` · `DELETE /me` (withdraw consent / delete)

Admin (admin role)

- `GET/POST/PATCH/DELETE /admin/properties` · `POST /admin/properties/:id/images`
- `GET /admin/users` · `PATCH /admin/users/:id` (status, notes)
- `GET /admin/interests` (filter by property/user/date)
- `GET /admin/enquiries` · `PATCH /admin/enquiries/:id`
- `GET /admin/export/leads.csv`
- `GET /admin/stats` — dashboard counts

Conventions

- Response: `{ data, meta? }` on success; `{ error: { code, message, details? } }` on failure.
- All list endpoints paginated. Zod validation on every route. See `SECURITY.md`.

## 5. Key flows

**Signup:** form → `POST /auth/signup` (with consent) → OTP sent → verify → session cookies set.

**Interested:** click → if logged out, open signup modal and resume action after login → `POST /properties/:id/interest` → upsert interest → notify dealer (email/WhatsApp) with user details + listing link → UI confirms, button becomes "Interest sent".

**Admin lead handling:** admin opens Leads → filter by property/status/date → update status, add notes → export CSV.

## 6. Decisions log

Record significant decisions as short ADRs in `/docs/adr/NNNN-title.md` (context, decision, consequences).
