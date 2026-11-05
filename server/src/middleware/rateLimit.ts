import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// shortcut: in-memory store, correct for a single instance only; swap for a shared store
// (e.g. Redis) before running more than one API process.
const make = (windowMs: number, limit: number) =>
  rateLimit({
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

const MIN = 60_000;
export const globalLimiter = make(15 * MIN, 600);
export const authLimiter = make(15 * MIN, 20);
export const otpLimiter = make(15 * MIN, 10);
export const enquiryLimiter = make(15 * MIN, 5);
export const interestLimiter = make(MIN, 10);
export const adminLoginLimiter = make(15 * MIN, 8);
