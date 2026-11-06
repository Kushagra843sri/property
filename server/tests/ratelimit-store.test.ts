import express from 'express';
import request from 'supertest';
import type { Store } from 'express-rate-limit';
import { afterEach, describe, expect, it } from 'vitest';
import { setRateLimitStoreFactory } from '../src/config/rateLimitStore.js';
import { makeLimiter } from '../src/middleware/rateLimit.js';

afterEach(() => setRateLimitStoreFactory(() => undefined));

describe('rate limit store', () => {
  it('uses a pluggable store and limits through it', async () => {
    const hits = new Map<string, number>();
    const prefixes: string[] = [];
    const store: Store = {
      async increment(key) {
        const n = (hits.get(key) ?? 0) + 1;
        hits.set(key, n);
        return { totalHits: n, resetTime: new Date(Date.now() + 60_000) };
      },
      async decrement(key) {
        hits.set(key, (hits.get(key) ?? 1) - 1);
      },
      async resetKey(key) {
        hits.delete(key);
      },
    };
    setRateLimitStoreFactory((p) => (prefixes.push(p), store));

    const app = express();
    app.use(makeLimiter(60_000, 2, 'probe-test'));
    app.get('/', (_q, r) => void r.send('ok'));

    expect(prefixes).toEqual(['probe-test']);
    expect((await request(app).get('/').set('x-test-rate-limit', '1')).status).toBe(200);
    expect((await request(app).get('/').set('x-test-rate-limit', '1')).status).toBe(200);
    expect((await request(app).get('/').set('x-test-rate-limit', '1')).status).toBe(429);
    expect([...hits.values()][0]).toBe(3); // the custom store saw every hit
  });

  it('falls back to the in-memory store by default', async () => {
    const app = express();
    app.use(makeLimiter(60_000, 1));
    app.get('/', (_q, r) => void r.send('ok'));
    expect((await request(app).get('/').set('x-test-rate-limit', '1')).status).toBe(200);
    expect((await request(app).get('/').set('x-test-rate-limit', '1')).status).toBe(429);
  });
});
