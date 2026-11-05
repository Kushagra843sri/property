import {
  CONSENT_VERSION,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
} from '../../config/constants.js';
import { Otp } from '../../models/otp.js';
import { User } from '../../models/user.js';
import { getMailer } from '../../providers/mailer.js';
import { getSms } from '../../providers/sms.js';
import { logger } from '../../utils/logger.js';
import { generateOtp, hashOtp, otpMatches } from '../../utils/otp.js';
import { dummyVerify, verifyPassword } from '../../utils/password.js';
import { maskEmail, maskPhone, normalizeEmail, normalizePhone } from '../../utils/phone.js';
import type { SignupBody } from './schema.js';

type Channel = 'email' | 'phone';
type UserLike = { email: string; phone: string };

/** Classify and normalize a login identifier. Returns null if it is neither a valid email nor phone. */
export function parseIdentifier(raw: string): { channel: Channel; value: string } | null {
  if (raw.includes('@')) {
    const value = normalizeEmail(raw);
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? { channel: 'email', value } : null;
  }
  const value = normalizePhone(raw);
  return value ? { channel: 'phone', value } : null;
}

/**
 * Create and deliver an OTP. Returns false (and sends nothing) while the resend cooldown is active.
 * Delivery failures are logged, not thrown: the response must not reveal whether an account exists.
 */
export async function issueOtp(channel: Channel, identifier: string): Promise<boolean> {
  const existing = await Otp.findOne({ identifier }).select('lastSentAt').lean();
  if (existing && Date.now() - existing.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) return false;

  const code = generateOtp();
  await Otp.findOneAndUpdate(
    { identifier },
    {
      channel,
      codeHash: hashOtp(identifier, code),
      attempts: 0,
      lastSentAt: new Date(),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
    { upsert: true },
  );

  const text = `Your verification code is ${code}. It expires in ${OTP_TTL_MS / 60000} minutes.`;
  try {
    if (channel === 'email') {
      await getMailer().send({ to: identifier, subject: 'Your verification code', text });
    } else {
      await getSms().send({ to: identifier, body: text });
    }
  } catch (err) {
    logger.error(
      { err, to: channel === 'email' ? maskEmail(identifier) : maskPhone(identifier) },
      'otp delivery failed',
    );
  }
  return true;
}

const pick = (u: UserLike, channel: Channel) => (channel === 'email' ? u.email : u.phone);

/**
 * Signup. Always resolves the same way whether or not the email/phone is already registered
 * (no enumeration): new users are created with consent recorded; known users just get a login OTP.
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
      if ((err as { code?: number }).code !== 11000) throw err;
      return;
    }
    await issueOtp(input.channel, pick(input, input.channel));
    return;
  }
  // Only the exact same person (both identifiers match) gets a code; a partial match gets nothing.
  if (
    existing.role === 'user' &&
    existing.email === input.email &&
    existing.phone === input.phone
  ) {
    await issueOtp(input.channel, pick(input, input.channel));
  }
}

/** Login OTP request. Silent when the user does not exist (or is an admin, who uses a password). */
export async function requestLoginOtp(rawIdentifier: string): Promise<void> {
  const id = parseIdentifier(rawIdentifier);
  if (!id) return;
  const user = await User.findOne(
    id.channel === 'email' ? { email: id.value } : { phone: id.value },
  )
    .select('role')
    .lean();
  if (!user || user.role !== 'user') return;
  await issueOtp(id.channel, id.value);
}

/** Verify an OTP. Returns the user id on success, null on any failure (single generic outcome). */
export async function verifyOtp(rawIdentifier: string, code: string): Promise<string | null> {
  const id = parseIdentifier(rawIdentifier);
  if (!id) return null;

  // Atomically spend an attempt; null if missing, expired or out of attempts.
  const otp = await Otp.findOneAndUpdate(
    { identifier: id.value, expiresAt: { $gt: new Date() }, attempts: { $lt: OTP_MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { new: true },
  );
  if (!otp || !otpMatches(id.value, code, otp.codeHash)) return null;

  // Single-use: only the request that deletes the record wins.
  const spent = await Otp.deleteOne({ _id: otp._id });
  if (spent.deletedCount !== 1) return null;

  const user = await User.findOneAndUpdate(
    { role: 'user', ...(id.channel === 'email' ? { email: id.value } : { phone: id.value }) },
    { $set: id.channel === 'email' ? { emailVerified: true } : { phoneVerified: true } },
    { new: true },
  );
  return user ? String(user._id) : null;
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
