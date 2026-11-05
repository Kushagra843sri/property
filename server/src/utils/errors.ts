export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
  static badRequest = (msg = 'Invalid request', details?: unknown) =>
    new AppError(400, 'bad_request', msg, details);
  static unauthorized = (msg = 'Authentication required') => new AppError(401, 'unauthorized', msg);
  static forbidden = (msg = 'Forbidden') => new AppError(403, 'forbidden', msg);
  static notFound = (msg = 'Not found') => new AppError(404, 'not_found', msg);
  static conflict = (msg = 'Conflict') => new AppError(409, 'conflict', msg);
  static tooMany = (msg = 'Too many requests') => new AppError(429, 'rate_limited', msg);
}
