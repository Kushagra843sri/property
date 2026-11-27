/**
 * One-off import of the dealer's first listings (data in initial-listings.json).
 *
 *   npx tsx scripts/import-listings.ts <folder-with-the-photos>
 *
 * Uses whatever database and image store the server's env points at, so on the live server the
 * photos go to Cloudinary. Skips a listing whose title already exists. The Bunny video links in the
 * data are imported as they are; to change one later, edit the listing in the admin panel.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Property } from '../src/models/property.js';
import { addImages } from '../src/modules/admin/propertiesService.js';
import { makeSlug } from '../src/modules/properties/service.js';

interface Entry {
  property: Record<string, unknown> & { title: string };
  photosDir?: boolean;
}

const IMAGE = /\.(jpe?g|png|webp)$/i;

export async function importListings(photoDir: string) {
  const entries = JSON.parse(
    await readFile(new URL('./initial-listings.json', import.meta.url), 'utf8'),
  ) as Entry[];
  const photos = (await readdir(photoDir)).filter((f) => IMAGE.test(f)).sort();
  for (const e of entries) {
    if (await Property.exists({ title: e.property.title })) {
      console.info(`skip (exists): ${e.property.title}`);
      continue;
    }
    // Straight to the model, not createProperty: that one demands a BHK, and two listings have none yet.
    const created = await Property.create({ ...e.property, slug: makeSlug(e.property.title) });
    if (e.photosDir) {
      const files = await Promise.all(
        photos.map(async (name) => ({
          originalname: name,
          buffer: await readFile(join(photoDir, name)),
        })),
      );
      await addImages(String(created._id), files);
    }
    console.info(`created: ${e.property.title}`);
  }
}

if (process.argv[1]?.endsWith('import-listings.ts')) {
  const dir = process.argv[2];
  if (!dir) throw new Error('Usage: tsx scripts/import-listings.ts <photo-folder>');
  const { connectDb } = await import('../src/config/db.js');
  await connectDb();
  await importListings(dir);
  process.exit(0);
}
