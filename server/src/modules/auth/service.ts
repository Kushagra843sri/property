import {
  CONSENT_VERSION,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
} from '../../config/constants.js';
import { Otp } from '../../models/otp.js';
import { User } from '../../models/user.js';
import { getMailer } from '../../providers/mailer.js';
import { verifyGoogle } from '../../providers/google.js';
import { AppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { generateOtp, hashOtp, otpMatches } from '../../utils/otp.js';
import { dummyVerify, hashPassword, verifyPassword } from '../../utils/password.js';
import { maskEmail, normalizeEmail } from '../../utils/phone.js';
import type { SignupBody } from './schema.js';

const isDuplicateKey = (err: unknown) => (err as { code?: number }).code === 11000;

/** Normalize a login identifier. Returns null if it is not a valid email. */
export function parseEmail(raw: string): string | null {
  const value = normalizeEmail(raw);
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? value : null;
}

/**
 * Create and email an OTP. Returns false (and sends nothing) while the resend cooldown is active.
 * Delivery failures are logged, not thrown: the response must not reveal whether an account exists.
 */
export async function issueOtp(email: string): Promise<boolean> {
  const existing = await Otp.findOne({ identifier: email }).select('lastSentAt').lean();
  if (existing && Date.now() - existing.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) return false;

  const code = generateOtp();
  await Otp.findOneAndUpdate(
    { identifier: email },
    {
      channel: 'email',
      codeHash: hashOtp(email, code),
      attempts: 0,
      lastSentAt: new Date(),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
    { upsert: true },
  );

  const text = `Your verification code is ${code}. It expires in ${OTP_TTL_MS / 60000} minutes.`;
  try {
    await getMailer().send({ to: email, subject: 'Your verification code', text });
  } catch (err) {
    logger.error({ err, to: maskEmail(email) }, 'otp delivery failed');
  }
  return true;
}

/**
 * Signup. Always resolves the same way whether or not the email/phone is already registered
 * (no enumeration): new users are created with consent recorded; known users just get a code.
 * No password is stored here: it is set only when the emailed code is verified (see verifyOtp).
 */
export async function signup(input: SignupBody, ip?: string): Promise<void> {
  const existing = await User.findOne({ $or: [{ email: input.email }, { phone: input.phone }] })
    .select('email phone role')
    .lean();

  if (!existing) {
    try {
      await User.create({
        name: input.name,
        email: input.email,
        phone: input.phone,
        consent: { given: true, at: new Date(), version: CONSENT_VERSION, ip },
      });
    } catch (err) {
      // A concurrent signup won the unique index: treat as "already registered".
      if (!isDuplicateKey(err)) throw err;
      return;
    }
    await issueOtp(input.email);
    return;
  }
  // Only the exact same person (both identifiers match) gets a code; a partial match gets nothing.
  if (
    existing.role === 'user' &&
    existing.email === input.email &&
    existing.phone === input.phone
  ) {
    await issueOtp(input.email);
  }
}

/** Emails a code to a known user (sign-in by code / forgot password). Silent for unknown emails and admins. */
export async function requestLoginOtp(rawEmail: string): Promise<void> {
  const email = parseEmail(rawEmail);
  if (!email) return;
  const user = await User.findOne({ email }).select('role').lean();
  if (!user || user.role !== 'user') return;
  await issueOtp(email);
}

/**
 * Verify an OTP. Returns the user id on success, null on any failure (single generic outcome).
 * With `password`, also stores its hash: the code just proved the caller owns the inbox, so this is
 * safe for both first sign-up and "forgot password", and nobody can pre-claim someone else's email.
 */
export async function verifyOtp(
  rawEmail: string,
  code: string,
  password?: string,
): Promise<string | null> {
  const email = parseEmail(rawEmail);
  if (!email) return null;

  // Atomically spend an attempt; null if missing, expired or out of attempts.
  const otp = await Otp.findOneAndUpdate(
    { identifier: email, expiresAt: { $gt: new Date() }, attempts: { $lt: OTP_MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { returnDocument: 'after' },
  );
  if (!otp || !otpMatches(email, code, otp.codeHash)) return null;

  // Single-use: only the request that deletes the record wins.
  const spent = await Otp.deleteOne({ _id: otp._id });
  if (spent.deletedCount !== 1) return null;

  const user = await User.findOneAndUpdate(
    { role: 'user', email },
    {
      $set: {
        emailVerified: true,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
    },
    { returnDocument: 'after' },
  );
  return user ? String(user._id) : null;
}

/** Email + password login for end users. One generic failure; timing flattened for unknown emails. */
export async function passwordLogin(email: string, password: string): Promise<string | null> {
  const user = await User.findOne({ email, role: 'user' }).select('+passwordHash');
  if (!user?.passwordHash) {
    await dummyVerify(password);
    return null;
  }
  const ok = await verifyPassword(user.passwordHash, password);
  return ok && user.emailVerified ? String(user._id) : null;
}

/**
 * Google sign-in. The token must be valid for our client ID and the email must be verified by Google.
 * Existing users are matched by Google id or email (and marked verified); admins are never linked.
 * A brand-new account needs explicit consent, same as the password sign-up.
 */
export async function googleLogin(
  credential: string,
  consent: boolean | undefined,
  ip?: string,
): Promise<string> {
  const g = await verifyGoogle(credential);
  if (!g?.emailVerified) throw AppError.unauthorized('Google sign-in failed');
  const email = normalizeEmail(g.email);

  const find = () =>
    User.findOne({ $or: [{ googleSub: g.sub }, { email }] }).select('+googleSub role');
  let user = await find();

  if (user) {
    if (user.role !== 'user' || (user.googleSub && user.googleSub !== g.sub))
      throw AppError.unauthorized('Google sign-in failed');
    if (!user.googleSub || !user.emailVerified) {
      user.googleSub = g.sub;
      user.emailVerified = true;
      await user.save();
    }
    return String(user._id);
  }

  if (consent !== true)
    throw new AppError(400, 'consent_required', 'Please accept the consent to create an account');
  try {
    user = await User.create({
      name: (g.name.trim() || email.split('@')[0]!).slice(0, 100),
      email,
      googleSub: g.sub,
      emailVerified: true,
      consent: { given: true, at: new Date(), version: CONSENT_VERSION, ip },
    });
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    user = await find(); // concurrent first sign-in won the unique index
    if (!user || user.role !== 'user') throw AppError.unauthorized('Google sign-in failed');
  }
  return String(user._id);
}

/** Admin password login. Returns the admin's id or null; timing is flattened for unknown emails. */
export async function adminLogin(email: string, password: string): Promise<string | null> {
  const admin = await User.findOne({ email, role: 'admin' }).select('+passwordHash');
  if (!admin?.passwordHash) {
    await dummyVerify(password);
    return null;
  }
  return (await verifyPassword(admin.passwordHash, password)) ? String(admin._id) : null;
}
