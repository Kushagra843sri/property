import type { RequestHandler } from 'express';
import { AppError } from '../utils/errors.js';

/**
 * Rejects Mongo operator injection (`$ne`, `$gt`, dotted paths) in body, query and params.
 * Rejecting instead of stripping: Express 5 makes `req.query` a read-only getter, and a request
 * carrying operators is never legitimate here.
 */
export function hasOperatorKeys(value: unknown, depth = 0): boolean {
  if (depth > 10) return true; // absurdly deep input is treated as hostile
  if (Array.isArray(value)) return value.some((v) => hasOperatorKeys(v, depth + 1));
  if (value && typeof value === 'object') {
    return Object.entries(value).some(
      ([k, v]) => k.includes('$') || k.includes('.') || hasOperatorKeys(v, depth + 1),
    );
  }
  return false;
}

export const sanitize: RequestHandler = (req, _res, next) => {
  if (hasOperatorKeys(req.body) || hasOperatorKeys(req.query) || hasOperatorKeys(req.params)) {
    return next(AppError.badRequest());
  }
  next();
};
