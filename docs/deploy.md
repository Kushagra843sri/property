# Deployment guide (prepared, not executed)

Nothing here has been deployed. This is the plan for: **API on Render**, **website on Vercel**, **database on MongoDB Atlas**, **photos on Cloudinary**, **email on Resend**.

## 0. The one decision that matters: domains

Login uses cookies. Browsers only send them reliably between the website and the API when both live on the **same registrable domain**:

| Setup                                                   | Works?                                                                                                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `www.yourshop.in` (Vercel) + `api.yourshop.in` (Render) | **Yes. Use this.**                                                                                                                                  |
| `yourshop.vercel.app` + `yourapi.onrender.com`          | **No.** Different sites: the session cookie is treated as third-party and the CSRF cookie cannot be read by the website. Login would silently fail. |

So buy the domain first and attach `www.` to Vercel and `api.` to Render (both services support custom domains with free SSL).

### How cookies and CSRF behave in the split setup

- The API sets three cookies: `access_token` (15 min) and `refresh_token` (30 days), both `HttpOnly; Secure; SameSite=Lax`, and `csrf_token` (readable by the website's JavaScript).
- With `COOKIE_DOMAIN=.yourshop.in` the cookies are shared by `www.` and `api.`. `SameSite=Lax` is enough because `www.yourshop.in` and `api.yourshop.in` are **same-site** (only the port/subdomain differs).
- Every POST/PATCH/DELETE must carry the header `X-CSRF-Token` equal to the `csrf_token` cookie. The website's `api()` helper (`client/lib/api.ts`) does this automatically. This is the second layer on top of SameSite.
- CORS: the API allows only the exact origins in `CORS_ORIGINS` (with credentials). Set it to `https://www.yourshop.in` (add `https://yourshop.in` only if you serve the site there too). Never `*`.
- `TRUST_PROXY=1` is mandatory behind Render's proxy, otherwise every visitor appears to have the same IP and the rate limiter blocks everyone together. The API refuses to start in production without it.

## 1. MongoDB Atlas

1. Create a cluster (a free or the smallest paid tier is fine to start; **free tiers have no backups, use a paid tier for real data**).
2. Create a database user with a strong password and **readWrite on the `property` database only**.
3. Network access: allow Render's outbound IPs (Render lists them in the service's _Connect_ tab), not `0.0.0.0/0`.
4. Copy the connection string into `MONGODB_URI` (add `/property` as the database name).
5. Enable continuous/cloud backups and do one **test restore** into a scratch cluster before launch.

## 2. API on Render

Use a **Web Service** with Docker (`server/Dockerfile`) or Node (build `npm ci && npm run build`, start `npm start`, root directory `server`). Health check path: `/api/v1/health`.

Environment variables (checklist, all names are in `server/.env.example`):

| Variable                                  | Value                                                                                                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                | `production`                                                                                                                                                                                                  |
| `PORT`                                    | leave unset (Render sets it)                                                                                                                                                                                  |
| `MONGODB_URI`                             | Atlas string                                                                                                                                                                                                  |
| `CORS_ORIGINS`                            | `https://www.yourshop.in`                                                                                                                                                                                     |
| `CLIENT_URL`                              | `https://www.yourshop.in`                                                                                                                                                                                     |
| `COOKIE_DOMAIN`                           | `.yourshop.in`                                                                                                                                                                                                |
| `TRUST_PROXY`                             | `1`                                                                                                                                                                                                           |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | two different 48-byte random values                                                                                                                                                                           |
| `MAIL_PROVIDER`                           | `resend`, plus `RESEND_API_KEY`, `MAIL_FROM` (an address on a domain verified in Resend)                                                                                                                      |
| `DEALER_NOTIFY_EMAIL`                     | where "Interested" alerts go                                                                                                                                                                                  |
| `SMS_PROVIDER`                            | `twilio` + `TWILIO_*`, **required in production** (the console fallback is blocked). If you do not want SMS yet, tell the developer: today production refuses to start without a real SMS provider configured |
| `IMAGE_PROVIDER`                          | `cloudinary` + `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`                                                                                                                                                     |
| `LOG_LEVEL`                               | `info`                                                                                                                                                                                                        |

