import { isValidObjectId } from 'mongoose';
import { z } from 'zod';

/** A 24-hex ObjectId string (rejects objects/operators outright). */
export const objectId = z
  .string()
  .length(24)
  .refine((v) => isValidObjectId(v) && /^[0-9a-f]{24}$/i.test(v), 'Invalid id');
