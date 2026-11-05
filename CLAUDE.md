# CLAUDE.md — Property Dealer Website

Read this file first on every session. Then read the file(s) relevant to your task:

| Working on                                                         | Read               |
| ------------------------------------------------------------------ | ------------------ |
| Any UI, animation, styling                                         | `STYLE.md`         |
| Auth, forms, uploads, admin, env vars, anything touching user data | `SECURITY.md`      |
| Data models, API, folder layout                                    | `ARCHITECTURE.md`  |
| Writing/updating docs, commit messages, changelog                  | `DOCUMENTATION.md` |
| Tests, pre-merge checks                                            | `TESTING.md`       |
| What to build next                                                 | `ROADMAP.md`       |

If two files conflict, `SECURITY.md` wins, then this file, then the rest.

---

## 1. What we're building

A website for a property dealer to showcase the properties he manages and capture leads.
UI baseline: MagicBricks (layout patterns, listing cards, filters, detail page). We are **not** cloning its functionality — it is a marketplace; this is a single dealer's portfolio with lead capture.

### Phase 1 scope

1. **Public site:** home, listings with filters, property detail, about, contact page, footer with contact info, privacy and terms pages.
2. **User signup/login:** name, phone, email; verification (OTP); explicit consent to be contacted. Purpose: the dealer can reach interested users and promote more properties.
3. **"Interested" button** on every listing: logged-in user clicks once; an `interest` record is stored and the dealer is notified with the user's details and the listing. Unauthenticated users are prompted to sign up first. One interest per user per listing.
4. **Admin panel:** manage listings (CRUD, multi-image upload, mark sold/rented, feature, hide), view and manage leads (users, interests, contact-form enquiries), lead status (New / Contacted / Interested / Closed), notes, CSV export.
5. **Contact:** persistent footer contact block, dedicated contact page (phone, WhatsApp click-to-chat, email, address + map, hours, enquiry form), sticky call/WhatsApp button on mobile.

### Out of scope (needs an explicit instruction to build)

User-posted listings, payments, agent marketplace, recommendation engines, bulk email campaigns. Do not add them "while you're at it".

---

## 2. Stack (decided unless the owner says otherwise)

- **Frontend:** Next.js (App Router) + React + TypeScript, for SEO on listing pages
- **Styling/motion:** Tailwind CSS, Motion (Framer Motion), GSAP where needed, React Three Fiber / three.js for 3D — see `STYLE.md`
- **Backend:** Node.js + Express + TypeScript (separate API in `/server`)
- **Database:** MongoDB with Mongoose
- **Images:** Cloudinary (or S3), always transformed/compressed
- **Validation:** Zod on every request body and query
- **Auth:** JWT in httpOnly cookies, details in `SECURITY.md`
- **Email:** transactional provider (Resend/Brevo/SES) for OTP and dealer notifications

If you believe a different library is needed, propose it and wait for approval; don't swap the stack silently.

---

## 3. Repo layout

```
/client            Next.js app
/server            Express API
/docs              extra documentation (ADRs, API reference)
CLAUDE.md  STYLE.md  SECURITY.md  ARCHITECTURE.md
DOCUMENTATION.md  TESTING.md  ROADMAP.md
```

Full detail in `ARCHITECTURE.md`.

---

## 4. Commands

Keep this section accurate; update it when scripts change.

```
# client
cd client && npm run dev        # dev server
npm run build && npm run lint && npm run typecheck

# server
cd server && npm run dev
npm run build && npm run lint && npm run typecheck && npm test
```

Before declaring any task done, run lint, typecheck, and the relevant tests, and report the actual results. Never claim something works without running it.

---

## 5. Working rules

**Process**

- For any task larger than a single small change: state a short plan first, then implement in small steps.
- Work on one roadmap item at a time. Check `ROADMAP.md`, tick items off when done.
- Ask before: adding a dependency, changing the data model, changing auth, or anything that deletes data.
- Don't refactor unrelated code. Don't leave `TODO` without a matching entry in `ROADMAP.md`.

**Code quality**

- TypeScript strict mode. No `any` without a comment explaining why.
- Concise, readable code. Handle edge cases explicitly: empty states, loading, errors, invalid input, duplicate submissions, network failure, very long text, missing images.
- Prefer optimal complexity: DB indexes for filtered fields, pagination on every list endpoint, no N+1 queries.
- Small components, single responsibility. Business logic goes in services, not route handlers or components.
- No hardcoded secrets, URLs, or magic numbers. Config lives in env/constants.
- Errors: never leak stack traces or internals to the client. Use a central error handler and consistent error shape.

**UI**

- Every UI task starts by reading `STYLE.md` and invoking the design/animation skills listed there. The site must look designed by a human studio, not generated.

**Git**

- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Small, focused commits; one logical change each.
- **Do not add `Co-Authored-By`, `Claude-Session`, or any other Claude/AI attribution trailer** to commits or PR descriptions.
- Never commit `.env*`, credentials, uploads, or `node_modules`.
- Branch per feature: `feat/<name>`. Never push straight to `main`.

**Honesty**

- If a requirement is ambiguous, ask. If something fails or is unverified, say so plainly.
- Never invent API behavior, library options, or links. Verify against docs or the installed package.

---

## 6. Definition of done

A task is done only when:

- [ ] Works on mobile (360px) and desktop, including keyboard navigation
- [ ] Loading, empty, and error states exist
- [ ] Inputs validated on client **and** server
- [ ] Security checklist in `SECURITY.md` passes for the touched area
- [ ] Lint, typecheck, and tests pass
- [ ] Docs updated per `DOCUMENTATION.md`
- [ ] Reduced-motion and performance rules in `STYLE.md` respected
