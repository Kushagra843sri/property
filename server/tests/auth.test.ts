import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  app,
  createAdmin,
  loginAdmin,
  makeSession,
  otpFor,
  signUpAndLogin,
  uniqueUser,
  useTestDb,
} from './helpers.js';
import { User } from '../src/models/user.js';
import { Otp } from '../src/models/otp.js';
import { RefreshToken } from '../src/models/refreshToken.js';
import { env } from '../src/config/env.js';
import { setGoogleVerifier, type GoogleIdentity } from '../src/providers/google.js';
import { outbox } from '../src/providers/mailer.js';
import { hashOtp } from '../src/utils/otp.js';
import { OTP_MAX_ATTEMPTS } from '../src/config/constants.js';

useTestDb();
const A = '/api/v1/auth';

describe('signup', () => {
  it('creates a user with recorded consent and sends an OTP', async () => {
    const u = uniqueUser();
    const res = await request(app)
      .post(`${A}/signup`)
      .send({ ...u, consent: true });
    expect(res.status).toBe(202);
    const doc = await User.findOne({ email: u.email });
    expect(doc?.consent?.given).toBe(true);
    expect(doc?.consent?.version).toBeTruthy();
    expect(doc?.consent?.at).toBeInstanceOf(Date);
    expect(doc?.emailVerified).toBe(false);
    expect(otpFor(u.email)).toMatch(/^\d{6}$/);
  });

  it('requires explicit consent', async () => {
    const u = uniqueUser();
    for (const consent of [false, undefined, 'true', 1]) {
      const res = await request(app)
        .post(`${A}/signup`)
        .send({ ...u, consent });
      expect(res.status).toBe(400);
    }
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects invalid input and unknown fields', async () => {
    const u = uniqueUser();
    const bad = [
      { ...u, email: 'nope' },
      { ...u, phone: '12' },
      { ...u, name: 'x' },
      { ...u, role: 'admin' },
      { ...u, email: { $ne: '' } },
    ];
    for (const b of bad) {
      const res = await request(app)
        .post(`${A}/signup`)
        .send({ ...b, consent: true });
      expect(res.status).toBe(400);
    }
    expect(await User.countDocuments()).toBe(0);
  });

  it('normalizes email and phone before storing', async () => {
    await request(app)
      .post(`${A}/signup`)
      .send({ name: 'Norm Al', email: '  Norm@Example.COM ', phone: '98765 43210', consent: true });
    const doc = await User.findOne({ email: 'norm@example.com' });
    expect(doc?.phone).toBe('+919876543210');
  });

  it('does not reveal whether an account already exists', async () => {
    const u = uniqueUser();
    const first = await request(app)
      .post(`${A}/signup`)
      .send({ ...u, consent: true });
    outbox.length = 0;
    await Otp.deleteMany({});
    const again = await request(app)
      .post(`${A}/signup`)
      .send({ ...u, consent: true });
    const clash = await request(app)
      .post(`${A}/signup`)
      .send({ ...u, phone: '+919000000001', consent: true });
    expect(again.status).toBe(first.status);
    expect(clash.status).toBe(first.status);
    expect(clash.body).toEqual(first.body);
    expect(await User.countDocuments()).toBe(1);
    expect(otpFor(u.email)).toBeTruthy(); // exact match gets a fresh code
  });

  it('silently ignores honeypot submissions', async () => {
    const u = uniqueUser();
    const res = await request(app)
      .post(`${A}/signup`)
      .send({ ...u, consent: true, website: 'http://spam' });
    expect(res.status).toBe(202);
    expect(await User.countDocuments()).toBe(0);
  });
});

