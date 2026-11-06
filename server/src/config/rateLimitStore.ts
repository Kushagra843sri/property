import type { Store } from 'express-rate-limit';

/**
 * The single plug-in point for the rate limiter's storage. Return `undefined` for the built-in
 * in-memory store (fine for one API process, e.g. development). To share limits across several
 * API instances, return a Redis-backed store here (see docs/deploy.md); nothing else changes.
 */
export type RateLimitStoreFactory = (prefix: string) => Store | undefined;

let factory: RateLimitStoreFactory = () => undefined;

export const setRateLimitStoreFactory = (f: RateLimitStoreFactory) => {
  factory = f;
};
export const createRateLimitStore = (prefix: string) => factory(prefix);
export const usesSharedRateLimitStore = () => factory('probe') !== undefined;
