import argon2 from 'argon2';
import { ADMIN_PASSWORD_MIN } from '../config/constants.js';

// A short denylist of the most common passwords; the length floor does the rest.
const COMMON = new Set([
  'password',
  'password1',
  'password123',
  '123456789012',
  'qwertyuiop12',
  'administrator',
  'letmein12345',
  'welcome12345',
  'changeme1234',
  'iloveyou1234',
  'admin1234567',
  'passw0rd1234',
]);

/** Returns an error message, or null when the password is acceptable. */
export function passwordProblem(pw: string, ...related: string[]): string | null {
  if (pw.length < ADMIN_PASSWORD_MIN)
    return `Password must be at least ${ADMIN_PASSWORD_MIN} characters`;
  if (pw.length > 200) return 'Password too long';
  const lower = pw.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(pw)) return 'Password is too common';
  if (related.some((r) => r && lower.includes(r.toLowerCase())))
    return 'Password must not contain your name or email';
  return null;
}

const OPTS = { type: argon2.argon2id } as const;
export const hashPassword = (pw: string) => argon2.hash(pw, OPTS);
export const verifyPassword = (hash: string, pw: string) =>
  argon2.verify(hash, pw).catch(() => false);

// Verified against when the account doesn't exist, so response time doesn't reveal it.
let dummy: Promise<string> | undefined;
export const dummyVerify = async (pw: string) => {
  dummy ??= hashPassword('dummy-password-for-timing');
  await verifyPassword(await dummy, pw);
};
