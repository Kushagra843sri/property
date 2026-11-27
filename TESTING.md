# TESTING.md — Quality and Testing Standards

Claude: run the relevant checks yourself and report real output. Never say "tests pass" without running them.

---

## 1. Tooling

- **Server:** Vitest or Jest + Supertest, `mongodb-memory-server` for DB tests
- **Client:** Vitest + React Testing Library for components; Playwright for end-to-end
- **Static:** ESLint, Prettier, TypeScript `--noEmit`
- **Quality:** Lighthouse CI (performance, accessibility, SEO), `npm audit`

## 2. What must be tested

**Server (priority)**

- Auth: signup, email OTP request/verify (expired, wrong, too many attempts), password sign-in and reset, Google sign-in (mocked verifier), refresh, logout
- Authorization: user cannot access admin routes or other users' data
- Interests: create, duplicate (idempotent), delete, requires auth
- Properties: filters, pagination caps, sorting, hidden listings not public
- Validation: malformed/oversized/unexpected input rejected
- Rate limits trigger on auth, OTP, enquiry
- Admin CRUD and CSV export (auth + content)

**Client**

- Filter bar state ↔ URL query params
- Interested button: logged out → signup flow → resumes action; loading/success/error states
- Forms: validation messages, disabled-while-submitting, double-submit prevention
- Admin tables: empty/loading/error states

**E2E (Playwright), critical journeys**

1. Visitor browses, filters, opens a listing
2. Visitor signs up (email code read from the dev outbox) and clicks Interested
3. Admin logs in, creates a listing with images, sees the new interest/lead, updates status, exports CSV
4. Contact form submission reaches the admin

## 3. Test conventions

- Test behavior, not implementation. Descriptive names: `it('rejects OTP after 5 failed attempts')`.
- Always include unhappy paths and edge cases, not only happy paths.
- Use factories/fixtures for data; no shared mutable state between tests.
- Mock external services (email, Google, Cloudinary), never call them in tests.
- A bug fix includes a regression test.

## 4. Manual and visual checks (UI)

Run through at 360px, 768px, 1280px:

- [ ] Keyboard-only navigation works, focus visible
- [ ] `prefers-reduced-motion` on: no large movement, 3D replaced by poster
- [ ] Slow network (throttle to Fast 3G): skeletons show, no layout shift
- [ ] Image failure and empty-data states look intentional
- [ ] Animations hold 60fps (profile once per major screen)
- [ ] Run the `break-ui` and `review-animations` skills

## 5. Performance and SEO gates

- Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95, SEO ≥ 95, Best Practices ≥ 95
- Listing and detail pages server-rendered with unique `<title>`, meta description, canonical, Open Graph, and JSON-LD (`RealEstateListing`/`Product` as appropriate)
- `sitemap.xml` and `robots.txt` present

## 6. Pre-merge command set

```
npm run lint && npm run typecheck && npm test && npm audit --audit-level=high
```

Report any failure honestly and fix it; don't skip, delete, or weaken a failing test to get green.
