import { z } from 'zod';
import { VIDEO_URL_PATTERN } from '../../config/constants.js';
import {
  AREA_UNITS,
  FURNISHINGS,
  PRICE_UNITS,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  PURPOSES,
} from '../../models/property.js';
import { LEAD_STATUSES } from '../../models/user.js';
import { ENQUIRY_STATUSES } from '../../models/enquiry.js';
import { paginationShape } from '../../utils/pagination.js';
import { objectId } from '../../utils/zod.js';

const s = (max: number) => z.string().trim().min(1).max(max);
const num = z.number().finite().min(0).max(1e12);

const propertyFields = {
  title: s(140),
  description: z.string().trim().max(5000),
  type: z.enum(PROPERTY_TYPES),
  purpose: z.enum(PURPOSES),
  price: num.nullable(), // null clears the price
  priceUnit: z.enum(PRICE_UNITS),
  bhk: z.number().int().min(0).max(20),
  bathrooms: z.number().int().min(0).max(20),
  carpetArea: num,
  builtUpArea: num,
  areaUnit: z.enum(AREA_UNITS),
  furnishing: z.enum(FURNISHINGS),
  floor: z.number().int().min(-5).max(200),
  totalFloors: z.number().int().min(0).max(200),
  facing: s(30),
  ageOfProperty: z.number().int().min(0).max(200),
  possession: s(60),
  address: z
    .object({
      line: s(200).optional(),
      locality: s(100).optional(),
      city: s(80),
      state: s(80).optional(),
      pincode: s(10).optional(),
    })
    .strict(),
  geo: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).strict(),
  amenities: z.array(s(60)).max(40),
  videoUrl: z
    .string()
    .trim()
    .max(300)
    .regex(VIDEO_URL_PATTERN, 'Use a Bunny Stream player link')
    .nullable(), // null removes the video
  status: z.enum(PROPERTY_STATUSES),
  featured: z.boolean(),
};

const required = ['title', 'type', 'purpose', 'address'] as const;

/** BHK is required for flats and meaningless for every other type. Returns an error message or null. */
export function bhkProblem(type: string | undefined, bhk: number | undefined): string | null {
  if (type === 'flat' && bhk === undefined) return 'BHK is required for a flat';
  if (type !== undefined && type !== 'flat' && bhk !== undefined)
    return 'BHK applies to flats only';
  return null;
}

export const createPropertyBody = z
  .object(propertyFields)
  .partial()
  .required(
    Object.fromEntries(required.map((k) => [k, true])) as Record<(typeof required)[number], true>,
  )
  .strict()
  .superRefine((b, ctx) => {
    const problem = bhkProblem(b.type, b.bhk);
    if (problem) ctx.addIssue({ code: 'custom', path: ['bhk'], message: problem });
  });

export const updatePropertyBody = z
  .object(propertyFields)
  .partial()
  .strict()
  .refine((b) => Object.keys(b).length > 0, { message: 'Nothing to update' });

export const idParams = z.object({ id: objectId }).strict();

export const imageOrderBody = z
  .object({
    images: z
      .array(
        z
          .object({
            publicId: s(300),
            order: z.number().int().min(0).max(1000),
            alt: z.string().trim().max(200).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();

export const imageDeleteQuery = z.object({ publicId: s(300) }).strict();

const search = s(100).optional();

export const adminPropertiesQuery = z
  .object({ status: z.enum(PROPERTY_STATUSES).optional(), q: search, ...paginationShape })
  .strict();

export const adminUsersQuery = z
  .object({
    leadStatus: z.enum(LEAD_STATUSES).optional(),
    status: z.enum(['active', 'withdrawn']).optional(),
    q: search,
    ...paginationShape,
  })
  .strict();

export const updateUserBody = z
  .object({ leadStatus: z.enum(LEAD_STATUSES).optional(), note: s(2000).optional() })
  .strict()
  .refine((b) => b.leadStatus !== undefined || b.note !== undefined, {
    message: 'Nothing to update',
  });

export const adminInterestsQuery = z
  .object({
    property: objectId.optional(),
    user: objectId.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    ...paginationShape,
  })
  .strict();

export const adminEnquiriesQuery = z
  .object({ status: z.enum(ENQUIRY_STATUSES).optional(), ...paginationShape })
  .strict();

export const updateEnquiryBody = z.object({ status: z.enum(ENQUIRY_STATUSES) }).strict();

export type CreatePropertyBody = z.infer<typeof createPropertyBody>;
export type UpdatePropertyBody = z.infer<typeof updatePropertyBody>;
