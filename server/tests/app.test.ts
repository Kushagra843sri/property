import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';
import { hasOperatorKeys } from '../src/middleware/sanitize.js';

const app = createApp();

describe('base app', () => {
  it('serves health with security headers and a request id', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'ok' } });
    expect(res.headers['x-request-id']).toBeTruthy();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('returns the standard error shape for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'not_found', message: 'Not found' });
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('rejects malformed JSON without leaking internals', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"a":');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/SyntaxError|at /);
  });

  it('rejects oversized bodies', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .send({ blob: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
  });

  it('rejects mongo operator injection in body and query', async () => {
    const body = await request(app)
      .post('/api/v1/health')
      .send({ email: { $ne: null } });
    expect(body.status).toBe(400);
    const query = await request(app).get('/api/v1/health?price[$gt]=0');
    expect(query.status).toBe(400);
  });

  it('only allows listed CORS origins', async () => {
    const ok = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:3000');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(ok.headers['access-control-allow-credentials']).toBe('true');
    const bad = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('hasOperatorKeys', () => {
  it('detects nested operators and dotted keys, passes clean input', () => {
    expect(hasOperatorKeys({ a: [{ $where: 'x' }] })).toBe(true);
    expect(hasOperatorKeys({ 'a.b': 1 })).toBe(true);
    expect(hasOperatorKeys({ a: { b: 'c' }, d: [1, 'x'] })).toBe(false);
    expect(hasOperatorKeys(null)).toBe(false);
  });
});

describe('env validation', () => {
  const base = {
    MONGODB_URI: 'mongodb://localhost/x',
    CORS_ORIGINS: 'http://localhost:3000',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };

  it('fails fast listing missing variables without echoing values', () => {
    expect(() => parseEnv({})).toThrow(/MONGODB_URI/);
    expect(() => parseEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('parses a valid development env with dev fallbacks', () => {
    const env = parseEnv({ ...base, NODE_ENV: 'development' });
    expect(env.PORT).toBe(4000);
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000']);
    expect(env.MAIL_PROVIDER).toBe('console');
  });

  it('refuses dev fallbacks in production', () => {
    expect(() => parseEnv({ ...base, NODE_ENV: 'production' })).toThrow(
      /MAIL_PROVIDER[\s\S]*SMS_PROVIDER[\s\S]*IMAGE_PROVIDER/,
    );
  });

  it('accepts a fully configured production env', () => {
    const env = parseEnv({
      ...base,
      NODE_ENV: 'production',
      TRUST_PROXY: '1',
      MAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 'k',
      MAIL_FROM: 'a@b.co',
      DEALER_NOTIFY_EMAIL: 'dealer@b.co',
      SMS_PROVIDER: 'twilio',
      TWILIO_ACCOUNT_SID: 's',
      TWILIO_AUTH_TOKEN: 't',
      TWILIO_FROM: '+15550000000',
      IMAGE_PROVIDER: 'cloudinary',
      CLOUDINARY_CLOUD_NAME: 'c',
      CLOUDINARY_API_KEY: 'k',
      CLOUDINARY_API_SECRET: 's',
    });
    expect(env.NODE_ENV).toBe('production');
  });
});
