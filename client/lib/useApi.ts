'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, api, buildQuery, type RequestOptions } from './api';
import type { Meta } from './types';

interface Result<T> {
  url: string;
  data?: T;
  meta?: Meta | undefined;
  error?: string;
}

/**
 * GET with loading/error state and a `reload()`. `loading` is derived (the stored result belongs to
 * a different URL), so no state is set synchronously inside the effect.
 */
export function useApi<T>(path: string, query?: RequestOptions['query']) {
  const [tick, setTick] = useState(0);
  const [res, setRes] = useState<Result<T> | null>(null);
  const url = `${path}${buildQuery(query)}`;
  const key = `${url}#${tick}`;

  useEffect(() => {
    let cancelled = false;
    api<T>(url)
      .then((r) => !cancelled && setRes({ url: key, data: r.data, meta: r.meta }))
      .catch(
        (e) =>
          !cancelled &&
          setRes({ url: key, error: e instanceof ApiError ? e.message : 'Could not load this.' }),
      );
    return () => {
      cancelled = true;
    };
  }, [url, key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const current = res?.url === key ? res : null;
  return {
    data: current?.data,
    meta: current?.meta,
    error: current?.error,
    loading: current === null,
    reload,
  };
}
