import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { COOKIE_ACCESS, COOKIE_CSRF, COOKIE_REFRESH, HEADER_CSRF } from '../config/constants.js';
import { AppError } from '../utils/errors.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF check, on top of SameSite=Lax. Enforced for any state-changing request that
 * carries a session cookie; requests without session cookies have nothing to be forged against.
 */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE.has(req.method)) return next();
  if (!req.cookies?.[COOKIE_ACCESS] && !req.cookies?.[COOKIE_REFRESH]) return next();

  const cookie = req.cookies?.[COOKIE_CSRF];
  const header = req.get(HEADER_CSRF);
  if (
    typeof cookie === 'string' &&
    typeof header === 'string' &&
    cookie.length > 0 &&
    cookie.length === header.length &&
    timingSafeEqual(Buffer.from(cookie), Buffer.from(header))
  ) {
    return next();
  }
  next(AppError.forbidden('Invalid CSRF token'));
};
