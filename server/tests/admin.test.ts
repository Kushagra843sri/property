import { describe, expect, it } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';
import { app, loginAdmin, makeProperty, signUpAndLogin, useTestDb } from './helpers.js';
import { AuditLog } from '../src/models/auditLog.js';
import { Enquiry } from '../src/models/enquiry.js';
import { Interest } from '../src/models/interest.js';
import { Property } from '../src/models/property.js';
import { User } from '../src/models/user.js';
import { setImageStore, getImageStore } from '../src/providers/imageStore.js';
import { MAX_IMAGES_PER_PROPERTY } from '../src/config/constants.js';

useTestDb();
const AD = '/api/v1/admin';
const newProp = {
  title: 'Sunrise Heights 3BHK',
  type: 'flat',
  purpose: 'buy',
  price: 7500000,
  bhk: 3,
  address: { city: 'Lucknow', locality: 'Gomti Nagar' },
};

describe('admin authorization', () => {
  const routes: [string, string][] = [
    ['get', '/properties'],
    ['post', '/properties'],
    ['get', '/users'],
    ['get', '/interests'],
    ['get', '/enquiries'],
    ['get', '/export/leads.csv'],
    ['get', '/stats'],
  ];

  it('rejects anonymous callers with 401', async () => {
    for (const [m, path] of routes) {
      const res = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[
        m
      ]!(AD + path);
      expect(res.status, `${m} ${path}`).toBe(401);
    }
  });

  it('rejects normal users with 403', async () => {
    const { session } = await signUpAndLogin();
    for (const [m, path] of routes) {
      const res =
        m === 'get' ? await session.get(AD + path) : await session.post(AD + path, newProp);
      expect(res.status, `${m} ${path}`).toBe(403);
    }
  });

  it("revokes admin access when the user's role is demoted in the database", async () => {
    const { session, id } = await loginAdmin();
    expect((await session.get(`${AD}/stats`)).status).toBe(200);
    await User.updateOne({ _id: id }, { role: 'user' });
    expect((await session.get(`${AD}/stats`)).status).toBe(403);
  });
});

