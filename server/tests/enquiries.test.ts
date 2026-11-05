import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, makeProperty, useTestDb } from './helpers.js';
import { Enquiry } from '../src/models/enquiry.js';
import { outbox } from '../src/providers/mailer.js';

useTestDb();
const E = '/api/v1/enquiries';
const valid = {
  name: 'Asha Verma',
  email: 'Asha@Example.com',
  phone: '98765 43210',
  message: 'Is this still available?',
};

describe('enquiries', () => {
  it('stores a normalized enquiry and notifies the dealer', async () => {
    const p = await makeProperty({ title: 'Lake flat' });
    const res = await request(app)
      .post(E)
      .send({ ...valid, propertyId: String(p._id) });
    expect(res.status).toBe(201);
    const doc = await Enquiry.findOne();
    expect(doc).toMatchObject({ email: 'asha@example.com', phone: '+919876543210', status: 'new' });
    expect(String(doc?.property)).toBe(String(p._id));
    expect(outbox.some((m) => m.to === 'dealer@example.com' && m.text.includes('Lake flat'))).toBe(
      true,
    );
  });

  it('validates input and rejects unknown fields', async () => {
    const bad = [
      { ...valid, email: 'nope' },
      { ...valid, phone: 'abc' },
      { ...valid, message: 'hi' },
      { ...valid, message: 'x'.repeat(2001) },
      { ...valid, status: 'closed' },
      { ...valid, propertyId: 'zzz' },
      { ...valid, name: { $gt: '' } },
    ];
    for (const b of bad) expect((await request(app).post(E).send(b)).status).toBe(400);
    expect(await Enquiry.countDocuments()).toBe(0);
  });

  it('ignores honeypot submissions but answers like success', async () => {
    const res = await request(app)
      .post(E)
      .send({ ...valid, website: 'http://spam' });
    expect(res.status).toBe(201);
    expect(await Enquiry.countDocuments()).toBe(0);
  });

  it('drops a link to a hidden or unknown listing instead of failing', async () => {
    const hidden = await makeProperty({ status: 'hidden' });
    const res = await request(app)
      .post(E)
      .send({ ...valid, propertyId: String(hidden._id) });
    expect(res.status).toBe(201);
    expect((await Enquiry.findOne())?.property).toBeUndefined();
  });

  it('is rate limited', async () => {
    let last = 0;
    for (let i = 0; i < 7; i++) {
      last = (await request(app).post(E).set('x-test-rate-limit', '1').send(valid)).status;
    }
    expect(last).toBe(429);
  });
});