describe('otp', () => {
  it('logs in with a valid code, sets httpOnly cookies and marks email verified', async () => {
    const u = uniqueUser();
    const s = makeSession();
    await s.post(`${A}/signup`, { ...u, consent: true });
    const res = await s.post(`${A}/otp/verify`, { identifier: u.email, code: otpFor(u.email) });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ email: u.email, role: 'user', emailVerified: true });
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const access = cookies.find((c) => c.startsWith('access_token='))!;
    const refresh = cookies.find((c) => c.startsWith('refresh_token='))!;
    expect(access).toMatch(/HttpOnly/i);
    expect(access).toMatch(/SameSite=Lax/i);
    expect(refresh).toMatch(/HttpOnly/i);
    expect(refresh).toMatch(/Path=\/api\/v1\/auth/);
    expect(cookies.find((c) => c.startsWith('csrf_token='))).not.toMatch(/HttpOnly/i);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
    expect((await s.get(`${A}/me`)).body.data.user.email).toBe(u.email);
  });

  it('stores only a hash of the code', async () => {
    const u = uniqueUser();
    await request(app)
      .post(`${A}/signup`)
      .send({ ...u, consent: true });
    const code = otpFor(u.email)!;
    const rec = await Otp.findOne({ identifier: u.email });
    expect(rec?.codeHash).not.toContain(code);
    expect(rec?.codeHash).toBe(hashOtp(u.email, code));
  });

  it('only supports email: a phone number is not a valid identifier any more', async () => {
    const u = uniqueUser();
    await request(app)
      .post(`${A}/signup`)
      .send({ ...u, consent: true });
    const res = await request(app)
      .post(`${A}/otp/verify`)
      .send({ identifier: u.phone, code: '123456' });
    expect(res.status).toBe(400);
    const channel = await request(app)
      .post(`${A}/signup`)
      .send({ ...uniqueUser(), consent: true, channel: 'phone' });
    expect(channel.status).toBe(400); // unknown field
  });

  it('rejects a wrong code and a replayed code with one generic message', async () => {
    const u = uniqueUser();
    await request(app)
      .post(`${A}/signup`)
      .send({ ...u, consent: true });
    const code = otpFor(u.email)!;
    const wrong = code === '000000' ? '111111' : '000000';
    const r1 = await request(app)
      .post(`${A}/otp/verify`)
      .send({ identifier: u.email, code: wrong });
    expect(r1.status).toBe(400);
    const ok = await request(app).post(`${A}/otp/verify`).send({ identifier: u.email, code });
    expect(ok.status).toBe(200);
    const replay = await request(app).post(`${A}/otp/verify`).send({ identifier: u.email, code });
    expect(replay.status).toBe(400);
    expect(replay.body.error.message).toBe(r1.body.error.message);
  });

  it('rejects an expired code', async () => {
    const u = uniqueUser();
    await request(app)
      .post(`${A}/signup`)
      .send({ ...u, consent: true });
    const code = otpFor(u.email)!;
    await Otp.updateOne({ identifier: u.email }, { expiresAt: new Date(Date.now() - 1000) });
    const res = await request(app).post(`${A}/otp/verify`).send({ identifier: u.email, code });
    expect(res.status).toBe(400);
  });

  it('locks the code after too many wrong attempts, even if the right one follows', async () => {
    const u = uniqueUser();
    await request(app)
      .post(`${A}/signup`)
      .send({ ...u, consent: true });
    const code = otpFor(u.email)!;
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
      const r = await request(app)
        .post(`${A}/otp/verify`)
        .send({ identifier: u.email, code: wrong });
      expect(r.status).toBe(400);
    }
    const res = await request(app).post(`${A}/otp/verify`).send({ identifier: u.email, code });
    expect(res.status).toBe(400);
  });

  it('requests a login code for known users and responds identically for unknown ones', async () => {
    const { user } = await signUpAndLogin();
    await Otp.deleteMany({});
    outbox.length = 0;
    const known = await request(app).post(`${A}/otp/request`).send({ identifier: user.email });
    const unknown = await request(app)
      .post(`${A}/otp/request`)
      .send({ identifier: 'ghost@example.com' });
    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(known.body).toEqual(unknown.body);
    expect(otpFor(user.email)).toBeTruthy();
    expect(otpFor('ghost@example.com')).toBeUndefined();
  });

  it('enforces a resend cooldown', async () => {
    const { user } = await signUpAndLogin();
    await Otp.deleteMany({});
    outbox.length = 0;
    await request(app).post(`${A}/otp/request`).send({ identifier: user.email });
    await request(app).post(`${A}/otp/request`).send({ identifier: user.email });
    expect(outbox.filter((m) => m.to === user.email)).toHaveLength(1);
  });

  it('does not issue OTPs to admin accounts', async () => {
    const admin = await createAdmin();
    outbox.length = 0;
    await request(app).post(`${A}/otp/request`).send({ identifier: admin.email });
    expect(outbox).toHaveLength(0);
  });

  it('rate limits OTP endpoints per IP', async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) {
      const r = await request(app)
        .post(`${A}/otp/verify`)
        .set('x-test-rate-limit', '1')
        .send({ identifier: 'a@b.co', code: '123456' });
      last = r.status;
    }
    expect(last).toBe(429);
  });
});

