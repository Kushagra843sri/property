import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { CookieOptions, Response } from 'express';
import { env, isProd } from '../../config/env.js';
import {
  ACCESS_TOKEN_TTL_SEC,
  COOKIE_ACCESS,
  COOKIE_CSRF,
  COOKIE_REFRESH,
  REFRESH_TOKEN_TTL_SEC,
} from '../../config/constants.js';
import { RefreshToken } from '../../models/refreshToken.js';
import type { Role } from '../../models/user.js';

const accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export async function signAccessToken(userId: string, role: Role): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SEC}s`)
    .sign(accessKey);
}

export async function verifyAccessToken(
  token: string,
): Promise<{ userId: string; role: Role } | null> {
  try {
    const { payload } = await jwtVerify(token, accessKey, { algorithms: ['HS256'] });
    if (!payload.sub || (payload.role !== 'user' && payload.role !== 'admin')) return null;
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

const hashRefresh = (raw: string) =>
  createHmac('sha256', env.JWT_REFRESH_SECRET).update(raw).digest('hex');

export type RefreshResult =
  { ok: true; userId: string; newToken: string } | { ok: false; reason: 'invalid' | 'reused' };

/** Create a refresh token (new family, or continuing `family` on rotation). Returns the raw token. */
export async function issueRefreshToken(userId: string, family: string = randomUUID()) {
  const raw = randomBytes(48).toString('base64url');
  await RefreshToken.create({
    user: userId,
    tokenHash: hashRefresh(raw),
    family,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000),
  });
  return raw;
}

/** Rotate: the presented token is revoked atomically; replaying a revoked one kills the family. */
export async function rotateRefreshToken(raw: string): Promise<RefreshResult> {
  const hash = hashRefresh(raw);
  const claimed = await RefreshToken.findOneAndUpdate(
    { tokenHash: hash, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date() } },
  );
  if (claimed) {
    const newToken = await issueRefreshToken(String(claimed.user), claimed.family);
    return { ok: true, userId: String(claimed.user), newToken };
  }
  const existing = await RefreshToken.findOne({ tokenHash: hash });
  if (existing?.revokedAt) {
    await RefreshToken.updateMany({ family: existing.family }, { $set: { revokedAt: new Date() } });
    return { ok: false, reason: 'reused' };
  }
  return { ok: false, reason: 'invalid' };
}

export async function revokeRefreshFamily(raw: string): Promise<void> {
  const t = await RefreshToken.findOne({ tokenHash: hashRefresh(raw) });
  if (t) await RefreshToken.updateMany({ family: t.family }, { $set: { revokedAt: new Date() } });
}

export const revokeAllForUser = (userId: string) =>
  RefreshToken.updateMany(
    { user: userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );

const base: CookieOptions = {
  secure: isProd,
  sameSite: 'lax',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

export function setSessionCookies(res: Response, access: string, refresh: string) {
  res.cookie(COOKIE_ACCESS, access, {
    ...base,
    httpOnly: true,
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_SEC * 1000,
  });
  res.cookie(COOKIE_REFRESH, refresh, {
    ...base,
    httpOnly: true,
    path: '/api/v1/auth',
    maxAge: REFRESH_TOKEN_TTL_SEC * 1000,
  });
  // Readable by the client's JS on purpose (double-submit CSRF token); carries no authority alone.
  res.cookie(COOKIE_CSRF, randomBytes(24).toString('base64url'), {
    ...base,
    httpOnly: false,
    path: '/',
    maxAge: REFRESH_TOKEN_TTL_SEC * 1000,
  });
}

export function clearSessionCookies(res: Response) {
  res.clearCookie(COOKIE_ACCESS, { ...base, httpOnly: true, path: '/' });
  res.clearCookie(COOKIE_REFRESH, { ...base, httpOnly: true, path: '/api/v1/auth' });
  res.clearCookie(COOKIE_CSRF, { ...base, path: '/' });
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
