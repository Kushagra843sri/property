# 0002 — Express 5 and Mongo operator injection

**Context.** Express 5 makes `req.query` a read-only getter, so `express-mongo-sanitize` (which
mutates it) is not usable.

**Decision.** In-house `middleware/sanitize.ts` rejects (400) any body/query/params key containing
`$` or `.`. Zod `.strict()` schemas are the second layer; Mongoose schemas the third.

**Consequences.** No dependency on an unmaintained package.
