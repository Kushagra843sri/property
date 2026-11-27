import { z } from 'zod';

/** Loose client-side phone check; the server normalizes to E.164 and is the authority. */
const phone = z
  .string()
  .trim()
  .refine((v) => /^\+?[\d\s().-]{10,18}$/.test(v) && v.replace(/\D/g, '').length >= 10, {
    message: 'Enter a valid phone number',
  });

const email = z.string().trim().max(254).email('Enter a valid email address');
const name = z.string().trim().min(2, 'Enter your full name').max(100, 'That name is too long');

/** Matches the server floor (SECURITY.md); the server also rejects common/related passwords. */
export const PASSWORD_MIN = 8;
const newPassword = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(200, 'That password is too long');

export const signupSchema = z.object({
  name,
  email,
  phone,
  password: newPassword,
  consent: z.boolean().refine((v) => v, { message: 'Please tick the box to continue' }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(200),
});

/** "Forgot password": the new password is held in memory and sent together with the emailed code. */
export const forgotSchema = z.object({ email, password: newPassword });

export const phoneSchema = z.object({ phone });

export const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export const enquirySchema = z.object({
  name,
  email,
  phone,
  message: z
    .string()
    .trim()
    .min(5, 'Please write a short message')
    .max(2000, 'Message is too long'),
});

export type FieldErrors = Record<string, string>;

/** Flatten Zod issues to { field: firstMessage }. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    out[key] ??= issue.message;
  }
  return out;
}

/** Map server `details[]` ("body.email") onto field names. */
export function serverFieldErrors(details?: { path: string; message: string }[]): FieldErrors {
  const out: FieldErrors = {};
  for (const d of details ?? [])
    out[d.path.replace(/^body\./, '').split('.')[0] ?? '_'] ??= d.message;
  return out;
}
