import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const notFound: RequestHandler = (_req, _res, next) => next(AppError.notFound());

type BodyParserError = Error & { status?: number; type?: string };

/** Single exit for errors. Clients get a code, a generic message and the request id; never a stack. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = String(req.id ?? '');
  let status = 500;
  let code = 'internal_error';
  let message = 'Something went wrong';
  let details: unknown;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if ((err as BodyParserError).type === 'entity.too.large') {
    status = 413;
    code = 'payload_too_large';
    message = 'Request body too large';
  } else if ((err as BodyParserError).type === 'entity.parse.failed') {
    status = 400;
    code = 'bad_request';
    message = 'Malformed JSON';
  }

  if (status >= 500) logger.error({ err, requestId }, 'unhandled error');
  res.status(status).json({ error: { code, message, requestId, ...(details ? { details } : {}) } });
};
