import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { createRateLimitStore } from '../config/rateLimitStore.js';

// Storage is pluggable (config/rateLimitStore.ts); the default in-memory store suits one process only.
export const makeLimiter = (windowMs: number, limit: number, prefix = 'rl') => {
  const store = createRateLimitStore(prefix);
  return rateLimit({
    ...(store ? { store } : {}),
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Tests share one IP, so limiting is opt-in there via the header. NODE_ENV=test is
    // impossible in production (env validation forbids it there only via the provider rules,
    // and the test runner sets it explicitly).
    skip: (req) => env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit'],
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'rate_limited',
          message: 'Too many requests',
          requestId: String(req.id ?? ''),
        },
      });
    },
  });
};
const make = (windowMs: number, limit: number, prefix: string) =>
  makeLimiter(windowMs, limit, prefix);

const MIN = 60_000;
export const globalLimiter = make(15 * MIN, 600, 'global');
export const authLimiter = make(15 * MIN, 20, 'auth');
export const otpLimiter = make(15 * MIN, 10, 'otp');
export const enquiryLimiter = make(15 * MIN, 5, 'enquiry');
export const interestLimiter = make(MIN, 10, 'interest');
export const adminLoginLimiter = make(15 * MIN, 8, 'admin-login');
