import { randomBytes } from 'node:crypto';
import type { QueryFilter, SortOrder } from 'mongoose';
import { Property, type PropertyDoc } from '../../models/property.js';
import { AppError } from '../../utils/errors.js';
import { pageMeta } from '../../utils/pagination.js';
import type { ListQuery } from './schema.js';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactCi = (s: string) => new RegExp(`^${escapeRegex(s)}$`, 'i');

export const slugify = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'property';

/** Slug = readable title part + short random suffix, so duplicates of a title never collide. */
export const makeSlug = (title: string) => `${slugify(title)}-${randomBytes(3).toString('hex')}`;

type Img = { url: string; alt?: string | null; order?: number | null };
// Accepts lean docs and hydrated docs alike; only the image shape needs loosening.
type Lean = Omit<PropertyDoc, 'images'> & { _id: unknown; images?: Img[]; createdAt?: Date };

/** Public shape: no internal counters; images ordered. */
export function toPublic(p: Lean) {
  return {
    id: String(p._id),
    title: p.title,
    slug: p.slug,
    description: p.description,
    type: p.type,
    purpose: p.purpose,
    price: p.price,
    priceUnit: p.priceUnit,
    bhk: p.bhk,
    bathrooms: p.bathrooms,
    carpetArea: p.carpetArea,
    builtUpArea: p.builtUpArea,
    areaUnit: p.areaUnit,
    furnishing: p.furnishing,
    floor: p.floor,
    totalFloors: p.totalFloors,
    facing: p.facing,
    ageOfProperty: p.ageOfProperty,
    possession: p.possession,
    address: p.address,
    geo: p.geo,
    amenities: p.amenities,
    images: [...(p.images ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(({ url, alt, order }) => ({ url, alt, order })),
    status: p.status,
    featured: p.featured,
    createdAt: p.createdAt,
  };
}

const SORT_MAP: Record<ListQuery['sort'], Record<string, SortOrder>> = {
  newest: { createdAt: -1, _id: -1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: -1 },
  featured: { featured: -1, createdAt: -1, _id: -1 },
};

export function buildFilter(q: ListQuery): QueryFilter<PropertyDoc> {
  const f: QueryFilter<PropertyDoc> = { status: q.status }; // hidden listings are never public
  if (q.city) f['address.city'] = exactCi(q.city);
  if (q.locality) f['address.locality'] = exactCi(q.locality);
  if (q.purpose) f.purpose = q.purpose;
  if (q.type) f.type = q.type;
  if (q.bhk !== undefined) f.bhk = q.bhk;
  if (q.furnishing) f.furnishing = q.furnishing;
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    f.price = {
      ...(q.minPrice !== undefined && { $gte: q.minPrice }),
      ...(q.maxPrice !== undefined && { $lte: q.maxPrice }),
    };
  }
  if (q.q) f.$text = { $search: q.q };
  return f;
}

export async function listPublic(q: ListQuery) {
  const filter = buildFilter(q);
  const [items, total] = await Promise.all([
    Property.find(filter)
      .sort(SORT_MAP[q.sort])
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Property.countDocuments(filter),
  ]);
  return { items: items.map(toPublic), meta: pageMeta(q.page, q.limit, total) };
}

export async function getPublicBySlug(slug: string) {
  const p = await Property.findOneAndUpdate(
    { slug, status: { $ne: 'hidden' } },
    { $inc: { viewCount: 1 } },
    { returnDocument: 'after' },
  ).lean();
  if (!p) throw AppError.notFound('Property not found');
  return toPublic(p);
}
