import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/errors.js';

type Schemas = { body?: ZodType; query?: ZodType; params?: ZodType };

/**
 * Validates body/query/params with Zod. Parsed values land in `req.validated` because Express 5
 * makes `req.query` read-only. Schemas should be `.strict()` so unknown fields are rejected.
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    const validated: Record<string, unknown> = {};
    for (const key of ['body', 'query', 'params'] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        const details = result.error.issues.map((i) => ({
          path: `${key}.${i.path.join('.')}`,
          message: i.message,
        }));
        return next(AppError.badRequest('Validation failed', details));
      }
      validated[key] = result.data;
    }
    req.validated = validated as Express.Request['validated'];
    next();
  };
