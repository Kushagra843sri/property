'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';

interface InterestValue {
  has: (propertyId: string) => boolean;
  pending: (propertyId: string) => boolean;
  /** Register interest. Resolves true on success. Logged-out callers must sign in first (see InterestButton). */
  add: (propertyId: string) => Promise<boolean>;
  remove: (propertyId: string) => Promise<boolean>;
}

const EMPTY: Set<string> = new Set();
const Ctx = createContext<InterestValue | null>(null);

export function useInterests(): InterestValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useInterests must be used inside <InterestProvider>');
  return v;
}

export function InterestProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // `owner` ties the ids to the signed-in user, so logging out/in never shows someone else's state.
  const [state, setState] = useState<{ owner: string | null; ids: Set<string> }>({
    owner: null,
    ids: EMPTY,
  });
  const ids = state.owner !== null && state.owner === user?.id ? state.ids : EMPTY;
  const userId = user?.id ?? null;
  const [busy, setBusy] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    api<string[]>('/me/interest-ids')
      .then((r) => !cancelled && setState({ owner: userId, ids: new Set(r.data) }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const mark = useCallback((id: string, on: boolean) => {
    setBusy((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  }, []);

  const change = useCallback(
    async (id: string, interested: boolean): Promise<boolean> => {
      if (busy.has(id)) return false; // ignore double clicks while a request is in flight
      mark(id, true);
      try {
        await api(`/properties/${id}/interest`, { method: interested ? 'POST' : 'DELETE' });
        setState((s) => {
          const n = new Set(s.owner === userId ? s.ids : EMPTY);
          if (interested) n.add(id);
          else n.delete(id);
          return { owner: userId, ids: n };
        });
        if (interested) toast.success('Interest sent. We will be in touch soon.');
        return true;
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.status === 403
              ? 'Your consent to be contacted is switched off. You can turn it on in My account.'
              : err.status === 409
                ? 'This property is no longer available.'
                : err.status === 429
                  ? 'Too many requests. Please wait a moment.'
                  : err.message
            : 'Could not send your interest. Please try again.';
        toast.error(msg);
        return false;
      } finally {
        mark(id, false);
      }
    },
    [busy, mark, userId],
  );

  const value = useMemo<InterestValue>(
    () => ({
      has: (id) => ids.has(id),
      pending: (id) => busy.has(id),
      add: (id) => change(id, true),
      remove: (id) => change(id, false),
    }),
    [ids, busy, change],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
