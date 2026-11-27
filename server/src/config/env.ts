import 'dotenv/config';
import { z } from 'zod';

const csv = z
  .string()
  .min(1)
  .transform((s) =>
    s
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  );

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    MONGODB_URI: z.string().min(1),
    CORS_ORIGINS: csv,
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    COOKIE_DOMAIN: z.string().optional(),
    // Public site URL used in dealer notification links; defaults to the first CORS origin.
    CLIENT_URL: z.string().url().optional(),

    // Provider adapters. `console` / `mock` are development-only fallbacks.
    MAIL_PROVIDER: z.enum(['console', 'resend']).default('console'),
    RESEND_API_KEY: z.string().optional(),
    MAIL_FROM: z.string().optional(),
    DEALER_NOTIFY_EMAIL: z.string().email().optional(),

    // Optional: when unset, Google sign-in is simply unavailable (never a startup failure).
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),

    IMAGE_PROVIDER: z.enum(['mock', 'cloudinary']).default('mock'),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    CLOUDINARY_FOLDER: z.string().default('properties'),
  })
  .superRefine((env, ctx) => {
    const need = (cond: boolean, path: string, msg: string) =>
      cond || ctx.addIssue({ code: 'custom', path: [path], message: msg });

    if (env.MAIL_PROVIDER === 'resend') {
      need(!!env.RESEND_API_KEY, 'RESEND_API_KEY', 'required when MAIL_PROVIDER=resend');
      need(!!env.MAIL_FROM, 'MAIL_FROM', 'required when MAIL_PROVIDER=resend');
    }
    if (env.IMAGE_PROVIDER === 'cloudinary') {
      for (const k of [
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET',
      ] as const)
        need(!!env[k], k, 'required when IMAGE_PROVIDER=cloudinary');
    }
    if (env.NODE_ENV === 'production') {
      need(
        env.MAIL_PROVIDER !== 'console',
        'MAIL_PROVIDER',
        'console mailer is forbidden in production',
      );
      need(
        env.IMAGE_PROVIDER !== 'mock',
        'IMAGE_PROVIDER',
        'mock image store is forbidden in production',
      );
      need(!!env.DEALER_NOTIFY_EMAIL, 'DEALER_NOTIFY_EMAIL', 'required in production');
      need(!env.CORS_ORIGINS.includes('*'), 'CORS_ORIGINS', 'wildcard origin is forbidden');
      need(env.TRUST_PROXY > 0, 'TRUST_PROXY', 'set the number of proxy hops in production');
    }
  });

export type Env = z.infer<typeof schema>;

/** Parse and validate; throws a readable error listing every problem (never values). */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
