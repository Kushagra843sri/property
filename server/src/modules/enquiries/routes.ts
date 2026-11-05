import { Router } from 'express';
import { z } from 'zod';
import { enquiryLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { Enquiry } from '../../models/enquiry.js';
import { Property } from '../../models/property.js';
import { normalizeEmail, normalizePhone } from '../../utils/phone.js';
import { objectId } from '../../utils/zod.js';
import { listingUrl, notifyDealer } from '../notifications/service.js';

const body = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().max(254).email().transform(normalizeEmail),
    phone: z
      .string()
      .trim()
      .max(20)
      .transform((v, ctx) => {
        const n = normalizePhone(v);
        if (!n) ctx.addIssue({ code: 'custom', message: 'Invalid phone number' });
        return n ?? '';
      }),
    message: z.string().trim().min(5).max(2000),
    propertyId: objectId.optional(),
    website: z.string().max(200).optional(), // honeypot
  })
  .strict();

export const enquiriesRouter = Router();

enquiriesRouter.post('/', enquiryLimiter, validate({ body }), async (req, res) => {
  const b = req.validated.body as z.infer<typeof body>;
  // Bots fill the honeypot; answer as if it worked, store nothing.
  if (b.website) return void res.status(201).json({ data: { received: true } });

  const property = b.propertyId
    ? await Property.findOne({ _id: b.propertyId, status: { $ne: 'hidden' } })
        .select('title slug')
        .lean()
    : null;
  const enquiry = await Enquiry.create({
    name: b.name,
    email: b.email,
    phone: b.phone,
    message: b.message,
    ...(property ? { property: property._id } : {}),
  });

  await notifyDealer(
    `New enquiry from ${b.name}`,
    [
      `Name: ${b.name}`,
      `Phone: ${b.phone}`,
      `Email: ${b.email}`,
      property ? `Listing: ${property.title} (${listingUrl(property.slug)})` : '',
      '',
      b.message,
    ]
      .filter((l, i) => l || i > 3)
      .join('\n'),
  );
  res.status(201).json({ data: { received: true, id: String(enquiry._id) } });
});
