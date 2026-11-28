import cors from 'cors';
import { env } from './env.js';

/** Exact-origin allow-list; credentials on, so never `*`. Non-browser clients (no Origin) pass. */
export const corsMiddleware = cors({
  origin(origin, cb) {
    cb(null, !origin || env.CORS_ORIGINS.includes(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-File-Name'],
  maxAge: 600,
});
