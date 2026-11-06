/**
 * Creates (or resets the password of) the admin account from environment values.
 *
 *   ADMIN_EMAIL=owner@yourdomain.com ADMIN_PASSWORD='a long passphrase' npm run create-admin
 *
 * Safe for production: it creates only the admin, never sample data, and refuses demo credentials.
 */
import { env, isProd } from '../config/env.js';
import { connectDb, disconnectDb } from '../config/db.js';
import { createAdmin } from '../adminSetup.js';

try {
  await connectDb(env.MONGODB_URI);
  const email = await createAdmin(
    process.env.ADMIN_EMAIL ?? '',
    process.env.ADMIN_PASSWORD ?? '',
    isProd,
  );
  console.info(`Admin ready: ${email}`);
  await disconnectDb();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
