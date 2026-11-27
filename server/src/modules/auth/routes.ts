import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  adminLoginLimiter,
  authLimiter,
  loginLimiter,
  otpLimiter,
} from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import * as c from './controller.js';
import {
  adminLoginBody,
  googleBody,
  loginBody,
  otpRequestBody,
  otpVerifyBody,
  signupBody,
} from './schema.js';

export const authRouter = Router();

authRouter.post('/signup', authLimiter, validate({ body: signupBody }), c.signup);
authRouter.post('/login', loginLimiter, validate({ body: loginBody }), c.login);
authRouter.post('/google', loginLimiter, validate({ body: googleBody }), c.google);
authRouter.post('/otp/request', otpLimiter, validate({ body: otpRequestBody }), c.otpRequest);
authRouter.post('/otp/verify', otpLimiter, validate({ body: otpVerifyBody }), c.otpVerify);
authRouter.post('/refresh', authLimiter, c.refresh);
authRouter.post('/logout', authLimiter, c.logout);
authRouter.get('/me', requireAuth, c.me);
authRouter.post(
  '/admin/login',
  adminLoginLimiter,
  validate({ body: adminLoginBody }),
  c.adminLogin,
);
