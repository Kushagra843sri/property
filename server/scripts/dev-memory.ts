/**
 * Local demo/E2E server: an in-memory MongoDB, the real API, seeded sample data, and a tiny
 * "outbox" endpoint so tests (and you) can read the one-time codes that would have been emailed.
 *
 *   npm run dev:memory
 *
 * DEVELOPMENT ONLY. It forces NODE_ENV=development with the console mail/SMS adapters and refuses to
 * run otherwise. The outbox endpoint exposes OTPs, so it binds to 127.0.0.1 and never ships.
 */
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';

if (process.env.NODE_ENV === 'production')
  throw new Error('dev-memory must never run in production');

const mongod = await MongoMemoryServer.create();
const port = Number(process.env.PORT ?? 4000);
Object.assign(process.env, {
  NODE_ENV: 'development',
  PORT: String(port),
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'warn',
  MONGODB_URI: `${mongod.getUri()}property_demo`,
  CORS_ORIGINS: process.env.CORS_ORIGINS ?? 'http://localhost:3000',
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:3000',
  JWT_ACCESS_SECRET: randomBytes(32).toString('hex'),
  JWT_REFRESH_SECRET: randomBytes(32).toString('hex'),
  MAIL_PROVIDER: 'console',
  SMS_PROVIDER: 'console',
  IMAGE_PROVIDER: 'mock',
  DEALER_NOTIFY_EMAIL: 'dealer@example.com',
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'demo-admin-passphrase-1';

const { createApp } = await import('../src/app.js');
const { connectDb } = await import('../src/config/db.js');
const { runSeed } = await import('../src/seed.js');
const { outbox } = await import('../src/providers/mailer.js');
const { smsOutbox } = await import('../src/providers/sms.js');

await connectDb();
await runSeed(ADMIN_EMAIL, ADMIN_PASSWORD);

createApp().listen(port, () => {
  console.info(
    `API on http://localhost:${port}/api/v1  (admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD})`,
  );
});

createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/outbox') return void res.end(JSON.stringify({ mail: outbox, sms: smsOutbox }));
  res.statusCode = 404;
  res.end('{}');
}).listen(port + 1, '127.0.0.1', () =>
  console.info(`Outbox on http://127.0.0.1:${port + 1}/outbox`),
);

const stop = async () => {
  await mongod.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
