# 0001 — Two independent npm projects, tiny root

**Context.** `CLAUDE.md` specifies `/client` and `/server` with `cd <app> && npm run …`.

**Decision.** No npm workspaces. `client` and `server` each have their own `package.json` and lockfile.
The root `package.json` only holds Husky, lint-staged and Prettier. `lint-staged.config.mjs` runs each
app's own ESLint with `--config <app>/eslint.config.mjs`. Server is ESM + NodeNext TypeScript.

**Consequences.** Apps install and deploy independently (CI matrix). Shared types are not shared by
package; the client re-declares API types it needs.
