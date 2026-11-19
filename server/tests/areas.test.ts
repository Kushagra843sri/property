import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, makeProperty, useTestDb } from './helpers.js';
import { TOP_AREAS } from '../src/modules/properties/areas.js';

useTestDb();
const P = '/api/v1/properties';

describe('areas', () => {
  it('lists top areas first in the dealer order, then the rest alphabetically', async () => {
    await makeProperty({ address: { city: 'Delhi', locality: 'Zakir Nagar' } });
    await makeProperty({ address: { city: 'Delhi', locality: 'Janakpuri' } });
    await makeProperty({ address: { city: 'Delhi', locality: 'Abul Fazal' } });
    const res = await request(app).get(`${P}/areas`);
    expect(res.status).toBe(200);
    const names = res.body.data.map((a: { name: string }) => a.name);
    expect(names.slice(0, TOP_AREAS.length)).toEqual(TOP_AREAS.map((a) => a.name));
    expect(names.slice(TOP_AREAS.length)).toEqual(['Abul Fazal', 'Zakir Nagar']);
    const janakpuri = res.body.data.find((a: { name: string }) => a.name === 'Janakpuri');
    expect(janakpuri).toMatchObject({ count: 1, top: true });
  });

  it('counts only available listings', async () => {
    await makeProperty({ address: { city: 'Delhi', locality: 'Nawada' }, status: 'sold' });
    const res = await request(app).get(`${P}/areas`);
    const nawada = res.body.data.find((a: { name: string }) => a.name === 'Nawada');
    expect(nawada.count).toBe(0);
  });

  it('"Dwarka (any sector)" matches every Dwarka sector but not Dwarka Mor', async () => {
    await makeProperty({
      title: 'Sector ten',
      address: { city: 'Delhi', locality: 'Dwarka Sector 10' },
    });
    await makeProperty({ title: 'Mor flat', address: { city: 'Delhi', locality: 'Dwarka Mor' } });
    const res = await request(app).get(
      `${P}?locality=${encodeURIComponent('Dwarka (any sector)')}`,
    );
    expect(res.body.data.map((p: { title: string }) => p.title)).toEqual(['Sector ten']);
    const mor = await request(app).get(`${P}?locality=${encodeURIComponent('Dwarka Mor')}`);
    expect(mor.body.data.map((p: { title: string }) => p.title)).toEqual(['Mor flat']);
  });

  it('a listing without a price is public with price null', async () => {
    await makeProperty({ title: 'No price', price: null });
    const res = await request(app).get(P);
    const item = res.body.data.find((p: { title: string }) => p.title === 'No price');
    expect(item).toBeDefined();
    expect(item.price).toBeNull();
  });
});
