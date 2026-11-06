import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { usesSharedRateLimitStore } from './config/rateLimitStore.js';
import { logger } from './utils/logger.js';

async function main() {
  if (env.NODE_ENV === 'production' && !usesSharedRateLimitStore()) {
    logger.warn('rate limiter uses the in-memory store: only correct with a single API instance');
  }
  await connectDb();
  const server = createApp().listen(env.PORT, () =>
    logger.info({ port: env.PORT }, 'api listening'),
  );

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(() => {
      void disconnectDb().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ err }, 'startup failed');
  process.exit(1);
});
