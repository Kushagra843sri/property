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

export const signupSchema = z.object({
  name,
  email,
  phone,
  consent: z.boolean().refine((v) => v, { message: 'Please tick the box to continue' }),
});

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, 'Enter your email or phone number')
    .max(254)
    .refine((v) => (v.includes('@') ? email.safeParse(v).success : phone.safeParse(v).success), {
      message: 'Enter a valid email or phone number',
    }),
});

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