describe('admin properties', () => {
  it('creates, reads, updates and deletes a listing with audit logging', async () => {
    const { session, id: adminId } = await loginAdmin();
    const created = await session.post(`${AD}/properties`, newProp);
    expect(created.status).toBe(201);
    const pid = created.body.data.id as string;
    expect(created.body.data.slug).toMatch(/^sunrise-heights-3bhk-[0-9a-f]{6}$/);
    expect(created.body.data.status).toBe('available');

    const patched = await session.patch(`${AD}/properties/${pid}`, {
      status: 'sold',
      featured: true,
      price: 8000000,
    });
    expect(patched.body.data).toMatchObject({ status: 'sold', featured: true, price: 8000000 });
    expect((await session.get(`${AD}/properties/${pid}`)).body.data.title).toBe(newProp.title);

    const hidden = await session.patch(`${AD}/properties/${pid}`, { status: 'hidden' });
    expect(hidden.status).toBe(200);
    const pub = await request(app).get(`/api/v1/properties/${created.body.data.slug}`);
    expect(pub.status).toBe(404);

    expect((await session.del(`${AD}/properties/${pid}`)).status).toBe(200);
    expect(await Property.countDocuments()).toBe(0);
    const actions = (await AuditLog.find().sort({ createdAt: 1 })).map((a) => a.action);
    expect(actions).toEqual([
      'property.create',
      'property.update',
      'property.update',
      'property.delete',
    ]);
    expect(String((await AuditLog.findOne())?.admin)).toBe(adminId);
  });

  it('requires BHK for flats and rejects it for every other type', async () => {
    const { session } = await loginAdmin();
    const { bhk: _bhk, ...noBhk } = newProp;
    void _bhk;
    expect((await session.post(`${AD}/properties`, noBhk)).status).toBe(400);
    for (const type of ['shop', 'office', 'pg', 'room']) {
      expect((await session.post(`${AD}/properties`, { ...newProp, type })).status, type).toBe(400);
      const ok = await session.post(`${AD}/properties`, { ...noBhk, type, title: `A ${type}` });
      expect(ok.status, type).toBe(201);
      expect(ok.body.data.bhk).toBeUndefined();
    }
    // Updates are checked against the resulting state.
    const flat = await session.post(`${AD}/properties`, newProp);
    const id = flat.body.data.id as string;
    expect((await session.patch(`${AD}/properties/${id}`, { bhk: 2 })).body.data.bhk).toBe(2);
    const toShop = await session.patch(`${AD}/properties/${id}`, { type: 'shop' });
    expect(toShop.status).toBe(200);
    expect(toShop.body.data.bhk).toBeUndefined(); // dropped with the type change
    expect((await session.patch(`${AD}/properties/${id}`, { bhk: 3 })).status).toBe(400);
    expect((await session.patch(`${AD}/properties/${id}`, { type: 'flat' })).status).toBe(400);
    expect((await session.patch(`${AD}/properties/${id}`, { type: 'flat', bhk: 1 })).status).toBe(
      200,
    );
  });

  it('accepts only Bunny player links as the video and lets the admin remove it', async () => {
    const { session } = await loginAdmin();
    const good =
      'https://iframe.mediadelivery.net/embed/123456/0a1b2c3d-1111-2222-3333-444455556666';
    const bad = [
      'http://iframe.mediadelivery.net/embed/1/x',
      'https://evil.example/embed/1/y',
      'javascript:alert(1)',
    ];
    for (const videoUrl of bad)
      expect((await session.post(`${AD}/properties`, { ...newProp, videoUrl })).status).toBe(400);
    const created = await session.post(`${AD}/properties`, { ...newProp, videoUrl: good });
    expect(created.status).toBe(201);
    const pub = await request(app).get(`/api/v1/properties/${created.body.data.slug}`);
    expect(pub.body.data.videoUrl).toBe(good);
    const player =
      'https://player.mediadelivery.net/play/123456/0a1b2c3d-1111-2222-3333-444455556666';
    expect((await session.post(`${AD}/properties`, { ...newProp, videoUrl: player })).status).toBe(
      201,
    );
    const cleared = await session.patch(`${AD}/properties/${created.body.data.id}`, {
      videoUrl: null,
    });
    expect(cleared.status).toBe(200);
    const after = await request(app).get(`/api/v1/properties/${created.body.data.slug}`);
    expect(after.body.data.videoUrl).toBeNull();
  });

  it('validates input strictly', async () => {
    const { session } = await loginAdmin();
    const bad = [
      {},
      { ...newProp, price: -1 },
      { ...newProp, type: 'castle' },
      { ...newProp, type: 'apartment' },
      { ...newProp, slug: 'hijack' },
      { ...newProp, viewCount: 99999 },
      { ...newProp, address: {} },
      { ...newProp, amenities: Array(41).fill('x') },
      { ...newProp, title: 'x'.repeat(141) },
      { ...newProp, price: { $gt: 0 } },
    ];
    for (const b of bad) expect((await session.post(`${AD}/properties`, b)).status).toBe(400);
    expect(await Property.countDocuments()).toBe(0);
    const p = await makeProperty();
    expect((await session.patch(`${AD}/properties/${p._id}`, {})).status).toBe(400);
    expect((await session.patch(`${AD}/properties/not-an-id`, { featured: true })).status).toBe(
      400,
    );
    expect(
      (await session.patch(`${AD}/properties/64b7f0f0f0f0f0f0f0f0f0f0`, { featured: true })).status,
    ).toBe(404);
  });

  it('lists hidden listings for the admin, with filters and pagination', async () => {
    const { session } = await loginAdmin();
    await makeProperty({ title: 'Alpha', status: 'hidden' });
    await makeProperty({ title: 'Beta' });
    const all = await session.get(`${AD}/properties`);
    expect(all.body.meta.total).toBe(2);
    expect(all.body.data[0]).toHaveProperty('viewCount');
    const hidden = await session.get(`${AD}/properties?status=hidden`);
    expect(hidden.body.data.map((p: { title: string }) => p.title)).toEqual(['Alpha']);
    expect((await session.get(`${AD}/properties?q=bet`)).body.data).toHaveLength(1);
    expect((await session.get(`${AD}/properties?limit=51`)).status).toBe(400);
  });

  it('requires the CSRF header for admin mutations', async () => {
    const { session } = await loginAdmin();
    const res = await session.agent.post(`${AD}/properties`).send(newProp);
    expect(res.status).toBe(403);
  });
});