The API **refuses to start** in production if any development fallback (console mailer, console SMS, mock image store) is selected, if CORS has `*`, or if `TRUST_PROXY` is 0. That is intentional.

**Create the admin (once, after the first deploy)**, from Render's Shell:

```bash
ADMIN_EMAIL=owner@yourshop.in ADMIN_PASSWORD='a long passphrase of 12+ characters' npm run create-admin:prod
```

It refuses demo/example credentials and never inserts sample data. `npm run seed` is development-only and refuses to run in production.

**Rate limiter:** the default store is in memory, which is correct only with **one** API instance (keep the Render instance count at 1). To run several instances, plug a Redis store into `server/src/config/rateLimitStore.ts` (one function; example below). Nothing else changes.

```ts
// npm i rate-limit-redis redis  (not installed today)
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
const client = createClient({ url: process.env.REDIS_URL });
await client.connect();
setRateLimitStoreFactory(
  (prefix) =>
    new RedisStore({
      prefix: `rl:${prefix}:`,
      sendCommand: (...a: string[]) => client.sendCommand(a),
    }),
);
```

## 3. Website on Vercel

Root directory `client`. Environment variables:

| Variable               | Value                            |
| ---------------------- | -------------------------------- |
| `NEXT_PUBLIC_API_URL`  | `https://api.yourshop.in/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.yourshop.in`        |

Set both **before the first build** (they are baked in at build time). After deploying, open `https://www.yourshop.in/sitemap.xml` and `/robots.txt` to check them. Replace every PLACEHOLDER in `client/lib/site.ts` first (see `docs/handover.md`).

## 4. Cloudinary and Resend

- Cloudinary: create the account, note cloud name/key/secret; uploads go to the `properties` folder.
- Resend: add and verify your domain (DNS records), then create an API key. Without a verified domain, OTP emails will not reach customers.

## 5. First-launch checklist

- [ ] `https://api.yourshop.in/api/v1/health` returns `{"data":{"status":"ok"}}`
- [ ] Admin created with the command above; sign in at `/admin`
- [ ] Add one real listing with photos; it appears on the site within a minute
- [ ] Sign up as a test customer: the OTP email arrives, "I am interested" works, the dealer alert email arrives
- [ ] Send a test enquiry from the Contact page; it appears in Admin, Enquiries
- [ ] Delete the test customer from My account
- [ ] Privacy Policy and Terms reviewed by a legal professional, "draft" notices removed
- [ ] Phone numbers, address, hours and name spelling confirmed in `site.ts`

## 6. Backups and monitoring

- **Database:** Atlas backups on; test restore done; note who can restore.
- **Photos:** Cloudinary keeps originals; export the folder monthly if photos are not stored elsewhere.
- **Uptime:** a free monitor (UptimeRobot, Better Stack) on `/api/v1/health` and the home page, alerting the owner by email/WhatsApp.
- **Errors:** add Sentry (free tier) to both apps before launch (not yet integrated).
- **Logs:** Render keeps recent logs; the API logs auth events and admin actions and never logs phone numbers, emails, OTPs or tokens.
- **Dependencies:** enable Dependabot on the repository; run `npm audit` before each release.
- **Secrets:** rotate JWT secrets and provider keys if ever exposed (rotating JWT secrets signs everyone out).
- Render free web services sleep when idle; use a paid instance so OTP and logins are not delayed.

## 7. Known limits

- The `Dockerfile` has not been built (Docker is not installed on the build machine). Build it once locally or let Render build it, and watch the first deploy.
- Several API instances need the Redis store (section 2); a single instance does not.
- Real provider adapters (Resend, Twilio, Cloudinary) have never run against live accounts; test each right after setting the keys.
