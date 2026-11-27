'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { ApiError, api } from '@/lib/api';
import type { User } from '@/lib/types';
import { fieldErrors, phoneSchema } from '@/lib/validation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input } from '@/components/ui/Field';

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

/** Google sign-ups have no phone yet; the dealer needs one, so ask once and carry on. */
function PhoneForm({ onSaved }: { onSaved: (user: User) => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const parsed = phoneSchema.safeParse({
      phone: String(new FormData(e.currentTarget).get('phone')),
    });
    if (!parsed.success)
      return setError(fieldErrors(parsed.error).phone ?? 'Enter a valid phone number');
    setBusy(true);
    setError('');
    try {
      const res = await api<{ user: User }>('/me', { method: 'PATCH', body: parsed.data });
      onSaved(res.data.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 className="pr-10 text-2xl">Add your phone number</h2>
      <p className="mt-2 text-muted">So we can call or WhatsApp you about this property.</p>
      <form onSubmit={save} noValidate className="mt-6 flex flex-col gap-4">
        <Field label="Phone" error={error}>
          {(a) => <Input {...a} name="phone" type="tel" autoComplete="tel" required autoFocus />}
        </Field>
        <Button type="submit" size="lg" loading={busy}>
          Save and send my interest
        </Button>
      </form>
    </>
  );
}

export function InterestProvider({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const [askPhoneFor, setAskPhoneFor] = useState<string | null>(null);
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
        if (err instanceof ApiError && err.code === 'phone_required') {
          setAskPhoneFor(id); // the dialog saves the number, then retries this request
          return false;
        }
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

  return (
    <Ctx.Provider value={value}>
      {children}
      <Dialog
        open={askPhoneFor !== null}
        onClose={() => setAskPhoneFor(null)}
        title="Add your phone number"
      >
        <PhoneForm
          onSaved={(u) => {
            const id = askPhoneFor;
            setUser(u);
            setAskPhoneFor(null);
            if (id) void change(id, true);
          }}
        />
      </Dialog>
    </Ctx.Provider>
  );
}
