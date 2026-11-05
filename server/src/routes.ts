import { Router } from 'express';
import { authRouter } from './modules/auth/routes.js';
import { enquiriesRouter } from './modules/enquiries/routes.js';
import { interestsRouter } from './modules/interests/routes.js';
import { propertiesRouter } from './modules/properties/routes.js';
import { meRouter } from './modules/users/routes.js';
import { adminRouter } from './modules/admin/routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok' } });
});
apiRouter.use('/auth', authRouter);
apiRouter.use('/properties', interestsRouter); // POST/DELETE /:id/interest
apiRouter.use('/properties', propertiesRouter);
apiRouter.use('/enquiries', enquiriesRouter);
apiRouter.use('/me', meRouter);
apiRouter.use('/admin', adminRouter);
