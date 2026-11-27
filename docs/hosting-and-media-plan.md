# Hosting, media and SMS plan (decisions as of 2026-11-23)

Status: **planning only. Nothing is deployed.** Prices come from vendor pages and third-party sites read on 2026-11-22/23 and were not confirmed at checkout. Rupee figures use about ₹85 per US dollar.

## 1. Domain (done)

| Item          | Value                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| Domain        | `shyamhomes.co.in`                                                                                                   |
| Registrar     | Hostinger (hPanel)                                                                                                   |
| Paid          | ₹553.42 for 1 year (₹469 + ₹84.42 GST), Black Friday new-user price                                                  |
| Status        | Active. Expires **2027-11-23**                                                                                       |
| Auto-renew    | **OFF** (client pays renewal)                                                                                        |
| Renewal       | ₹799 per year plus GST (about ₹943). Renew **before** 2027-11-23                                                     |
| After expiry  | Site goes offline; Hostinger warned of an extra fee (about ₹7,749) to recover it, and someone else could register it |
| Owner details | The developer's own details (agreed to change later if needed)                                                       |
| Nameservers   | Hostinger parking servers. Change them when the site is deployed                                                     |

To do: set a reminder for late October 2027 and tell the client the renewal date and cost. Hostinger sends WhatsApp reminders as the date nears.

## 2. Decisions so far

| Part     | Choice for now                                                                                 | Later                                                                               |
| -------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Website  | **Vercel Hobby** (free). Keep it on Hobby until the developer says otherwise                   | Free plan is non-commercial only (Pro is $20 per month, about ₹1,700)               |
| API      | **Render Free**                                                                                | Free web services sleep after 15 minutes idle; Starter is $7 per month (about ₹595) |
| Database | MongoDB Atlas free M0 for testing only                                                         | Under discussion with the client (no backups on free tiers)                         |
| Photos   | Cloudinary Free (25 credits per month)                                                         | Fine for photos; not for videos                                                     |
| Email    | Resend Free (3,000 per month, 100 per day)                                                     | Needs DNS records for the domain                                                    |
| SMS      | **Dropped**: email + password and Google sign-in instead (section 5)                           |                                                                                     |
| Accounts | One new shared business email owned by the developer and the client; create the accounts on it | Client's card needed for any paid upgrade                                           |

Cookie and CORS rules need `www.` and `api.` on the same domain. Values are in `docs/deploy.md`.

## 3. Property videos (10 to 15 videos)

- **Not YouTube**: embeds may show ads and branding.
- **Bunny Stream** is the front runner. Videos are stored there, not in MongoDB or Cloudinary. MongoDB would hold only the property data and the video link.
- Cloudinary Free is not suitable for videos (25 credits shared, 1 GB of video bandwidth per credit, 100 MB per video file).

### Bunny Stream pricing (from bunny.net docs)

| Item                                         | Rate                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| Standard encoding, player, security features | Free                                                                    |
| Storage                                      | $0.01 per GB (default region Frankfurt); a 2nd region adds $0.01 per GB |
| Delivery, Standard network, Asia and Oceania | **$0.03 per GB**                                                        |
| Delivery, Volume network                     | $0.005 per GB (not checked for India speed)                             |
| Minimum                                      | **$1 per month**                                                        |
| Free trial                                   | 14 days, no card                                                        |
| Not needed                                   | Premium encoding, AI transcription, DRM ($99 per month)                 |

### Estimated monthly cost (15 videos of about 2 minutes, about 9 GB stored)

| Traffic                               | Standard network       | Volume network |
| ------------------------------------- | ---------------------- | -------------- |
| 1,000 views per month (about 20 GB)   | about ₹85 ($1 minimum) | about ₹85      |
| 5,000 views per month (about 100 GB)  | about ₹265             | about ₹85      |
| 20,000 views per month (about 400 GB) | about ₹1,000           | about ₹170     |

Unverified: which network a library uses by default, India playback speed on the Volume network, prepaid-balance billing, and any GST or foreign-card charges.

### Code needed (needs approval first, per `CLAUDE.md`)

- A "video link" field on the property data model, a field in the admin form, and an embed on the listing page. No server upload is needed. The admin uploads in Bunny and pastes the link.
- Optional later: sign embed URLs on the server and allow only our domain.

## 4. Estimated monthly total (before SMS)

| Setup                                                                              | Approx. monthly              |
| ---------------------------------------------------------------------------------- | ---------------------------- |
| Free tiers now (Vercel Hobby, Render Free, Atlas M0, Cloudinary Free, Resend Free) | ₹0, plus about ₹85 for Bunny |
| Later, lean paid (Vercel Pro, Render Starter, Atlas Flex from about $8)            | about ₹3,000, plus Bunny     |
| Later, stronger database (Atlas M10 at $56.94; backups extra)                      | about ₹7,200, plus Bunny     |

Domain renewal is about ₹943 a year (about ₹80 a month).

## 5. SMS: dropped (decision 2026-11-23)

SMS and DLT are no longer needed. Sign-in is email + password or Google, with an emailed code only to verify the address and reset passwords. See `docs/adr/0004-password-and-google-auth.md`. The server no longer has an SMS provider, and production no longer requires one. The SMS cost lines above no longer apply.

## 6. Questions for the client (morning)

1. A business email for the accounts, or agree to create a new shared one.
2. Video details: length of each, how many visitors he expects, whether anyone may watch by link.
3. Who pays the monthly hosting, and from which card.
4. Tell him the domain renewal date (2027-11-23) and cost (about ₹943).

## 7. Next steps after the client call

1. Create the Google OAuth client ID (steps in `docs/deploy.md`).
2. Approve the video link field, then build it.
3. Create the accounts (Atlas, Render, Vercel, Cloudinary, Resend, Bunny).
4. Set the environment variables listed in `docs/deploy.md` and point DNS at the hosts.
5. Replace the placeholders in `client/lib/site.ts` (email, address, hours, phone numbers).
