import sharp from 'sharp';
import { MAX_IMAGES_PER_PROPERTY } from '../../config/constants.js';
import { Interest } from '../../models/interest.js';
import { Property } from '../../models/property.js';
import { getImageStore } from '../../providers/imageStore.js';
import { AppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { pageMeta } from '../../utils/pagination.js';
import { sniffImage } from '../../utils/imageSniff.js';
import { makeSlug } from '../properties/service.js';
import type { CreatePropertyBody, UpdatePropertyBody } from './schema.js';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Admin shape: everything, including hidden listings and view counts. */
export const toAdmin = (p: { _id: unknown } & Record<string, unknown>) => {
  const { _id, __v, ...rest } = p as Record<string, unknown>;
  void __v;
  return { id: String(_id), ...rest };
};

export async function listAdmin(q: { status?: string; q?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ title: rx }, { 'address.locality': rx }, { 'address.city': rx }];
  }
  const [items, total] = await Promise.all([
    Property.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Property.countDocuments(filter),
  ]);
  return { items: items.map(toAdmin), meta: pageMeta(q.page, q.limit, total) };
}

export async function getAdmin(id: string) {
  const p = await Property.findById(id).lean();
  if (!p) throw AppError.notFound('Property not found');
  return toAdmin(p);
}

export async function createProperty(body: CreatePropertyBody) {
  // Retry on the (very unlikely) slug collision of the random suffix.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const doc = await Property.create({ ...body, slug: makeSlug(body.title) });
      return toAdmin(doc.toObject());
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }
  throw AppError.conflict('Could not generate a unique slug, please retry');
}

export async function updateProperty(id: string, body: UpdatePropertyBody) {
  const p = await Property.findByIdAndUpdate(
    id,
    { $set: body },
    { returnDocument: 'after', runValidators: true },
  ).lean();
  if (!p) throw AppError.notFound('Property not found');
  return toAdmin(p);
}

export async function deleteProperty(id: string) {
  const p = await Property.findByIdAndDelete(id).lean();
  if (!p) throw AppError.notFound('Property not found');
  await Interest.deleteMany({ property: id });
  // Image cleanup is best-effort: an orphaned remote image is harmless, a failed delete is not.
  await Promise.all(
    (p.images ?? []).map((i) =>
      getImageStore()
        .remove(i.publicId)
        .catch((err) => logger.warn({ err, publicId: i.publicId }, 'image removal failed')),
    ),
  );
  return p;
}

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
}

export async function addImages(id: string, files: UploadedFile[]) {
  if (files.length === 0) throw AppError.badRequest('No images uploaded');
  const property = await Property.findById(id).select('title images').lean();
  if (!property) throw AppError.notFound('Property not found');
  const existing = property.images?.length ?? 0;
  if (existing + files.length > MAX_IMAGES_PER_PROPERTY)
    throw AppError.badRequest(`A listing can have at most ${MAX_IMAGES_PER_PROPERTY} images`);

  // Validate and re-encode everything first so a bad file rejects the whole batch cleanly.
  const processed: Buffer[] = [];
  for (const f of files) {
    if (!sniffImage(f.buffer))
      throw AppError.badRequest('File is not a valid JPG, PNG or WebP image');
    try {
      // rotate() applies EXIF orientation, then re-encoding drops all metadata (EXIF/GPS).
      processed.push(
        await sharp(f.buffer, { limitInputPixels: 50_000_000 })
          .rotate()
          .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer(),
      );
    } catch {
      throw AppError.badRequest('File is not a valid JPG, PNG or WebP image');
    }
  }

  const store = getImageStore();
  const uploaded: { url: string; publicId: string }[] = [];
  try {
    for (const buf of processed) uploaded.push(await store.upload(buf));
  } catch (err) {
    await Promise.all(uploaded.map((u) => store.remove(u.publicId).catch(() => undefined)));
    logger.error({ err }, 'image upload failed');
    throw new AppError(502, 'upload_failed', 'Image upload failed, please try again');
  }

  const images = uploaded.map((u, i) => ({
    ...u,
    alt: property.title,
    order: existing + i,
  }));
  const updated = await Property.findByIdAndUpdate(
    id,
    { $push: { images: { $each: images } } },
    { returnDocument: 'after' },
  ).lean();
  return toAdmin(updated!);
}

export async function reorderImages(
  id: string,
  items: { publicId: string; order: number; alt?: string | undefined }[],
) {
  const p = await Property.findById(id);
  if (!p) throw AppError.notFound('Property not found');
  const known = new Set(p.images.map((i) => i.publicId));
  if (items.some((i) => !known.has(i.publicId))) throw AppError.badRequest('Unknown image');
  for (const it of items) {
    const img = p.images.find((i) => i.publicId === it.publicId)!;
    img.order = it.order;
    if (it.alt !== undefined) img.alt = it.alt;
  }
  await p.save();
  return toAdmin(p.toObject());
}

export async function removeImage(id: string, publicId: string) {
  const p = await Property.findOneAndUpdate(
    { _id: id, 'images.publicId': publicId },
    { $pull: { images: { publicId } } },
    { returnDocument: 'after' },
  ).lean();
  if (!p) throw AppError.notFound('Image not found');
  await getImageStore()
    .remove(publicId)
    .catch((err) => logger.warn({ err, publicId }, 'image removal failed'));
  return toAdmin(p);
}
