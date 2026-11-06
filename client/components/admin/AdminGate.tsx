'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError, api } from '@/lib/api';
import type { User } from '@/lib/types';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

function AdminLogin({ notAdmin }: { notAdmin: boolean }) {
  const { setUser } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      const res = await api<{ user: User }>('/auth/admin/login', {
        method: 'POST',
        body: {
          email: String(fd.get('email') ?? '').trim(),
          password: String(fd.get('password') ?? ''),
        },
      });
      setUser(res.data.user);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? 'Too many attempts. Please wait a few minutes.'
          : err instanceof ApiError && err.status === 401
            ? 'Wrong email or password.'
            : 'Could not sign in. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      id="main"
      className="mx-auto mt-16 w-[min(26rem,calc(100vw-2rem))] rounded-lg border border-line bg-raised p-8 shadow-raised"
    >
      <h1 className="text-3xl">Admin sign in</h1>
      {notAdmin && (
        <p role="alert" className="mt-3 rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">
          This account is not an admin. Sign in with the admin email and password.
        </p>
      )}
      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
        <Field label="Email">
          {(a) => <Input {...a} name="email" type="email" autoComplete="username" required />}
        </Field>
        <Field label="Password">
          {(a) => (
            <Input
              {...a}
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          )}
        </Field>
        {error && (
          <p role="alert" className="rounded-md bg-error-bg px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" loading={busy}>
          Sign in
        </Button>
      </form>
    </main>
  );
}

/** Shows the admin UI only to an admin; everyone else gets the admin login. (The API enforces this too.) */
export function AdminGate({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <div aria-busy="true" className="skeleton m-8 h-64" />;
  if (user?.role === 'admin') return <>{children}</>;
  return <AdminLogin notAdmin={!!user} />;
}