const STRONG = 'correct horse battery 42';

/** Signs up and verifies the emailed code in one go, optionally setting a password. */
async function signUpWithPassword(password: string | undefined = STRONG) {
  const u = uniqueUser();
  await request(app)
    .post(`${A}/signup`)
    .send({ ...u, consent: true });
  const s = makeSession();
  const res = await s.post(`${A}/otp/verify`, {
    identifier: u.email,
    code: otpFor(u.email),
    ...(password ? { password } : {}),
  });
  return { u, res, s };
}

describe('password sign-in', () => {
  it('stores the password only once the emailed code is verified, then logs in with it', async () => {
    const { u, res } = await signUpWithPassword();
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);
    const hash = (await User.findOne({ email: u.email }).select('+passwordHash'))?.passwordHash;
    expect(hash).toMatch(/^\$argon2id\$/);

    const s = makeSession();
    const login = await s.post(`${A}/login`, { email: u.email, password: STRONG });
    expect(login.status).toBe(200);
    expect(login.body.data.user).toMatchObject({
      email: u.email,
      role: 'user',
      emailVerified: true,
    });
    expect((await s.get(`${A}/me`)).status).toBe(200);
  });

  it('cannot be pre-claimed: signing up with someone else’s email sets no password', async () => {
    const victim = uniqueUser();
    await request(app)
      .post(`${A}/signup`)
      .send({ ...victim, consent: true });
    // The attacker never sees the code, so no password can be stored and no login works.
    const doc = await User.findOne({ email: victim.email }).select('+passwordHash');
    expect(doc?.passwordHash).toBeUndefined();
    const r = await request(app)
      .post(`${A}/login`)
      .send({ email: victim.email, password: 'attacker chosen pass 1' });
    expect(r.status).toBe(401);
  });

  it('does not set the password when the code is wrong', async () => {
    const u = uniqueUser();
    await request(app)
      .post(`${A}/signup`)
      .send({ ...u, consent: true });
    const code = otpFor(u.email)!;
    const wrong = code === '000000' ? '111111' : '000000';
    const r = await request(app)
      .post(`${A}/otp/verify`)
      .send({ identifier: u.email, code: wrong, password: STRONG });
    expect(r.status).toBe(400);
    expect(
      (await User.findOne({ email: u.email }).select('+passwordHash'))?.passwordHash,
    ).toBeUndefined();
  });

  it('rejects a weak password without spending the code', async () => {
    const u = uniqueUser();
    await request(app)
      .post(`${A}/signup`)
      .send({ ...u, consent: true });
    const code = otpFor(u.email)!;
    for (const password of ['short', 'password123', u.email.split('@')[0]! + '12345']) {
      const r = await request(app)
        .post(`${A}/otp/verify`)
        .send({ identifier: u.email, code, password });
      expect(r.status).toBe(400);
    }
    const ok = await request(app)
      .post(`${A}/otp/verify`)
      .send({ identifier: u.email, code, password: STRONG });
    expect(ok.status).toBe(200); // the same code still works
  });

  it('gives one generic failure for wrong password, unknown email, passwordless and admin accounts', async () => {
    const { u } = await signUpWithPassword();
    const passwordless = await signUpAndLogin(); // verified by code only, no password
    const admin = await createAdmin();
    const attempts = [
      { email: u.email, password: 'wrong password 123' },
      { email: 'nobody@example.com', password: STRONG },
      { email: passwordless.user.email, password: STRONG },
      { email: admin.email, password: admin.password },
    ];
    const messages = new Set<string>();
    for (const a of attempts) {
      const r = await request(app).post(`${A}/login`).send(a);
      expect(r.status).toBe(401);
      messages.add(r.body.error.message);
    }
    expect(messages.size).toBe(1);
  });

  it('lets a user reset a forgotten password with an emailed code', async () => {
    const { u } = await signUpWithPassword();
    outbox.length = 0;
    await Otp.deleteMany({});
    await request(app).post(`${A}/otp/request`).send({ identifier: u.email });
    const reset = await request(app)
      .post(`${A}/otp/verify`)
      .send({ identifier: u.email, code: otpFor(u.email), password: 'brand new passphrase 9' });
    expect(reset.status).toBe(200);
    const old = await request(app).post(`${A}/login`).send({ email: u.email, password: STRONG });
    expect(old.status).toBe(401);
    const fresh = await request(app)
      .post(`${A}/login`)
      .send({ email: u.email, password: 'brand new passphrase 9' });
    expect(fresh.status).toBe(200);
  });

  it('rate limits password login and validates the body', async () => {
    expect(
      (await request(app).post(`${A}/login`).send({ email: 'nope', password: 'x' })).status,
    ).toBe(400);
    expect((await request(app).post(`${A}/login`).send({ email: 'a@b.co' })).status).toBe(400);
    let last = 0;
    for (let i = 0; i < 12; i++) {
      const r = await request(app)
        .post(`${A}/login`)
        .set('x-test-rate-limit', '1')
        .send({ email: 'a@b.co', password: 'x' });
      last = r.status;
    }
    expect(last).toBe(429);
  });
});

