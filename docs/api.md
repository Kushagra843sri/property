# API reference

Base: `/api/v1`. Success: `{ data, meta? }`. Failure: `{ error: { code, message, requestId, details? } }`.
Lists are paginated: `?page=1&limit=12` (limit max 50) and return `meta: { page, limit, total, totalPages }`.

**Auth** is via httpOnly cookies set on login (`access_token` 15 min, `refresh_token` 30 days, path `/api/v1/auth`).
**CSRF**: every state-changing request (POST/PATCH/DELETE) that carries a session cookie must send the header
`X-CSRF-Token` equal to the readable `csrf_token` cookie (re-issued on login and refresh). Requests from the
browser need `credentials: 'include'`.

Common errors: `400 bad_request` (validation; `details[]` lists fields) · `401 unauthorized` · `403 forbidden` ·
`404 not_found` · `413 payload_too_large` · `429 rate_limited` · `500 internal_error`.

## Public

### GET /health

`200 { data: { status: 'ok' } }`

### GET /properties

Query: `city, locality, purpose(buy|rent), type(flat|shop|office|pg|room|villa|house|plot|commercial|other), bhk (flats only), minPrice, maxPrice, furnishing, status(available|sold|rented; default available), q (text search), sort(newest|price_asc|price_desc|featured), page, limit`. Unknown params → 400. Hidden listings are never returned.
`200 { data: Property[], meta }`

### GET /properties/areas

Every area with at least one available listing, as `{ name, count, top }`. Top areas come first in the dealer's order, even with `count` 0. Other areas follow alphabetically. Pass a name as `locality` on `GET /properties`. The top area "Dwarka (any sector)" matches every Dwarka locality except Dwarka Mor.

### GET /properties/:slug

`200 { data: Property }` · `404` if unknown or hidden. Counts a view.

### POST /enquiries

Auth: none · Rate limit: 5 / 15 min / IP · Honeypot field `website` (must stay empty)
Request: `{ name, email, phone, message(5-2000), propertyId? }`
`201 { data: { received: true } }` · Dealer is emailed.

## Auth

### POST /auth/signup

Rate limit: 20 / 15 min · Request: `{ name, email, phone, consent: true, channel?: 'email'|'phone' }` (`consent` must be literal `true`)
`202 { data: { sent: true } }` — identical whether or not the account exists. Sends a 6-digit OTP (10 min, 5 attempts, 60 s resend cooldown).

### POST /auth/otp/request

Rate limit: 10 / 15 min · Request: `{ identifier }` (email or phone) → `202 { data: { sent: true } }` always.

### POST /auth/otp/verify

Rate limit: 10 / 15 min · Request: `{ identifier, code }` → `200 { data: { user } }` + session cookies. Any failure: `400 "Invalid or expired code"`.

### POST /auth/refresh

Rotates the refresh token. Reusing an old token revokes the whole session family. `200 { data: { user } }` · `401`.

### POST /auth/logout

Revokes the refresh-token family server-side and clears cookies. `200 { data: { loggedOut: true } }`.

### GET /auth/me

Auth: any · `200 { data: { user } }`.

### Admin sign-in

There is no separate admin login. An admin signs in with `POST /auth/login` (same body and the same generic `401`); the `role` in the returned user is `admin`. Admins are created only by `npm run create-admin` / `npm run seed`, never by sign-up, and Google sign-in and email-code password reset never apply to them.

## User (auth: user)

### POST /properties/:id/interest

Rate limit: 10/min · `200 { data: { interested: true } }`. Idempotent (one per user per listing; dealer notified once).
Errors: 401 · 403 consent withdrawn · 404 not found/hidden · 409 listing sold/rented.

### DELETE /properties/:id/interest

`200 { data: { interested: false } }` (idempotent).

### GET /me/interests

`200 { data: [{ createdAt, property }], meta }` (hidden listings omitted).

### PATCH /me

Request: `{ name?, consent? }`. `consent:false` withdraws (account `withdrawn`, excluded from exports, cannot register interests); `consent:true` restores. `200 { data: { user } }`.

### DELETE /me

Permanently deletes the account, its interests and sessions. `200 { data: { deleted: true } }`.

## Admin (auth: admin; all state changes are audit-logged)

| Method & path                                   | Notes                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /admin/properties`                         | `status, q, page, limit`; includes hidden listings and `viewCount`                                                                                                                                                                                                                                  |
| `POST /admin/properties`                        | Required: `title, type, purpose, address.city`. `price` is optional (omit or `null`; a listing without one shows no price), plus `bhk` when `type` is `flat` (BHK is rejected for any other type; changing a flat to another type drops its BHK). Slug is generated. Unknown fields rejected. `201` |
| `GET /admin/properties/:id`                     | Single listing                                                                                                                                                                                                                                                                                      |
| `PATCH /admin/properties/:id`                   | Partial update (status `sold/rented/hidden`, `featured`, …). Nested `address`/`geo` are replaced wholesale                                                                                                                                                                                          |
| `DELETE /admin/properties/:id`                  | Deletes the listing, its interests, and its images from the image store                                                                                                                                                                                                                             |
| `POST /admin/properties/:id/images`             | `multipart/form-data`, field `images` (JPG/PNG/WebP, ≤5 MB each, ≤20 per listing). Magic bytes checked, re-encoded to WebP, EXIF stripped. `201`                                                                                                                                                    |
| `PATCH /admin/properties/:id/images`            | `{ images: [{ publicId, order, alt? }] }` reorder / alt text                                                                                                                                                                                                                                        |
| `DELETE /admin/properties/:id/images?publicId=` | Remove one image                                                                                                                                                                                                                                                                                    |
| `GET /admin/users`                              | Leads (role `user`): `leadStatus, status, q, page, limit`; includes `interestCount`                                                                                                                                                                                                                 |
| `PATCH /admin/users/:id`                        | `{ leadStatus?(new/contacted/interested/closed), note? }` (note is appended)                                                                                                                                                                                                                        |
| `GET /admin/interests`                          | `property, user, from, to, page, limit`; includes user + listing summary                                                                                                                                                                                                                            |
| `GET /admin/enquiries`                          | `status, page, limit`                                                                                                                                                                                                                                                                               |
| `PATCH /admin/enquiries/:id`                    | `{ status: new/contacted/closed }`                                                                                                                                                                                                                                                                  |
| `GET /admin/export/leads.csv`                   | Active, consenting users only; formula-injection safe; audit-logged                                                                                                                                                                                                                                 |
| `GET /admin/stats`                              | `users, newLeads, interests, newEnquiries, properties{status:count}, recentLeads[], topProperties[]`                                                                                                                                                                                                |
