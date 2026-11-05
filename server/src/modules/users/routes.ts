import { Router } from 'express';
import { z } from 'zod';
import { COOKIE_REFRESH, CONSENT_VERSION } from '../../config/constants.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { Interest } from '../../models/interest.js';
import { RefreshToken } from '../../models/refreshToken.js';
import { User } from '../../models/user.js';
import { AppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { paginationShape } from '../../utils/pagination.js';
import { publicUser } from '../auth/controller.js';
import { clearSessionCookies } from '../auth/tokens.js';
import { listMyInterests } from '../interests/service.js';

export const meRouter = Router();
meRouter.use(requireAuth);

const patchBody = z
  .object({ name: z.string().trim().min(2).max(100).optional(), consent: z.boolean().optional() })
  .strict()
  .refine((b) => b.name !== undefined || b.consent !== undefined, { message: 'Nothing to update' });

meRouter.get(
  '/interests',
  validate({ query: z.object(paginationShape).strict() }),
  async (req, res) => {
    const { page, limit } = req.validated.query as { page: number; limit: number };
    const { items, meta } = await listMyInterests(req.auth!.userId, page, limit);
    res.json({ data: items, meta });
  },
);

// Withdrawing consent keeps the account (so the user can log back in and re-consent or delete it)
// but marks it `withdrawn`: it is excluded from lead exports and cannot register new interests.
meRouter.patch('/', validate({ body: patchBody }), async (req, res) => {
  const b = req.validated.body as z.infer<typeof patchBody>;
  const set: Record<string, unknown> = {};
  if (b.name !== undefined) set.name = b.name;
  if (b.consent === false) {
    set.status = 'withdrawn';
    set['consent.given'] = false;
    set['consent.at'] = new Date();
  } else if (b.consent === true) {
    set.status = 'active';
    set['consent.given'] = true;
    set['consent.at'] = new Date();
    set['consent.version'] = CONSENT_VERSION;
  }
  const user = await User.findByIdAndUpdate(
    req.auth!.userId,
    { $set: set },
    { returnDocument: 'after' },
  );
  if (!user) throw AppError.unauthorized();
  logger.info({ userId: String(user._id), consent: b.consent }, 'profile updated');
  res.json({ data: { user: publicUser(user) } });
});

// Permanent self-deletion of the account, its interests and sessions.
meRouter.delete('/', async (req, res) => {
  if (req.auth!.role === 'admin') throw AppError.forbidden('Admin accounts cannot be self-deleted');
  const id = req.auth!.userId;
  await Promise.all([
    Interest.deleteMany({ user: id }),
    RefreshToken.deleteMany({ user: id }),
    User.deleteOne({ _id: id }),
  ]);
  clearSessionCookies(res);
  logger.info({ userId: id, hadRefresh: !!req.cookies?.[COOKIE_REFRESH] }, 'account deleted');
  res.json({ data: { deleted: true } });
});
