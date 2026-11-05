import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import { API_PREFIX, BODY_LIMIT } from './config/constants.js';
import { env } from './config/env.js';
import { corsMiddleware } from './config/cors.js';
import { helmetMiddleware } from './config/helmet.js';
import { logger } from './utils/logger.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { sanitize } from './middleware/sanitize.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiRouter } from './routes.js';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = randomUUID();
        res.setHeader('X-Request-Id', id);
        void req;
        return id;
      },
      // Log method/url/status only; headers (cookies) and bodies never enter the logs.
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: String(req.url).split('?')[0] }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(globalLimiter);
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(cookieParser());
  app.use(sanitize);
  app.use(csrfProtection);

  app.use(API_PREFIX, apiRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
