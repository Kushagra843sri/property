# Handover (draft)

A plain-language summary of what you are getting, what it runs on, and what to do to keep it healthy. The technical steps are in `docs/deploy.md`.

## What you have

A website for your business with:

- **Public pages**: home, all properties with filters (buy, rent, flats, shops, offices, PG rooms, furnished rooms), a page for each property, contact, about, privacy and terms.
- **Customer accounts**: customers sign up with a one-time code sent by email and agree to be contacted. They can press **I am interested** on any property.
- **Your admin area** (`/admin`): add and edit properties and photos, see leads and interests, read enquiries, export leads. See `docs/admin-guide.md`.
- A **call/WhatsApp bar** on phones and your contact details on every page.

## What it runs on (accounts you will own)

| Service                  | Used for                       | Who pays                    | Notes                                 |
| ------------------------ | ------------------------------ | --------------------------- | ------------------------------------- |
| Domain name              | your web address               | you                         | buy before launch; keep auto-renew on |
| Vercel                   | the website                    | you (free tier at first)    | holds the public pages                |
| Render                   | the server behind the site     | you (paid tier recommended) | handles logins, listings, leads       |
| MongoDB Atlas            | the database                   | you                         | **turn backups on**                   |
| Cloudinary               | property photos                | you (free tier at first)    |                                       |
| Resend                   | sending emails (codes, alerts) | you                         | needs your domain verified            |
| An SMS provider (Twilio) | sending codes by SMS           | you                         | needed by the server today            |

Create these accounts **in your own name**, not the developer's, and share access with the developer instead. Keep a written list of logins in a password manager.

## Things to confirm before launch

1. The business name spelling (**Shree Shyam** or **Shri Shyam**).
2. Both phone numbers, and which one is on WhatsApp. (The numbers in the code now are provisional because the sign photo hid some digits.)
3. Your email, full address, opening hours and map location.
4. Your logo file (the gold winged emblem on the dark tile) and brand colours if you have a guide.
5. A short "about you" text and a photo for the About page.
6. Real properties and photos (and delete the [SAMPLE] ones).
7. The Privacy Policy and Terms reviewed by a lawyer.

## Where things live (for your developer)

- Business name, phone numbers, address, hours: `client/lib/site.ts` (one file).
- Colours, fonts, spacing, motion: `client/styles/tokens.css` (one file).
- The 3D animation on the home page can be switched off in `client/lib/flags.ts` (it only shows on large, fast screens anyway).
- Logo: `client/components/layout/Wordmark.tsx` (swap the placeholder emblem).

## Routine care

| How often | What                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| Daily     | Check new leads and enquiries; call people back; mark sold/rented.                                                |
| Weekly    | Look at the dashboard; add new properties; remove old ones.                                                       |
| Monthly   | Ask the developer to apply security updates; check the backup is running; export leads if you keep a spreadsheet. |
| Yearly    | Renew the domain; review the privacy policy; rotate passwords.                                                    |

## Privacy: what you promise customers

You store each customer's name, phone and email, **only** to contact them about properties, and only because they agreed. Customers can withdraw consent or delete their account themselves in **My account**; when they do, do not contact them and do not keep copying their details elsewhere. Keep exported files private and delete them when no longer needed.

## If something breaks

1. Check the site and `www.yourshop.in/admin` open. If not, tell your developer and check the status pages of Vercel and Render.
2. If customers say they get no code: ask them to check spam; tell your developer to check the email provider (Resend).
3. If you cannot sign in to admin: wait 15 minutes (a safety lock), then ask the developer to reset the password.
4. If you see something strange in Leads or Admin you did not do, tell your developer immediately and change your password.

## Contacts (fill in)

- Developer: __________________ phone: __________ email: __________
- Domain registrar login holder: __________________
- Hosting accounts owner: __________________
- Legal reviewer: __________________

## Not included yet

Bulk email or WhatsApp promotions, saved searches, payments, and two-step login for admin are possible later additions; they were left out on purpose and need a separate decision.
