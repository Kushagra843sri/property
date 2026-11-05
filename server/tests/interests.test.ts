import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, makeProperty, signUpAndLogin, useTestDb } from './helpers.js';
import { Interest } from '../src/models/interest.js';
import { User } from '../src/models/user.js';
import { outbox, setMailer, getMailer } from '../src/providers/mailer.js';

useTestDb();
const url = (id: unknown) => `/api/v1/properties/${id}/interest`;

describe('interests', () => {
  it('requires authentication', async () => {
    const p = await makeProperty();
    expect((await request(app).post(url(p._id))).status).toBe(401);
    expect((await request(app).delete(url(p._id))).status).toBe(401);
  });

  it('creates an interest and notifies the dealer with user details and the listing link', async () => {
    const dealer = 'dealer@example.com';
    const { session, user } = await signUpAndLogin();
    const p = await makeProperty({ title: 'Garden Villa' });
    outbox.length = 0;
    const res = await session.post(url(p._id));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ interested: true });
    expect(await Interest.countDocuments()).toBe(1);
    const mail = outbox.find((m) => m.to === dealer)!;
    expect(mail.subject).toContain('Garden Villa');
    expect(mail.text).toContain(user.email);
    expect(mail.text).toContain(user.phone);
    expect(mail.text).toContain(`/listings/${p.slug}`);
    expect((await Interest.findOne())?.notified).toBe(true);
  });

  it('is idempotent: repeats do not duplicate or re-notify, even when concurrent', async () => {
    const { session } = await signUpAndLogin();
    const p = await makeProperty();
    outbox.length = 0;
    const results = await Promise.all([1, 2, 3, 4].map(() => session.post(url(p._id))));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(await Interest.countDocuments()).toBe(1);
    expect(outbox.filter((m) => m.to === 'dealer@example.com')).toHaveLength(1);
  });

  it('still records the interest when the dealer email fails', async () => {
    const { session } = await signUpAndLogin();
    const p = await makeProperty();
    const original = getMailer();
    setMailer({ send: async () => Promise.reject(new Error('provider down')) });
    try {
      const res = await session.post(url(p._id));
      expect(res.status).toBe(200);
      expect((await Interest.findOne())?.notified).toBe(false);
    } finally {
      setMailer(original);
    }
  });

  it('removes an interest', async () => {
    const { session } = await signUpAndLogin();
    const p = await makeProperty();
    await session.post(url(p._id));
    const res = await session.del(url(p._id));
    expect(res.body.data).toEqual({ interested: false });
    expect(await Interest.countDocuments()).toBe(0);
    expect((await session.del(url(p._id))).status).toBe(200); // idempotent
  });

  it('404s for unknown or hidden listings and rejects malformed ids', async () => {
    const { session } = await signUpAndLogin();
    const hidden = await makeProperty({ status: 'hidden' });
    expect((await session.post(url(hidden._id))).status).toBe(404);
    expect((await session.post(url('64b7f0f0f0f0f0f0f0f0f0f0'))).status).toBe(404);
    expect((await session.post(url('not-an-id'))).status).toBe(400);
  });

  it('409s for sold listings', async () => {
    const { session } = await signUpAndLogin();
    const p = await makeProperty({ status: 'sold' });
    expect((await session.post(url(p._id))).status).toBe(409);
  });

  it('blocks users who withdrew consent', async () => {
    const { session } = await signUpAndLogin();
    const p = await makeProperty();
    await session.patch('/api/v1/me', { consent: false });
    const res = await session.post(url(p._id));
    expect(res.status).toBe(403);
    expect(await Interest.countDocuments()).toBe(0);
  });

  it('requires the CSRF token', async () => {
    const { session } = await signUpAndLogin();
    const p = await makeProperty();
    expect((await session.agent.post(url(p._id))).status).toBe(403);
  });
});

describe('me', () => {
  it("lists only the caller's own interests, newest first, paginated", async () => {
    const a = await signUpAndLogin();
    const b = await signUpAndLogin();
    const p1 = await makeProperty({ title: 'One' });
    const p2 = await makeProperty({ title: 'Two' });
    const hidden = await makeProperty({ title: 'Gone' });
    await a.session.post(url(p1._id));
    await a.session.post(url(p2._id));
    await a.session.post(url(hidden._id));
    await b.session.post(url(p1._id));
    const { Property } = await import('../src/models/property.js');
    await Property.updateOne({ _id: hidden._id }, { status: 'hidden' });

    const res = await a.session.get('/api/v1/me/interests');
    expect(res.status).toBe(200);
    expect(res.body.data.map((i: { property: { title: string } }) => i.property.title)).toEqual([
      'Two',
      'One',
    ]);
    const page = await a.session.get('/api/v1/me/interests?limit=1&page=2');
    expect(page.body.data).toHaveLength(1);
    expect((await request(app).get('/api/v1/me/interests')).status).toBe(401);
  });

  it('updates the name, withdraws and restores consent', async () => {
    const { session, id } = await signUpAndLogin();
    const r1 = await session.patch('/api/v1/me', { name: 'New Name' });
    expect(r1.body.data.user.name).toBe('New Name');
    const r2 = await session.patch('/api/v1/me', { consent: false });
    expect(r2.body.data.user).toMatchObject({ status: 'withdrawn', consentGiven: false });
    const r3 = await session.patch('/api/v1/me', { consent: true });
    expect(r3.body.data.user).toMatchObject({ status: 'active', consentGiven: true });
    expect((await User.findById(id))?.consent?.version).toBeTruthy();
  });

  it('rejects privilege escalation and empty/unknown updates', async () => {
    const { session, id } = await signUpAndLogin();
    expect((await session.patch('/api/v1/me', { role: 'admin' })).status).toBe(400);
    expect((await session.patch('/api/v1/me', {})).status).toBe(400);
    expect((await session.patch('/api/v1/me', { email: 'x@y.co' })).status).toBe(400);
    expect((await User.findById(id))?.role).toBe('user');
  });

  it('deletes the account, its interests and sessions', async () => {
    const { session, id } = await signUpAndLogin();
    const p = await makeProperty();
    await session.post(url(p._id));
    const res = await session.del('/api/v1/me');
    expect(res.status).toBe(200);
    expect(await User.findById(id)).toBeNull();
    expect(await Interest.countDocuments()).toBe(0);
    expect((await session.get('/api/v1/auth/me')).status).toBe(401);
  });
});