const googleUser = (over: Partial<GoogleIdentity> = {}): GoogleIdentity => ({
  sub: 'sub-1',
  email: 'gina@example.com',
  emailVerified: true,
  name: 'Gina Google',
  ...over,
});
const fakeGoogle = (id: GoogleIdentity | null) => setGoogleVerifier(async () => id);
const CRED = 'x'.repeat(40);

describe('google sign-in', () => {
  it('creates a verified account (no phone) when the user consents, and starts a session', async () => {
    fakeGoogle(googleUser());
    const s = makeSession();
    const res = await s.post(`${A}/google`, { credential: CRED, consent: true });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({
      email: 'gina@example.com',
      name: 'Gina Google',
      role: 'user',
      emailVerified: true,
      phone: null,
    });
    const doc = await User.findOne({ email: 'gina@example.com' }).select('+googleSub');
    expect(doc?.googleSub).toBe('sub-1');
    expect(doc?.consent?.given).toBe(true);
    expect((await s.get(`${A}/me`)).status).toBe(200);
  });

  it('refuses to create an account without explicit consent', async () => {
    fakeGoogle(googleUser());
    for (const consent of [undefined, false]) {
      const res = await request(app)
        .post(`${A}/google`)
        .send({ credential: CRED, ...(consent === undefined ? {} : { consent }) });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('consent_required');
    }
    expect(await User.countDocuments()).toBe(0);
  });

  it('signs an existing user in (matched by email) and marks the email verified', async () => {
    const u = uniqueUser();
    await request(app)
      .post(`${A}/signup`)
      .send({ ...u, consent: true }); // unverified so far
    fakeGoogle(googleUser({ email: u.email, sub: 'sub-existing' }));
    const res = await request(app).post(`${A}/google`).send({ credential: CRED });
    expect(res.status).toBe(200);
    expect(await User.countDocuments()).toBe(1);
    const doc = await User.findOne({ email: u.email }).select('+googleSub');
    expect(doc).toMatchObject({ emailVerified: true, googleSub: 'sub-existing', phone: u.phone });
  });

  it('never links to or signs in an admin account', async () => {
    const admin = await createAdmin();
    fakeGoogle(googleUser({ email: admin.email, sub: 'sub-admin' }));
    const res = await request(app).post(`${A}/google`).send({ credential: CRED, consent: true });
    expect(res.status).toBe(401);
    expect(
      (await User.findOne({ email: admin.email }).select('+googleSub'))?.googleSub,
    ).toBeUndefined();
  });

  it('refuses an invalid token, an unverified Google email, and a different Google account for the same email', async () => {
    fakeGoogle(null);
    expect(
      (await request(app).post(`${A}/google`).send({ credential: CRED, consent: true })).status,
    ).toBe(401);
    fakeGoogle(googleUser({ emailVerified: false }));
    expect(
      (await request(app).post(`${A}/google`).send({ credential: CRED, consent: true })).status,
    ).toBe(401);
    expect(await User.countDocuments()).toBe(0);

    fakeGoogle(googleUser());
    await request(app).post(`${A}/google`).send({ credential: CRED, consent: true });
    fakeGoogle(googleUser({ sub: 'someone-else' }));
    expect(
      (await request(app).post(`${A}/google`).send({ credential: CRED, consent: true })).status,
    ).toBe(401);
  });

  it('allows many Google users who have no phone number', async () => {
    for (const n of [1, 2, 3]) {
      fakeGoogle(googleUser({ sub: `s${n}`, email: `g${n}@example.com` }));
      const r = await request(app).post(`${A}/google`).send({ credential: CRED, consent: true });
      expect(r.status).toBe(200);
    }
    expect(await User.countDocuments()).toBe(3);
  });

  it('is cleanly unavailable when no client ID is configured, and validates the body', async () => {
    expect((await request(app).post(`${A}/google`).send({ credential: 'short' })).status).toBe(400);
    const saved = env.GOOGLE_CLIENT_ID;
    env.GOOGLE_CLIENT_ID = undefined;
    try {
      const r = await request(app).post(`${A}/google`).send({ credential: CRED, consent: true });
      expect(r.status).toBe(503);
    } finally {
      env.GOOGLE_CLIENT_ID = saved;
    }
  });
});

