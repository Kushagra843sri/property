import { env, isProd } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { Property } from './models/property.js';
import { User } from './models/user.js';
import { hashPassword, passwordProblem } from './utils/password.js';
import { makeSlug } from './modules/properties/service.js';
import { normalizeEmail } from './utils/phone.js';

// Clearly fake data: every title starts with [SAMPLE] and there are no real photos.
const SAMPLES = [
  {
    title: '[SAMPLE] 3 BHK apartment, Gomti Nagar',
    type: 'apartment',
    purpose: 'buy',
    price: 8_500_000,
    bhk: 3,
    bathrooms: 3,
    carpetArea: 1450,
    locality: 'Gomti Nagar',
    featured: true,
  },
  {
    title: '[SAMPLE] 2 BHK flat for rent, Hazratganj',
    type: 'apartment',
    purpose: 'rent',
    priceUnit: 'per-month',
    price: 22_000,
    bhk: 2,
    bathrooms: 2,
    carpetArea: 980,
    locality: 'Hazratganj',
    furnishing: 'semi-furnished',
  },
  {
    title: '[SAMPLE] 4 BHK villa with garden',
    type: 'villa',
    purpose: 'buy',
    price: 24_000_000,
    bhk: 4,
    bathrooms: 4,
    carpetArea: 3200,
    locality: 'Sushant Golf City',
    featured: true,
  },
  {
    title: '[SAMPLE] Residential plot, 200 sq.yd',
    type: 'plot',
    purpose: 'buy',
    price: 6_000_000,
    carpetArea: 200,
    areaUnit: 'sqyd',
    locality: 'Faizabad Road',
  },
  {
    title: '[SAMPLE] Commercial shop, main road',
    type: 'shop',
    purpose: 'rent',
    priceUnit: 'per-month',
    price: 45_000,
    carpetArea: 400,
    locality: 'Aliganj',
  },
] as const;

/** Idempotent: creates/updates the admin and, outside production, inserts sample listings once. */
export async function runSeed(rawEmail: string, password: string) {
  const email = normalizeEmail(rawEmail);
  if (!email.includes('@')) throw new Error('ADMIN_EMAIL is required');
  const problem = passwordProblem(password, email);
  if (problem) throw new Error(`ADMIN_PASSWORD rejected: ${problem}`);

  const existing = await User.findOne({ email });
  if (existing && existing.role !== 'admin') {
    throw new Error('A non-admin user with that email already exists; refusing to promote it');
  }
  await User.updateOne(
    { email },
    {
      $set: { passwordHash: await hashPassword(password), role: 'admin', emailVerified: true },
      $setOnInsert: { name: 'Admin', phone: '+910000000000' },
    },
    { upsert: true },
  );
  console.info(`admin ready: ${email}`);

  if (!isProd && (await Property.countDocuments({ title: /^\[SAMPLE\]/ })) === 0) {
    await Property.insertMany(
      SAMPLES.map(({ locality, ...s }, i) => ({
        ...s,
        slug: makeSlug(s.title),
        description:
          'Sample listing for development. Not a real property. Replace with your own listings from the admin panel.',
        address: { city: 'Lucknow', state: 'Uttar Pradesh', locality },
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
