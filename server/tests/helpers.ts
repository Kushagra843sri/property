import { afterAll, afterEach, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.js';
import { outbox } from '../src/providers/mailer.js';
import { hashPassword } from '../src/utils/password.js';

export const app = createApp();

/** Connects to an isolated database for this test file and wipes data between tests. */
export function useTestDb() {
  beforeAll(async () => {
    const uri = process.env.TEST_MONGO_URI as string;
    await mongoose.connect(uri, { dbName: `t_${randomUUID().replace(/-/g, '')}` });
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  });
  afterEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
    outbox.length = 0;
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
}

export type Session = ReturnType<typeof makeSession>;

/** A cookie-keeping client that adds the CSRF header automatically once logged in. */
export function makeSession() {
  const agent = request.agent(app);
  let csrf = '';
  const capture = (res: request.Response) => {
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const c = cookies.find((s) => s.startsWith('csrf_token='));
    if (c) csrf = decodeURIComponent(c.split(';')[0]!.split('=')[1]!);
    return res;
  };
  const withCsrf = (t: request.Test) => (csrf ? t.set('X-CSRF-Token', csrf) : t);
  return {
    agent,
    get csrf() {
      return csrf;
    },
    get: (url: string) => agent.get(url),
    post: async (url: string, body?: object) => capture(await withCsrf(agent.post(url)).send(body)),
    patch: async (url: string, body?: object) =>
      capture(await withCsrf(agent.patch(url)).send(body)),
    del: async (url: string) => capture(await withCsrf(agent.delete(url))),
    postRaw: (url: string) => withCsrf(agent.post(url)),
  };
}

let seq = 0;
export const uniqueUser = () => {
  seq += 1;
  return {
    name: `Test User ${seq}`,
    email: `user${seq}@example.com`,
    phone: `+9198000${String(10000 + seq)}`,
  };
};

const lastOtp = (to: string) => {
  const mail = [...outbox].reverse().find((m) => m.to === to);
  return mail?.text.match(/(\d{6})/)?.[1];
};

/** Sign up through the real endpoints, read the OTP from the dev outbox and log in. */
export async function signUpAndLogin(overrides: Partial<ReturnType<typeof uniqueUser>> = {}) {
  const u = { ...uniqueUser(), ...overrides };
  const s = makeSession();
  await s.post('/api/v1/auth/signup', { ...u, consent: true });
  const code = lastOtp(u.email);
  const res = await s.post('/api/v1/auth/otp/verify', { identifier: u.email, code });
  if (res.status !== 200)
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { session: s, user: u, id: res.body.data.user.id as string };
}

export const otpFor = lastOtp;

export async function createAdmin(password = 'a-very-long-admin-pass-1') {
  const email = `admin${++seq}@example.com`;
  const admin = await User.create({
    name: 'Admin',
    email,
    phone: `+9199000${String(10000 + seq)}`,
    role: 'admin',
    passwordHash: await hashPassword(password),
    emailVerified: true,
  });
  return { email, password, id: String(admin._id) };
}

export async function loginAdmin() {
  const a = await createAdmin();
  const s = makeSession();
  const res = await s.post('/api/v1/auth/admin/login', { email: a.email, password: a.password });
  if (res.status !== 200) throw new Error(`admin login failed ${res.status}`);
  return { session: s, ...a };
}

let pseq = 0;
export async function makeProperty(overrides: Record<string, unknown> = {}) {
  const { Property } = await import('../src/models/property.js');
  const { makeSlug } = await import('../src/modules/properties/service.js');
  pseq += 1;
  const title = (overrides.title as string) ?? `Test Flat ${pseq}`;
  const doc = await Property.create({
    title,
    slug: makeSlug(title),
    type: 'apartment',
    purpose: 'buy',
    price: 5_000_000 + pseq,
    bhk: 2,
    address: { city: 'Lucknow', locality: 'Gomti Nagar' },
    ...overrides,
  });
  return doc;
}
