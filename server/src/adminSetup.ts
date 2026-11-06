import { User } from './models/user.js';
import { hashPassword, passwordProblem } from './utils/password.js';
import { normalizeEmail } from './utils/phone.js';

/** The demo admin used by `npm run dev:memory`. It must never exist in a real deployment. */
export const DEMO_ADMIN_EMAIL = 'admin@example.com';
export const DEMO_ADMIN_PASSWORD = 'demo-admin-passphrase-1';

/** Pure check so it can be unit-tested for production without touching process.env. */
export function adminInputProblem(rawEmail: string, password: string, production: boolean) {
  const email = normalizeEmail(rawEmail);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'ADMIN_EMAIL must be a valid email address';
  const weak = passwordProblem(password, email);
  if (weak) return `ADMIN_PASSWORD rejected: ${weak}`;
  if (
    production &&
    (password === DEMO_ADMIN_PASSWORD ||
      email === DEMO_ADMIN_EMAIL ||
      email.endsWith('@example.com'))
  ) {
    return 'Demo or example credentials are not allowed in production';
  }
  return null;
}

/** Create or update the admin account. Never promotes an existing normal user. */
export async function createAdmin(rawEmail: string, password: string, production: boolean) {
  const problem = adminInputProblem(rawEmail, password, production);
  if (problem) throw new Error(problem);
  const email = normalizeEmail(rawEmail);

  const existing = await User.findOne({ email });
  if (existing && existing.role !== 'admin') {
    throw new Error('A non-admin user with that email already exists; refusing to promote it');
  }
  await User.updateOne(
    { email },
    {
      $set: { passwordHash: await hashPassword(password), role: 'admin', emailVerified: true },
      $setOnInsert: { name: 'Admin', phone: '+910000000000' },
    },
    { upsert: true },
  );
  return email;
}
