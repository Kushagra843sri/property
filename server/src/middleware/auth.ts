import type { RequestHandler } from 'express';
import { COOKIE_ACCESS } from '../config/constants.js';
import { User, type Role } from '../models/user.js';
import { verifyAccessToken } from '../modules/auth/tokens.js';
import { AppError } from '../utils/errors.js';

/** Authenticate from the access cookie and confirm the user still exists (with their current role). */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_ACCESS];
  if (typeof token !== 'string') return next(AppError.unauthorized());
  const claims = await verifyAccessToken(token);
  if (!claims) return next(AppError.unauthorized());

  const user = await User.findById(claims.userId).select('role').lean();
  if (!user) return next(AppError.unauthorized());
  req.auth = { userId: claims.userId, role: user.role as Role };
  next();
};

export const requireRole =
  (role: Role): RequestHandler =>
  (req, _res, next) =>
    req.auth?.role === role ? next() : next(AppError.forbidden());

/** Admin routes: authenticated AND currently an admin in the database. */
export const requireAdmin: RequestHandler[] = [requireAuth, requireRole('admin')];
