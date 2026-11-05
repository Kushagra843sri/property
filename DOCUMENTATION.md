# DOCUMENTATION.md — Documentation Standards

Documentation is part of "done". Keep it short, accurate, and current. Outdated docs are worse than none.

---

## 1. What to maintain

| Doc                   | Purpose                                                           | Update when                     |
| --------------------- | ----------------------------------------------------------------- | ------------------------------- |
| `README.md`           | Setup, scripts, env vars, run/deploy steps                        | Setup or scripts change         |
| `CLAUDE.md`           | Rules and commands for Claude Code                                | Workflow/commands change        |
| `ARCHITECTURE.md`     | Structure, data model, API                                        | Models, routes, or flows change |
| `docs/api.md`         | Endpoint reference with examples                                  | Any endpoint added/changed      |
| `docs/adr/*.md`       | Architectural decisions                                           | A significant decision is made  |
| `CHANGELOG.md`        | User-visible changes per release                                  | Every release                   |
| `ROADMAP.md`          | Task tracking                                                     | Every task                      |
| `docs/admin-guide.md` | How the dealer uses the admin panel (plain language, screenshots) | Admin features change           |
| `docs/handover.md`    | Hosting, domain, credentials process, maintenance, contacts       | Before handover                 |

## 2. README must contain

1. What the project is (2 lines)
2. Prerequisites (Node version, MongoDB, accounts needed)
3. Setup in numbered steps, copy-pasteable
4. Environment variables table (name, purpose, example, required?) — never real values
5. Scripts (dev, build, test, lint, seed)
6. Seeding the admin user and sample data
7. Deployment overview and links to `docs/handover.md`

A new developer should run the project in under 15 minutes using only the README.

## 3. Code documentation

- Self-explanatory names first; comments explain **why**, not **what**.
- JSDoc/TSDoc for exported functions, services, and non-obvious utilities.
- Every API route has a short comment block or entry in `docs/api.md`: method, path, auth, request, response, errors.
- Complex logic (OTP, filters, notification flow) gets a short explanatory comment or ADR.
- Remove dead code and stale comments; don't leave commented-out code.

## 4. API reference format (`docs/api.md`)

```
### POST /api/v1/properties/:id/interest
Auth: user · Rate limit: 10/min
Request: —
200: { data: { interested: true } }
Errors: 401 unauthorized · 404 not found · 409 already interested (idempotent, returns 200)
```

## 5. Commit and PR conventions

- Conventional Commits: `feat(listings): add price range filter`
- Subject ≤ 72 chars, imperative mood; body explains why when non-obvious.
- **No `Co-Authored-By`, `Claude-Session`, or AI attribution trailers** in commits or PR text.
- PR description: what changed, why, how to test, screenshots/GIFs for UI, docs updated (yes/no).

## 6. Changelog

Keep a Changelog format: `Added / Changed / Fixed / Removed / Security`, newest first, with dates.

## 7. Client-facing documentation

Written for a non-technical property dealer: short sentences, step-by-step with screenshots, no jargon.
Must cover: logging in, adding/editing/hiding a listing, uploading photos, marking sold/rented, viewing and filtering leads, changing lead status, exporting leads, what an "interested" notification means.

## 8. Before finishing any task

- [ ] README / ARCHITECTURE / API docs updated if affected
- [ ] New env vars added to `.env.example` and the README table
- [ ] ROADMAP item ticked
- [ ] Changelog entry added if user-visible
