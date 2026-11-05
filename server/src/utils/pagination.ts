import { z } from 'zod';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../config/constants.js';

export const paginationShape = {
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
};

export const pageMeta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});
