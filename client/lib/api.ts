import type { Meta } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

export interface ApiResult<T> {
  data: T;
  meta?: Meta;
}

async function parse<T>(res: Response): Promise<ApiResult<T>> {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error;
    throw new ApiError(
      res.status,
      e?.code ?? 'error',
      e?.message ?? 'Something went wrong',
      e?.details,
    );
  }
  return body as ApiResult<T>;
}

/** Server-side read (no cookies). Used by server components; revalidates on a timer. */
export async function serverGet<T>(path: string, revalidate = 60): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { next: { revalidate } });
  } catch {
    throw new ApiError(0, 'network', 'The property service is unreachable right now');
  }
  return parse<T>(res);
}

const readCookie = (name: string) =>
  typeof document === 'undefined'
    ? ''
    : (document.cookie
        .split('; ')
        .find((c) => c.startsWith(`${name}=`))
        ?.split('=')[1] ?? '');
const csrf = () => decodeURIComponent(readCookie('csrf_token'));

let refreshing: Promise<boolean> | null = null;
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrf() },
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * Upload one file as the raw request body (used for videos, which stream through the API).
 * XMLHttpRequest, because fetch cannot report upload progress.
 */
export function uploadFile<T>(
  path: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<ApiResult<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    xhr.setRequestHeader('X-CSRF-Token', csrf());
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: { data?: T; error?: { code?: string; message?: string } } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.data !== undefined)
        resolve(body as ApiResult<T>);
      else
        reject(
          new ApiError(
            xhr.status,
            body?.error?.code ?? 'error',
            body?.error?.message ?? 'The upload failed. Please try again.',
          ),
        );
    };
    xhr.onerror = () =>
      reject(new ApiError(0, 'network', 'Could not reach the server. Check your connection.'));
    xhr.send(file);
  });
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | number | undefined | null>;
  signal?: AbortSignal;
}

export function buildQuery(query?: RequestOptions['query']): string {
  if (!query) return '';
  const entries = Object.entries(query).flatMap(([k, v]) =>
    v === undefined || v === null || v === '' ? [] : [[k, String(v)] as [string, string]],
  );
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
}

/** Browser-side call: cookies, CSRF header, and one transparent refresh on 401. */
export async function api<T>(path: string, opts: RequestOptions = {}): Promise<ApiResult<T>> {
  const url = `${API_URL}${path}${buildQuery(opts.query)}`;
  const send = () => {
    const method = opts.method ?? 'GET';
    const headers: Record<string, string> = {};
    if (method !== 'GET') headers['X-CSRF-Token'] = csrf();
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(url, {
      method,
      credentials: 'include',
      headers,
      body: opts.formData ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal,
    });
  };

  let res: Response;
  try {
    res = await send();
    if (res.status === 401 && !path.startsWith('/auth/') && (await refreshSession())) {
      res = await send();
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(
      0,
      'network',
      'Network problem. Please check your connection and try again.',
    );
  }
  return parse<T>(res);
}
