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
import { ApiError, api } from '@/lib/api';
import type { User } from '@/lib/types';
import { AuthDialog } from './AuthDialog';

interface OpenOptions {
  /** Called once the user has signed in; used to resume the action that needed an account. */
  onSuccess?: () => void;
  mode?: 'signup' | 'login';
}

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  openAuth: (opts?: OpenOptions) => void;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

const hasSessionHint = () =>
  typeof document !== 'undefined' && document.cookie.includes('csrf_token=');

async function loadUser(): Promise<User | null> {
  if (!hasSessionHint()) return null; // never signed in on this browser: skip the network call
  try {
    return (await api<{ user: User }>('/auth/me')).data.user;
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) return null;
  }
  try {
    await api('/auth/refresh', { method: 'POST' });
    return (await api<{ user: User }>('/auth/me')).data.user;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [dialog, setDialog] = useState<OpenOptions | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadUser().then((u) => {
      if (cancelled) return;
      setUser(u);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openAuth = useCallback((opts: OpenOptions = {}) => setDialog(opts), []);
  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, openAuth, setUser, logout }),
    [user, ready, openAuth, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthDialog
        open={dialog !== null}
        initialMode={dialog?.mode ?? 'signup'}
        onClose={() => setDialog(null)}
        onAuthenticated={(u) => {
          setUser(u);
          const resume = dialog?.onSuccess;
          setDialog(null);
          resume?.();
        }}
      />
    </AuthContext.Provider>
  );
}
