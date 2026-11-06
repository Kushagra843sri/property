import { describe, expect, it } from 'vitest';
import { adminInputProblem, DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } from '../src/adminSetup.js';
import { parseEnv } from '../src/config/env.js';
import { runSeed } from '../src/seed.js';

const base = {
  MONGODB_URI: 'mongodb://localhost/x',
  CORS_ORIGINS: 'https://example.com',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  NODE_ENV: 'production',
  TRUST_PROXY: '1',
  DEALER_NOTIFY_EMAIL: 'dealer@shop.in',
  MAIL_PROVIDER: 'resend',
  RESEND_API_KEY: 'k',
  MAIL_FROM: 'a@shop.in',
  SMS_PROVIDER: 'twilio',
  TWILIO_ACCOUNT_SID: 's',
  TWILIO_AUTH_TOKEN: 't',
  TWILIO_FROM: '+1',
  IMAGE_PROVIDER: 'cloudinary',
  CLOUDINARY_CLOUD_NAME: 'c',
  CLOUDINARY_API_KEY: 'k',
  CLOUDINARY_API_SECRET: 's',
};

describe('production safety', () => {
  it('a fully configured production env is accepted', () => {
    expect(parseEnv(base).NODE_ENV).toBe('production');
  });

  it.each([
    ['MAIL_PROVIDER', 'console'],
    ['SMS_PROVIDER', 'console'],
    ['IMAGE_PROVIDER', 'mock'],
  ])('refuses %s=%s in production', (key, value) => {
    expect(() => parseEnv({ ...base, [key]: value })).toThrow(new RegExp(key));
  });

  it('refuses a wildcard CORS origin and a missing proxy hop count in production', () => {
    expect(() => parseEnv({ ...base, CORS_ORIGINS: '*' })).toThrow(/CORS_ORIGINS/);
    expect(() => parseEnv({ ...base, TRUST_PROXY: '0' })).toThrow(/TRUST_PROXY/);
  });

  it('rejects demo/example admin credentials in production but not in development', () => {
    expect(adminInputProblem(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, true)).toMatch(
      /not allowed in production/,
    );
    expect(adminInputProblem('owner@example.com', 'a-very-long-owner-passphrase', true)).toMatch(
      /not allowed/,
    );
    expect(adminInputProblem('owner@shop.in', DEMO_ADMIN_PASSWORD, true)).toMatch(/not allowed/);
    expect(adminInputProblem(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, false)).toBeNull();
    expect(adminInputProblem('owner@shop.in', 'a-very-long-owner-passphrase', true)).toBeNull();
  });

  it('rejects weak or malformed admin input everywhere', () => {
    expect(adminInputProblem('nope', 'a-very-long-owner-passphrase', false)).toMatch(/valid email/);
    expect(adminInputProblem('owner@shop.in', 'short', false)).toMatch(/rejected/);
  });

  it('the seed script refuses to run in production', async () => {
    await expect(runSeed('owner@shop.in', 'a-very-long-owner-passphrase', true)).rejects.toThrow(
      /development-only/,
    );
  });
});
