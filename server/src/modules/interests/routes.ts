import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { interestLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { objectId } from '../../utils/zod.js';
import * as service from './service.js';

const params = z.object({ id: objectId }).strict();
const idOf = (req: { validated: { params?: unknown } }) =>
  (req.validated.params as { id: string }).id;

// Mounted at /properties
export const interestsRouter = Router();

interestsRouter.post(
  '/:id/interest',
  requireAuth,
  interestLimiter,
  validate({ params }),
  async (req, res) => {
    const out = await service.addInterest(req.auth!.userId, idOf(req));
    res.json({ data: { interested: out.interested } });
  },
);

interestsRouter.delete(
  '/:id/interest',
  requireAuth,
  interestLimiter,
  validate({ params }),
  async (req, res) => {
    res.json({ data: await service.removeInterest(req.auth!.userId, idOf(req)) });
  },
);
