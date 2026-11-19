import { Router, type Request } from 'express';
import { validate } from '../../middleware/validate.js';
import { listQuery, slugParams, type ListQuery } from './schema.js';
import { listAreas } from './areas.js';
import * as service from './service.js';

export const propertiesRouter = Router();

propertiesRouter.get('/', validate({ query: listQuery }), async (req: Request, res) => {
  const { items, meta } = await service.listPublic(req.validated.query as ListQuery);
  res.json({ data: items, meta });
});

propertiesRouter.get('/areas', async (_req, res) => {
  res.json({ data: await listAreas() });
});

propertiesRouter.get('/:slug', validate({ params: slugParams }), async (req, res) => {
  const { slug } = req.validated.params as { slug: string };
  res.json({ data: await service.getPublicBySlug(slug) });
});
