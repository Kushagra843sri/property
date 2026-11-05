import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { imageUpload } from '../../middleware/upload.js';
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
