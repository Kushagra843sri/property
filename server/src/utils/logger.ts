import pino from 'pino';
import { env } from '../config/env.js';

// Redact anything that could carry PII or credentials, wherever it appears.
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.otp',
      '*.code',
      '*.token',
      '*.phone',
      '*.email',
    ],
    censor: '[redacted]',
  },
  ...(env.NODE_ENV === 'development' && { transport: { target: 'pino-pretty' } }),
});
