# 0003 — Provider adapters, sessions and OTP

**Context.** Third-party credentials (email, SMS, Cloudinary) arrive later; auth design is fixed by SECURITY.md.

**Decision.**

- `providers/{mailer,sms,imageStore}` expose small interfaces. Dev fallbacks (`console`, `mock`) are the env defaults but env validation **refuses to start in production** with them. OTPs are logged only when `NODE_ENV=development`.
- Resend, Twilio and Cloudinary adapters call their REST APIs with `fetch` (no SDKs). They are written from the providers' documented APIs but **not yet exercised against live accounts**.
- Access token: JWT (HS256, 15 min). Refresh token: opaque random value, stored HMAC-hashed, rotated on every use; replaying a rotated token revokes its family. All in httpOnly cookies; CSRF via double-submit header.
- OTP: HMAC-hashed (keyed), 10 min TTL, 5 attempts spent atomically, 60 s resend cooldown (silent, to avoid enumeration), single use.
- Signup/OTP-request responses are identical for known and unknown accounts.
- Rate limiter uses the in-memory store (single instance); swap for a shared store before scaling out.

**Consequences.** `Otp` and `RefreshToken` collections were added to the data model. Controllers are folded into route files for small modules.
