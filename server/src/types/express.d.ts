import type { Role } from '../models/user.js';

declare global {
  namespace Express {
    interface Request {
      id?: string | number | object;
      /** Zod-parsed input from the `validate` middleware. Cast per route via `v<T>()`. */
      validated: { body?: unknown; query?: unknown; params?: unknown };
      auth?: { userId: string; role: Role };
    }
  }
}

export {};
