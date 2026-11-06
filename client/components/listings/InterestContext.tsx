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

const Ctx = createContext<InterestValue | null>(null);

export function useInterests(): InterestValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useInterests must be used inside <InterestProvider>');
  return v;
}

export function InterestProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    let cancelled = false;
    api<string[]>('/me/interest-ids')
      .then((r) => !cancelled && setIds(new Set(r.data)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

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
        setIds((s) => {
          const n = new Set(s);
          if (interested) n.add(id);
          else n.delete(id);
          return n;
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
    [busy, mark],
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
