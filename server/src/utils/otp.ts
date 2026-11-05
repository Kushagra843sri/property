import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { OTP_LENGTH } from '../config/constants.js';

export const generateOtp = (): string =>
  randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, '0');

// HMAC (keyed) rather than a bare hash: a 6-digit code is trivially brute-forced if the DB leaks
// and the hash is unkeyed.
export const hashOtp = (identifier: string, code: string): string =>
  createHmac('sha256', env.JWT_REFRESH_SECRET).update(`${identifier}:${code}`).digest('hex');

export function otpMatches(identifier: string, code: string, hash: string): boolean {
  const a = Buffer.from(hashOtp(identifier, code));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}
