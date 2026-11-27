import type { Request, RequestHandler, Response } from 'express';
import { COOKIE_REFRESH } from '../../config/constants.js';
import { User, type Role } from '../../models/user.js';
import { googleEnabled } from '../../providers/google.js';
import { AppError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { userPasswordProblem } from '../../utils/password.js';
import {
  clearSessionCookies,
  issueRefreshToken,
  revokeRefreshFamily,
  rotateRefreshToken,
  setSessionCookies,
  signAccessToken,
} from './tokens.js';
import * as service from './service.js';
import type {
  AdminLoginBody,
  GoogleBody,
  LoginBody,
  OtpRequestBody,
  OtpVerifyBody,
  SignupBody,
} from './schema.js';

const body = <T>(req: Request) => req.validated.body as T;
const GENERIC_BAD_CODE = 'Invalid or expired code';

async function startSession(res: Response, userId: string, role: Role) {
  setSessionCookies(res, await signAccessToken(userId, role), await issueRefreshToken(userId));
}

export const publicUser = (u: {
  _id: unknown;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: string;
  consent?: { given?: boolean | null } | null;
}) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  phone: u.phone ?? null,
  role: u.role,
  emailVerified: u.emailVerified,
  phoneVerified: u.phoneVerified,
  status: u.status,
  consentGiven: !!u.consent?.given,
});

export const signup: RequestHandler = async (req, res) => {
  const b = body<SignupBody>(req);
  if (!b.website) await service.signup(b, req.ip);
  res.status(202).json({ data: { sent: true } });
};

export const otpRequest: RequestHandler = async (req, res) => {
  const b = body<OtpRequestBody>(req);
  if (!b.website) await service.requestLoginOtp(b.identifier);
  res.status(202).json({ data: { sent: true } });
};

export const otpVerify: RequestHandler = async (req, res) => {
  const b = body<OtpVerifyBody>(req);
  // Checked before the code is spent, so a weak password does not burn the user's code.
  if (b.password) {
    const email = service.parseEmail(b.identifier) ?? '';
    const problem = userPasswordProblem(b.password, email.split('@')[0] ?? '', email);
    // Same `details` shape the validation middleware produces, so the form can show it on the field.
    if (problem) throw AppError.badRequest(problem, [{ path: 'body.password', message: problem }]);
  }
  const userId = await service.verifyOtp(b.identifier, b.code, b.password);
  if (!userId) throw AppError.badRequest(GENERIC_BAD_CODE);
  const user = await User.findById(userId);
  if (!user) throw AppError.badRequest(GENERIC_BAD_CODE);
  await startSession(res, userId, user.role);
  logger.info({ userId }, 'user logged in');
  res.json({ data: { user: publicUser(user) } });
};

export const login: RequestHandler = async (req, res) => {
  const b = body<LoginBody>(req);
  const userId = await service.passwordLogin(b.email, b.password);
  if (!userId) throw AppError.unauthorized('Invalid email or password');
  const user = await User.findById(userId);
  if (!user) throw AppError.unauthorized('Invalid email or password');
  await startSession(res, userId, user.role);
  logger.info({ userId }, 'user logged in');
  res.json({ data: { user: publicUser(user) } });
};

export const google: RequestHandler = async (req, res) => {
  if (!googleEnabled()) throw new AppError(503, 'unavailable', 'Google sign-in is not available');
  const b = body<GoogleBody>(req);
  const userId = await service.googleLogin(b.credential, b.consent, req.ip);
  const user = await User.findById(userId);
  if (!user) throw AppError.unauthorized('Google sign-in failed');
  await startSession(res, userId, user.role);
  logger.info({ userId }, 'user logged in with google');
  res.json({ data: { user: publicUser(user) } });
};

export const adminLogin: RequestHandler = async (req, res) => {
  const b = body<AdminLoginBody>(req);
  const adminId = await service.adminLogin(b.email, b.password);
  if (!adminId) throw AppError.unauthorized('Invalid credentials');
  const user = await User.findById(adminId);
  if (!user) throw AppError.unauthorized('Invalid credentials');
  await startSession(res, adminId, 'admin');
  logger.info({ adminId }, 'admin logged in');
  res.json({ data: { user: publicUser(user) } });
};

export const refresh: RequestHandler = async (req, res) => {
  const raw = req.cookies?.[COOKIE_REFRESH];
  if (typeof raw !== 'string') throw AppError.unauthorized();
  const result = await rotateRefreshToken(raw);
  if (!result.ok) {
    clearSessionCookies(res);
    if (result.reason === 'reused') logger.warn('refresh token reuse detected; family revoked');
    throw AppError.unauthorized();
  }
  const user = await User.findById(result.userId);
  if (!user) {
    clearSessionCookies(res);
    throw AppError.unauthorized();
  }
  setSessionCookies(res, await signAccessToken(result.userId, user.role), result.newToken);
  res.json({ data: { user: publicUser(user) } });
};

export const logout: RequestHandler = async (req, res) => {
  const raw = req.cookies?.[COOKIE_REFRESH];
  if (typeof raw === 'string') await revokeRefreshFamily(raw);
  clearSessionCookies(res);
  res.json({ data: { loggedOut: true } });
};

export const me: RequestHandler = async (req, res) => {
  const user = await User.findById(req.auth?.userId);
  if (!user) throw AppError.unauthorized();
  res.json({ data: { user: publicUser(user) } });
};
