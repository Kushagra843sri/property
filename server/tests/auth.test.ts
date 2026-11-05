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

  it('works over the phone channel', async () => {
    const { smsOutbox } = await import('../src/providers/sms.js');
    const u = uniqueUser();
    await request(app)
      .post(`${A}/signup`)
      .send({ ...u, consent: true, channel: 'phone' });
    const code = smsOutbox.at(-1)!.body.match(/(\d{6})/)![1];
    const res = await request(app).post(`${A}/otp/verify`).send({ identifier: u.phone, code });
    expect(res.status).toBe(200);
    expect(res.body.data.user.phoneVerified).toBe(true);
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
