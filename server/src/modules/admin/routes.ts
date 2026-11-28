import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { imageUpload } from '../../middleware/upload.js';
import { videoLimiter } from '../../middleware/rateLimit.js';
import { ALLOWED_VIDEO_MIME } from '../../config/constants.js';
import { env } from '../../config/env.js';
import { getVideoStore } from '../../providers/videoStore.js';
import { AppError } from '../../utils/errors.js';
import { VideoGuard } from '../../utils/videoGuard.js';
import * as leads from './leadsService.js';
import * as props from './propertiesService.js';
import { audit } from './audit.js';
import {
  adminEnquiriesQuery,
  adminInterestsQuery,
  adminPropertiesQuery,
  adminUsersQuery,
  createPropertyBody,
  idParams,
  imageDeleteQuery,
  imageOrderBody,
  updateEnquiryBody,
  updatePropertyBody,
  updateUserBody,
} from './schema.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const id = (req: { validated: { params?: unknown } }) =>
  (req.validated.params as { id: string }).id;
const adminId = (req: { auth?: { userId: string } }) => req.auth!.userId;
type Q<T> = { validated: { query?: unknown } } & { _t?: T };
const query = <T>(req: Q<T>) => req.validated.query as T;
const body = <T>(req: { validated: { body?: unknown } }) => req.validated.body as T;

// ---- properties ----
adminRouter.get('/properties', validate({ query: adminPropertiesQuery }), async (req, res) => {
  const { items, meta } = await props.listAdmin(query(req));
  res.json({ data: items, meta });
});

adminRouter.post('/properties', validate({ body: createPropertyBody }), async (req, res) => {
  const created = await props.createProperty(body(req));
  await audit(adminId(req), 'property.create', 'property', created.id);
  res.status(201).json({ data: created });
});

adminRouter.get('/properties/:id', validate({ params: idParams }), async (req, res) => {
  res.json({ data: await props.getAdmin(id(req)) });
});

adminRouter.patch(
  '/properties/:id',
  validate({ params: idParams, body: updatePropertyBody }),
  async (req, res) => {
    const updated = await props.updateProperty(id(req), body(req));
    await audit(adminId(req), 'property.update', 'property', id(req), {
      fields: Object.keys(body(req)),
    });
    res.json({ data: updated });
  },
);

adminRouter.delete('/properties/:id', validate({ params: idParams }), async (req, res) => {
  await props.deleteProperty(id(req));
  await audit(adminId(req), 'property.delete', 'property', id(req));
  res.json({ data: { deleted: true } });
});

adminRouter.post(
  '/properties/:id/images',
  validate({ params: idParams }),
  imageUpload,
  async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const updated = await props.addImages(id(req), files);
    await audit(adminId(req), 'property.images.add', 'property', id(req), { count: files.length });
    res.status(201).json({ data: updated });
  },
);

adminRouter.patch(
  '/properties/:id/images',
  validate({ params: idParams, body: imageOrderBody }),
  async (req, res) => {
    const out = await props.reorderImages(id(req), body<{ images: never[] }>(req).images);
    await audit(adminId(req), 'property.images.update', 'property', id(req));
    res.json({ data: out });
  },
);

adminRouter.delete(
  '/properties/:id/images',
  validate({ params: idParams, query: imageDeleteQuery }),
  async (req, res) => {
    const { publicId } = query<{ publicId: string }>(req);
    const out = await props.removeImage(id(req), publicId);
    await audit(adminId(req), 'property.images.delete', 'property', id(req));
    res.json({ data: out });
  },
);

// ---- leads ----
adminRouter.get('/users', validate({ query: adminUsersQuery }), async (req, res) => {
  const { items, meta } = await leads.listUsers(query(req));
  res.json({ data: items, meta });
});

adminRouter.patch(
  '/users/:id',
  validate({ params: idParams, body: updateUserBody }),
  async (req, res) => {
    const b = body<{ leadStatus?: string; note?: string }>(req);
    const out = await leads.updateUser(adminId(req), id(req), b);
    await audit(adminId(req), 'lead.update', 'user', id(req), {
      leadStatus: b.leadStatus,
      noteAdded: !!b.note,
    });
    res.json({ data: out });
  },
);

adminRouter.get('/interests', validate({ query: adminInterestsQuery }), async (req, res) => {
  const { items, meta } = await leads.listInterests(query(req));
  res.json({ data: items, meta });
});

adminRouter.get('/enquiries', validate({ query: adminEnquiriesQuery }), async (req, res) => {
  const { items, meta } = await leads.listEnquiries(query(req));
  res.json({ data: items, meta });
});

adminRouter.patch(
  '/enquiries/:id',
  validate({ params: idParams, body: updateEnquiryBody }),
  async (req, res) => {
    const out = await leads.updateEnquiry(id(req), body<{ status: string }>(req).status);
    await audit(adminId(req), 'enquiry.update', 'enquiry', id(req), body(req));
    res.json({ data: out });
  },
);

adminRouter.get('/export/leads.csv', async (req, res) => {
  await audit(adminId(req), 'leads.export', 'user');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.setHeader('Cache-Control', 'no-store');
  for await (const chunk of leads.leadsCsv()) res.write(chunk);
  res.end();
});

adminRouter.get('/stats', async (_req, res) => {
  res.json({ data: await leads.stats() });
});

const safeDecode = (v: string) => {
  try {
    return decodeURIComponent(v);
  } catch {
    return '';
  }
};

/**
 * Upload a listing video from the admin's computer. The raw file is the request body (not a form),
 * so it streams through to Bunny and is never held in memory. Returns the player link to save.
 */
adminRouter.post('/video', videoLimiter, async (req, res) => {
  const store = getVideoStore();
  if (!store)
    throw new AppError(
      503,
      'video_unavailable',
      'Video upload is not set up yet. Paste a Bunny video link instead.',
    );
  const type = String(req.headers['content-type'] ?? '')
    .split(';')[0]!
    .trim();
  if (!(ALLOWED_VIDEO_MIME as readonly string[]).includes(type))
    throw AppError.badRequest('Only MP4, MOV or WebM videos are allowed');
  const size = Number(req.headers['content-length']);
  const maxBytes = env.MAX_VIDEO_MB * 1024 * 1024;
  if (!Number.isFinite(size) || size <= 0)
    throw new AppError(411, 'length_required', 'Missing file size');
  if (size > maxBytes)
    throw new AppError(413, 'too_large', `That video is larger than ${env.MAX_VIDEO_MB} MB`);

  const rawName = String(req.headers['x-file-name'] ?? '');
  const title =
    safeDecode(rawName)
      .replace(/[^\w .()-]/g, '')
      .slice(0, 100) || 'Listing video';
  const guard = new VideoGuard(maxBytes);
  let failure: unknown;
  guard.once('error', (e) => (failure = e));
  req.once('error', (e) => guard.destroy(e));
  try {
    const videoUrl = await store.upload(req.pipe(guard), size, title);
    await audit(adminId(req), 'video.upload', 'video', undefined, { bytes: size });
    res.status(201).json({ data: { videoUrl } });
  } catch (err) {
    throw failure ?? err; // the guard's clear message (wrong type, too large) beats a generic upload error
  }
});
