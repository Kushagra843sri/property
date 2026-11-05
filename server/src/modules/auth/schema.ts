import { z } from 'zod';
import { OTP_LENGTH } from '../../config/constants.js';
import { normalizeEmail, normalizePhone } from '../../utils/phone.js';

const email = z.string().trim().max(254).email().transform(normalizeEmail);

const phone = z
  .string()
  .trim()
  .max(20)
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) ctx.addIssue({ code: 'custom', message: 'Invalid phone number' });
    return n ?? '';
  });

export const signupBody = z
  .object({
    name: z.string().trim().min(2).max(100),
    email,
    phone,
    // Explicit consent is mandatory: the literal `true`, never defaulted.
    consent: z.literal(true, { error: 'Consent is required to sign up' }),
    channel: z.enum(['email', 'phone']).default('email'),
    website: z.string().max(200).optional(), // honeypot, real users never fill it
  })
  .strict();

export const otpRequestBody = z
  .object({
    identifier: z.string().trim().min(3).max(254),
    website: z.string().max(200).optional(),
  })
  .strict();

export const otpVerifyBody = z
  .object({
    identifier: z.string().trim().min(3).max(254),
    code: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), 'Invalid code'),
  })
  .strict();

export const adminLoginBody = z.object({ email, password: z.string().min(1).max(200) }).strict();

export type SignupBody = z.infer<typeof signupBody>;
export type OtpRequestBody = z.infer<typeof otpRequestBody>;
export type OtpVerifyBody = z.infer<typeof otpVerifyBody>;
export type AdminLoginBody = z.infer<typeof adminLoginBody>;