describe('own phone number', () => {
  it('adds a normalized phone to a Google account, and refuses duplicates and bad numbers', async () => {
    fakeGoogle(googleUser());
    const s = makeSession();
    await s.post(`${A}/google`, { credential: CRED, consent: true });
    const ok = await s.patch('/api/v1/me', { phone: '98765 43210' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.user.phone).toBe('+919876543210');

    expect((await s.patch('/api/v1/me', { phone: '12' })).status).toBe(400);

    fakeGoogle(googleUser({ sub: 'sub-2', email: 'second@example.com' }));
    const s2 = makeSession();
    await s2.post(`${A}/google`, { credential: CRED, consent: true });
    const dup = await s2.patch('/api/v1/me', { phone: '+919876543210' });
    expect(dup.status).toBe(409);
    expect(JSON.stringify(dup.body)).not.toMatch(/gina/i); // says nothing about the other owner
  });
});

describe('sessions', () => {
  it('refresh rotates the token and keeps the session alive', async () => {
    const { session } = await signUpAndLogin();
    expect(await RefreshToken.countDocuments()).toBe(1);
    const res = await session.post(`${A}/refresh`);
    expect(res.status).toBe(200);
    const all = await RefreshToken.find().sort({ createdAt: 1 });
    expect(all).toHaveLength(2);
    expect(all[0]!.revokedAt).toBeTruthy();
    expect(all[1]!.revokedAt).toBeUndefined();
    expect((await session.get(`${A}/me`)).status).toBe(200);
  });

  it('rejects refresh without or with a bogus token', async () => {
    const none = await request(app).post(`${A}/refresh`);
    expect(none.status).toBe(401);
    const bogus = await request(app)
      .post(`${A}/refresh`)
      .set('Cookie', ['refresh_token=nope', 'csrf_token=c'])
      .set('X-CSRF-Token', 'c');
    expect(bogus.status).toBe(401);
  });

  it('replaying a rotated refresh token revokes the whole family', async () => {
    const u = uniqueUser();
    const raw = request.agent(app);
    await raw.post(`${A}/signup`).send({ ...u, consent: true });
    const login = await raw
      .post(`${A}/otp/verify`)
      .send({ identifier: u.email, code: otpFor(u.email) });
    const cookie = (res: request.Response, name: string) =>
      ([] as string[])
        .concat(res.headers['set-cookie'] ?? [])
        .find((c) => c.startsWith(name + '='))!
        .split(';')[0]!;
    const oldRefresh = cookie(login, 'refresh_token');
    const csrf1 = cookie(login, 'csrf_token').split('=')[1]!;

    const rotated = await raw.post(`${A}/refresh`).set('X-CSRF-Token', csrf1);
    expect(rotated.status).toBe(200);
    const csrf2 = cookie(rotated, 'csrf_token').split('=')[1]!;

    const replay = await request(app)
      .post(`${A}/refresh`)
      .set('Cookie', [oldRefresh, 'csrf_token=' + csrf1])
      .set('X-CSRF-Token', csrf1);
    expect(replay.status).toBe(401);

    // The legitimate, rotated token belongs to the same family and is now dead too.
    const after = await raw.post(`${A}/refresh`).set('X-CSRF-Token', csrf2);
    expect(after.status).toBe(401);
  });

  it('logout revokes the refresh token server-side', async () => {
    const { session } = await signUpAndLogin();
    const out = await session.post(`${A}/logout`);
    expect(out.status).toBe(200);
    expect(await RefreshToken.countDocuments({ revokedAt: { $exists: false } })).toBe(0);
    expect((await session.get(`${A}/me`)).status).toBe(401);
  });

  it('requires a CSRF token for state-changing requests with a session', async () => {
    const { session } = await signUpAndLogin();
    const noHeader = await session.agent.post(`${A}/logout`);
    expect(noHeader.status).toBe(403);
    const wrong = await session.agent.post(`${A}/logout`).set('X-CSRF-Token', 'wrong');
    expect(wrong.status).toBe(403);
    const ok = await session.post(`${A}/logout`);
    expect(ok.status).toBe(200);
  });

  it('rejects tampered or missing access tokens', async () => {
    expect((await request(app).get(`${A}/me`)).status).toBe(401);
    const bad = await request(app).get(`${A}/me`).set('Cookie', 'access_token=abc.def.ghi');
    expect(bad.status).toBe(401);
  });
});

describe('admin login', () => {
  it('logs in an admin with the right password and sets admin role', async () => {
    const { session } = await loginAdmin();
    const me = await session.get(`${A}/me`);
    expect(me.body.data.user.role).toBe('admin');
  });

  it('gives one generic failure for wrong password, unknown email and non-admin users', async () => {
    const admin = await createAdmin();
    const { user } = await signUpAndLogin();
    const attempts = [
      { email: admin.email, password: 'wrong-password-123' },
      { email: 'nobody@example.com', password: 'wrong-password-123' },
      { email: user.email, password: 'wrong-password-123' },
    ];
    const bodies = [];
    for (const a of attempts) {
      const r = await request(app).post(`${A}/admin/login`).send(a);
      expect(r.status).toBe(401);
      bodies.push(r.body.error.message);
    }
    expect(new Set(bodies).size).toBe(1);
  });

  it('rate limits admin login', async () => {
    let last = 0;
    for (let i = 0; i < 10; i++) {
      const r = await request(app)
        .post(`${A}/admin/login`)
        .set('x-test-rate-limit', '1')
        .send({ email: 'a@b.co', password: 'x' });
      last = r.status;
    }
    expect(last).toBe(429);
  });
});
