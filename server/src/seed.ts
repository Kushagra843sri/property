import { env, isProd } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { Property } from './models/property.js';
import { createAdmin } from './adminSetup.js';
import { makeSlug } from './modules/properties/service.js';

// Clearly fake data: every title starts with [SAMPLE] and there are no real photos.
const SAMPLES = [
  {
    title: '[SAMPLE] 3 BHK flat for sale',
    type: 'flat',
    purpose: 'buy',
    price: 8_500_000,
    bhk: 3,
    bathrooms: 3,
    carpetArea: 1450,
    locality: 'Janakpuri',
    featured: true,
  },
  {
    title: '[SAMPLE] 2 BHK flat for rent',
    type: 'flat',
    purpose: 'rent',
    priceUnit: 'per-month',
    price: 22_000,
    bhk: 2,
    bathrooms: 2,
    carpetArea: 980,
    locality: 'Dwarka Mor',
    furnishing: 'semi-furnished',
    featured: true,
  },
  {
    title: '[SAMPLE] 1 BHK flat for rent',
    type: 'flat',
    purpose: 'rent',
    priceUnit: 'per-month',
    price: 12_000,
    bhk: 1,
    bathrooms: 1,
    carpetArea: 520,
    locality: 'Janakpuri',
  },
  {
    title: '[SAMPLE] Shop on main road',
    type: 'shop',
    purpose: 'rent',
    priceUnit: 'per-month',
    price: 45_000,
    carpetArea: 400,
    locality: 'Uttam Nagar East',
  },
  {
    title: '[SAMPLE] Office space for sale',
    type: 'office',
    purpose: 'buy',
    price: 6_500_000,
    carpetArea: 750,
    locality: 'Uttam Nagar East',
    featured: true,
  },
  {
    title: '[SAMPLE] PG room, meals included',
    type: 'pg',
    purpose: 'rent',
    priceUnit: 'per-month',
    price: null,
    carpetArea: 120,
    locality: 'Dwarka Mor',
    furnishing: 'furnished',
  },
  {
    title: '[SAMPLE] Furnished room for rent',
    type: 'room',
    purpose: 'rent',
    priceUnit: 'per-month',
    price: 8_000,
    carpetArea: 150,
    bathrooms: 1,
    locality: 'Janakpuri',
    furnishing: 'furnished',
  },
] as const;

/** DEVELOPMENT ONLY: demo admin plus sample listings. Refuses to run in production. */
export async function runSeed(rawEmail: string, password: string, production = isProd) {
  if (production) {
    throw new Error('The seed script is development-only. In production use: npm run create-admin');
  }
  const email = await createAdmin(rawEmail, password, false);
  console.info(`admin ready: ${email}`);

  if ((await Property.countDocuments({ title: /^\[SAMPLE\]/ })) === 0) {
    await Property.insertMany(
      SAMPLES.map(({ locality, ...s }, i) => ({
        ...s,
        slug: makeSlug(s.title),
        description:
          'Sample listing for development. Not a real property. Replace with your own listings from the admin panel.',
        address: { city: 'Sample City', state: 'Sample State', locality },
        geo: { lat: 26.85 + i * 0.01, lng: 80.94 + i * 0.01 },
        amenities: ['Parking', 'Power backup', 'Lift', '24x7 security'],
        // Placeholder pictures live in the client app (client/public/placeholders).
        images: [0, 1, 2].map((k) => ({
          url: `/placeholders/sample-${((i + k) % 6) + 1}.svg`,
          publicId: `sample/${i}-${k}`,
          alt: 'Placeholder image for a sample listing',
          order: k,
        })),
      })),
    );
    console.info(`inserted ${SAMPLES.length} sample properties (NODE_ENV=${env.NODE_ENV})`);
  }
}

// CLI entry: `npm run seed`
if (process.argv[1]?.replaceAll('\\', '/').endsWith('src/seed.ts')) {
  connectDb()
    .then(() => runSeed(process.env.ADMIN_EMAIL ?? '', process.env.ADMIN_PASSWORD ?? ''))
    .then(() => disconnectDb())
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
