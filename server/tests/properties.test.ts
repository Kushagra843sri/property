import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, makeProperty, useTestDb } from './helpers.js';

useTestDb();
const P = '/api/v1/properties';

describe('public properties', () => {
  it('lists available properties with pagination meta and hides hidden/sold by default', async () => {
    await makeProperty({ title: 'Visible one' });
    await makeProperty({ title: 'Hidden one', status: 'hidden' });
    await makeProperty({ title: 'Sold one', status: 'sold' });
    const res = await request(app).get(P);
    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { title: string }) => p.title)).toEqual(['Visible one']);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 12, total: 1, totalPages: 1 });
    const sold = await request(app).get(`${P}?status=sold`);
    expect(sold.body.data).toHaveLength(1);
    const hidden = await request(app).get(`${P}?status=hidden`);
    expect(hidden.status).toBe(400); // hidden can never be requested publicly
  });

  it('does not expose internal fields', async () => {
    await makeProperty();
    const [item] = (await request(app).get(P)).body.data;
    expect(item).not.toHaveProperty('viewCount');
    expect(item).not.toHaveProperty('__v');
    expect(item).not.toHaveProperty('_id');
    expect(item.images).toEqual([]);
  });

  it('filters by city, locality, purpose, type, bhk, furnishing and price range', async () => {
    await makeProperty({ title: 'A', bhk: 2, price: 4_000_000 });
    await makeProperty({
      title: 'B',
      bhk: 3,
      price: 9_000_000,
      purpose: 'rent',
      furnishing: 'furnished',
    });
    await makeProperty({
      title: 'C',
      bhk: undefined,
      type: 'pg',
      address: { city: 'Delhi', locality: 'Dwarka' },
    });
    const titles = async (qs: string) =>
      (await request(app).get(`${P}?${qs}&sort=price_asc`)).body.data.map(
        (p: { title: string }) => p.title,
      );
    expect(await titles('city=lucknow')).toEqual(['A', 'B']);
    expect(await titles('locality=dwarka')).toEqual(['C']);
    expect(await titles('purpose=rent')).toEqual(['B']);
    expect(await titles('type=pg')).toEqual(['C']);
    expect(await titles('type=flat&city=Lucknow')).toEqual(['A', 'B']);
    expect(await titles('bhk=3&city=Lucknow')).toEqual(['B']);
    expect(await titles('furnishing=furnished')).toEqual(['B']);
    expect(await titles('minPrice=5000000&maxPrice=9500000&city=Lucknow')).toEqual(['B']);
  });

  it('treats the city filter as a literal, not a regex', async () => {
    await makeProperty({ address: { city: 'Lucknow' } });
    const res = await request(app).get(`${P}?city=${encodeURIComponent('.*')}`);
    expect(res.body.data).toHaveLength(0);
  });

  it('sorts by price and paginates with a capped limit', async () => {
    for (let i = 0; i < 5; i++) await makeProperty({ price: 1000 * (i + 1), title: `P${i}` });
    const asc = await request(app).get(`${P}?sort=price_asc&limit=2&page=2`);
    expect(asc.body.data.map((p: { title: string }) => p.title)).toEqual(['P2', 'P3']);
    expect(asc.body.meta).toMatchObject({ page: 2, limit: 2, total: 5, totalPages: 3 });
    const desc = await request(app).get(`${P}?sort=price_desc&limit=1`);
    expect(desc.body.data[0].title).toBe('P4');
    expect((await request(app).get(`${P}?limit=51`)).status).toBe(400);
    expect((await request(app).get(`${P}?limit=0`)).status).toBe(400);
    expect((await request(app).get(`${P}?page=0`)).status).toBe(400);
  });

  it('puts featured first when sorted by featured', async () => {
    await makeProperty({ title: 'Plain' });
    await makeProperty({ title: 'Star', featured: true });
    const res = await request(app).get(`${P}?sort=featured`);
    expect(res.body.data[0].title).toBe('Star');
  });

  it('supports text search', async () => {
    await makeProperty({ title: 'Lakeview penthouse' });
    await makeProperty({ title: 'Garden bungalow' });
    const res = await request(app).get(`${P}?q=penthouse`);
    expect(res.body.data.map((p: { title: string }) => p.title)).toEqual(['Lakeview penthouse']);
  });

  it('rejects invalid, unknown and inconsistent query params', async () => {
    for (const qs of [
      'bhk=abc',
      'sort=random',
      'type=castle',
      'type=apartment',
      'foo=bar',
      'minPrice=10&maxPrice=5',
      'minPrice=-1',
    ]) {
      expect((await request(app).get(`${P}?${qs}`)).status).toBe(400);
    }
  });

  it('returns a listing by slug and counts the view', async () => {
    const doc = await makeProperty({ title: 'Detail page' });
    const res = await request(app).get(`${P}/${doc.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Detail page');
    const { Property } = await import('../src/models/property.js');
    expect((await Property.findById(doc._id))?.viewCount).toBe(1);
  });

  it('404s for unknown and hidden slugs, but still serves sold listings', async () => {
    const hidden = await makeProperty({ status: 'hidden' });
    const sold = await makeProperty({ status: 'sold' });
    expect((await request(app).get(`${P}/${hidden.slug}`)).status).toBe(404);
    expect((await request(app).get(`${P}/nope`)).status).toBe(404);
    const res = await request(app).get(`${P}/${sold.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('sold');
  });
});
