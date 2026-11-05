import { z } from 'zod';
import { FURNISHINGS, PROPERTY_TYPES, PURPOSES } from '../../models/property.js';
import { paginationShape } from '../../utils/pagination.js';

const text = (max: number) => z.string().trim().min(1).max(max);

export const SORTS = ['newest', 'price_asc', 'price_desc', 'featured'] as const;

export const listQuery = z
  .object({
    city: text(80).optional(),
    locality: text(100).optional(),
    purpose: z.enum(PURPOSES).optional(),
    type: z.enum(PROPERTY_TYPES).optional(),
    bhk: z.coerce.number().int().min(0).max(20).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    furnishing: z.enum(FURNISHINGS).optional(),
    status: z.enum(['available', 'sold', 'rented']).default('available'),
    q: text(100).optional(),
    sort: z.enum(SORTS).default('newest'),
    ...paginationShape,
  })
  .strict()
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: 'minPrice must be <= maxPrice',
    path: ['minPrice'],
  });

export const slugParams = z.object({ slug: z.string().trim().min(1).max(200) }).strict();

export type ListQuery = z.infer<typeof listQuery>;
