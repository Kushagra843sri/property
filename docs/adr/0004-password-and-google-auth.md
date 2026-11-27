# 0004 — Password and Google sign-in, no SMS

**Context.** The first design (ADR 0003, `SECURITY.md`) preferred passwordless one-time codes by phone or email. In practice SMS in India needs DLT registration (business paperwork, weeks of approval) or costs about ₹5–₹7 per message, and the client has no GST number. On 2026-11-23 the owner asked for password plus Google sign-in, with email alerts and no unnecessary extras.

**Decision.**

- End users sign in with **email + password** (argon2id, min 8 characters, common/related passwords rejected) or **Google**.
- **Email OTP is kept**, email only. It verifies the address at sign-up and resets forgotten passwords. The password is sent _with_ the code and stored only if the code is correct. A password is never stored at the sign-up request, because the existing "no enumeration" sign-up would otherwise let someone pre-claim a victim's email by choosing its password.
- **Google:** `google-auth-library` verifies the ID token against our client ID; `email_verified` is required; users are matched by Google id or email; admins are never linked; a new account needs explicit consent.
- **Phone** is collected, not verified. It is optional in the model (unique only where present) so Google users can sign up without one; the "Interested" action asks for it first (`phone_required`).
- **Removed:** the SMS provider, Twilio settings, the phone OTP channel, and the production rule requiring an SMS provider. `GOOGLE_CLIENT_ID` is optional and never a startup requirement.
- **Alerts:** email to the dealer (with a `wa.me` link to the lead) and a confirmation email to the user. Automatic WhatsApp messages are not used (not free: Meta business account, template approval, per-message fees). Listings link to WhatsApp chat instead.

**Consequences.** No SMS cost or DLT paperwork. Phone numbers are unverified, so the dealer should treat them as claims. Existing databases must drop the old unique `phone_1` index once. Admin login is unchanged (password, separate endpoint and limiter). Reset-by-email is the only account recovery.