describe('admin images', () => {
  const png = () =>
    sharp({ create: { width: 40, height: 30, channels: 3, background: '#c00' } })
      .png()
      .toBuffer();

  it('uploads, re-encodes and orders images; enforces limits and types', async () => {
    const { session } = await loginAdmin();
    const p = await makeProperty({ title: 'Pic flat' });
    const url = `${AD}/properties/${p._id}/images`;

    const img = await png();
    const ok = await session
      .postRaw(url)
      .attach('images', img, { filename: 'a.png', contentType: 'image/png' })
      .attach('images', img, { filename: 'b.png', contentType: 'image/png' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.images).toHaveLength(2);
    expect(ok.body.data.images[0]).toMatchObject({ order: 0, alt: 'Pic flat' });
    expect(ok.body.data.images[1].order).toBe(1);

    const notImage = await session.postRaw(url).attach('images', Buffer.from('<?php echo 1; ?>'), {
      filename: 'x.png',
      contentType: 'image/png',
    });
    expect(notImage.status).toBe(400);
    const wrongMime = await session
      .postRaw(url)
      .attach('images', img, { filename: 'x.gif', contentType: 'image/gif' });
    expect(wrongMime.status).toBe(400);
    const empty = await session.postRaw(url);
    expect(empty.status).toBe(400);
    const tooBig = await session
      .postRaw(url)
      .attach('images', Buffer.concat([img, Buffer.alloc(6 * 1024 * 1024)]), {
        filename: 'big.png',
        contentType: 'image/png',
      });
    expect(tooBig.status).toBe(413);
    expect((await Property.findById(p._id))?.images).toHaveLength(2);

    const [first, second] = ok.body.data.images as { publicId: string }[];
    const reordered = await session.patch(url, {
      images: [
        { publicId: first!.publicId, order: 1, alt: 'Living room' },
        { publicId: second!.publicId, order: 0 },
      ],
    });
    expect(reordered.status).toBe(200);
    const pub = await request(app).get(`/api/v1/properties/${p.slug}`);
    expect(pub.body.data.images[0].url).toBe(ok.body.data.images[1].url);
    expect(pub.body.data.images[1].alt).toBe('Living room');
    expect(JSON.stringify(pub.body)).not.toContain('publicId');

    expect((await session.patch(url, { images: [{ publicId: 'nope', order: 0 }] })).status).toBe(
      400,
    );
    const del = await session.del(`${url}?publicId=${encodeURIComponent(first!.publicId)}`);
    expect(del.status).toBe(200);
    expect(del.body.data.images).toHaveLength(1);
    expect(
      (await session.del(`${url}?publicId=${encodeURIComponent(first!.publicId)}`)).status,
    ).toBe(404);
  });

  it('strips EXIF metadata by re-encoding', async () => {
    const { session } = await loginAdmin();
    const p = await makeProperty();
    const uploads: Buffer[] = [];
    const original = getImageStore();
    setImageStore({
      upload: async (b) => {
        uploads.push(b);
        return original.upload(b);
      },
      remove: (id) => original.remove(id),
    });
    try {
      const withExif = await sharp({
        create: { width: 40, height: 30, channels: 3, background: '#0a0' },
      })
        .jpeg()
        .withExif({ IFD0: { Copyright: 'secret-owner' } })
        .toBuffer();
      expect((await sharp(withExif).metadata()).exif).toBeTruthy();
      const res = await session
        .postRaw(`${AD}/properties/${p._id}/images`)
        .attach('images', withExif, { filename: 'a.jpg', contentType: 'image/jpeg' });
      expect(res.status).toBe(201);
      expect((await sharp(uploads[0]!).metadata()).exif).toBeUndefined();
      expect((await sharp(uploads[0]!).metadata()).format).toBe('webp');
    } finally {
      setImageStore(original);
    }
  });

  it('caps images per listing', async () => {
    const { session } = await loginAdmin();
    const p = await makeProperty({
      images: Array.from({ length: MAX_IMAGES_PER_PROPERTY }, (_, i) => ({
        url: `https://x/${i}`,
        publicId: `p${i}`,
        order: i,
      })),
    });
    const res = await session
      .postRaw(`${AD}/properties/${p._id}/images`)
      .attach('images', await png(), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });

  it('cleans up already-uploaded images if the store fails mid-batch', async () => {
    const { session } = await loginAdmin();
    const p = await makeProperty();
    const original = getImageStore();
    const removed: string[] = [];
    let n = 0;
    setImageStore({
      upload: async (b) => {
        if (++n === 2) throw new Error('boom');
        return original.upload(b);
      },
      remove: async (id) => void removed.push(id),
    });
    try {
      const img = await png();
      const res = await session
        .postRaw(`${AD}/properties/${p._id}/images`)
        .attach('images', img, { filename: 'a.png', contentType: 'image/png' })
        .attach('images', img, { filename: 'b.png', contentType: 'image/png' });
      expect(res.status).toBe(502);
      expect(removed).toHaveLength(1);
      expect((await Property.findById(p._id))?.images).toHaveLength(0);
    } finally {
      setImageStore(original);
    }
  });

  it('deleting a listing removes its images from the store and its interests', async () => {
    const { session } = await loginAdmin();
    const { session: user } = await signUpAndLogin();
    const p = await makeProperty({
      images: [{ url: 'https://x/1', publicId: 'gone-1', order: 0 }],
    });
    await user.post(`/api/v1/properties/${p._id}/interest`);
    expect(await Interest.countDocuments()).toBe(1);
    const original = getImageStore();
    const removed: string[] = [];
    setImageStore({
      upload: (b) => original.upload(b),
      remove: async (id) => void removed.push(id),
    });
    try {
      await session.del(`${AD}/properties/${p._id}`);
    } finally {
      setImageStore(original);
    }
    expect(removed).toEqual(['gone-1']);
    expect(await Interest.countDocuments()).toBe(0);
  });
});

describe('admin leads', () => {
  it('lists users with interest counts and filters; updates lead status and notes', async () => {
    const admin = await loginAdmin();
    const a = await signUpAndLogin({ name: 'Ravi Kumar' });
    await signUpAndLogin({ name: 'Sunita Rao' });
    const p = await makeProperty();
    await a.session.post(`/api/v1/properties/${p._id}/interest`);

    const list = await admin.session.get(`${AD}/users`);
    expect(list.body.meta.total).toBe(2); // admin accounts are not leads
    const ravi = list.body.data.find((u: { name: string }) => u.name === 'Ravi Kumar');
    expect(ravi.interestCount).toBe(1);
    expect(ravi).not.toHaveProperty('passwordHash');
    expect((await admin.session.get(`${AD}/users?q=sunita`)).body.data).toHaveLength(1);
    expect(
      (await admin.session.get(`${AD}/users?q=${encodeURIComponent('.*')}`)).body.data,
    ).toHaveLength(0);

    const upd = await admin.session.patch(`${AD}/users/${ravi.id}`, {
      leadStatus: 'contacted',
      note: 'Called, wants 3BHK',
    });
    expect(upd.body.data.leadStatus).toBe('contacted');
    expect(upd.body.data.adminNotes[0]).toMatchObject({ text: 'Called, wants 3BHK' });
    expect((await admin.session.get(`${AD}/users?leadStatus=contacted`)).body.data).toHaveLength(1);
    expect(
      (await admin.session.patch(`${AD}/users/${ravi.id}`, { leadStatus: 'won' })).status,
    ).toBe(400);
    expect((await admin.session.patch(`${AD}/users/${ravi.id}`, { role: 'admin' })).status).toBe(
      400,
    );
    expect(
      (await admin.session.patch(`${AD}/users/${admin.id}`, { leadStatus: 'closed' })).status,
    ).toBe(404);
  });

  it('lists interests filtered by property, user and date, with user/property details', async () => {
    const admin = await loginAdmin();
    const a = await signUpAndLogin();
    const b = await signUpAndLogin();
    const p1 = await makeProperty({ title: 'P1' });
    const p2 = await makeProperty({ title: 'P2' });
    await a.session.post(`/api/v1/properties/${p1._id}/interest`);
    await a.session.post(`/api/v1/properties/${p2._id}/interest`);
    await b.session.post(`/api/v1/properties/${p1._id}/interest`);

    const all = await admin.session.get(`${AD}/interests`);
    expect(all.body.meta.total).toBe(3);
    expect(all.body.data[0].user).toHaveProperty('phone');
    expect(all.body.data[0].property).toHaveProperty('title');
    expect((await admin.session.get(`${AD}/interests?property=${p1._id}`)).body.meta.total).toBe(2);
    expect((await admin.session.get(`${AD}/interests?user=${a.id}`)).body.meta.total).toBe(2);
    expect((await admin.session.get(`${AD}/interests?from=2999-01-01`)).body.meta.total).toBe(0);
    expect((await admin.session.get(`${AD}/interests?property=bad`)).status).toBe(400);
  });

  it('manages enquiries', async () => {
    const admin = await loginAdmin();
    await request(app).post('/api/v1/enquiries').send({
      name: 'Visitor',
      email: 'v@example.com',
      phone: '9876543210',
      message: 'Hello there',
    });
    const list = await admin.session.get(`${AD}/enquiries`);
    expect(list.body.data).toHaveLength(1);
    const id = list.body.data[0].id;
    const upd = await admin.session.patch(`${AD}/enquiries/${id}`, { status: 'contacted' });
    expect(upd.body.data.status).toBe('contacted');
    expect((await admin.session.get(`${AD}/enquiries?status=new`)).body.data).toHaveLength(0);
    expect((await admin.session.patch(`${AD}/enquiries/${id}`, { status: 'x' })).status).toBe(400);
    expect(await Enquiry.countDocuments({ status: 'contacted' })).toBe(1);
  });

  it('exports consenting leads as CSV, excludes withdrawn users, neutralises formulas and is audited', async () => {
    const admin = await loginAdmin();
    const a = await signUpAndLogin({ name: '=HYPERLINK("http://evil","x")' });
    const b = await signUpAndLogin({ name: 'Left Lead' });
    await b.session.patch('/api/v1/me', { consent: false });
    const p = await makeProperty();
    await a.session.post(`/api/v1/properties/${p._id}/interest`);

    const res = await admin.session.get(`${AD}/export/leads.csv`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    const text = res.text;
    expect(text.split('\r\n')[0]).toBe(
      'Name,Email,Phone,Lead status,Interests,Consent date,Signed up',
    );
    expect(text).toContain(a.user.email);
    expect(text).toContain(a.user.phone); // phone numbers stay intact
    expect(text).not.toContain(b.user.email);
    expect(text).toContain(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect(await AuditLog.countDocuments({ action: 'leads.export' })).toBe(1);
  });

  it('serves dashboard stats', async () => {
    const admin = await loginAdmin();
    const a = await signUpAndLogin();
    const p = await makeProperty({ title: 'Top pick' });
    await makeProperty({ status: 'sold' });
    await a.session.post(`/api/v1/properties/${p._id}/interest`);
    const res = await admin.session.get(`${AD}/stats`);
    expect(res.body.data).toMatchObject({ users: 1, newLeads: 1, interests: 1, newEnquiries: 0 });
    expect(res.body.data.properties).toEqual({ available: 1, sold: 1 });
    expect(res.body.data.topProperties[0]).toMatchObject({ title: 'Top pick', interests: 1 });
    expect(res.body.data.recentLeads).toHaveLength(1);
  });
});
