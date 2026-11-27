'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';

function AdminSignIn({ notAdmin }: { notAdmin: boolean }) {
  const { openAuth } = useAuth();
  return (
    <main
      id="main"
      className="mx-auto mt-16 w-[min(26rem,calc(100vw-2rem))] rounded-lg border border-line bg-raised p-8 shadow-raised"
    >
      <h1 className="text-3xl">Admin area</h1>
      {notAdmin ? (
        <p role="alert" className="mt-3 rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">
          This account is not an admin. Sign in with the admin email and password.
        </p>
      ) : (
        <p className="mt-3 text-muted">
          Sign in with the admin email and password, the same way as everyone else. Admins get the
          admin tools automatically.
        </p>
      )}
      <Button size="lg" className="mt-6 w-full" onClick={() => openAuth({ mode: 'login' })}>
        Sign in
      </Button>
    </main>
  );
}

/** Shows the admin UI only to an admin; everyone else gets the admin login. (The API enforces this too.) */
export function AdminGate({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <div aria-busy="true" className="skeleton m-8 h-64" />;
  if (user?.role === 'admin') return <>{children}</>;
  return <AdminSignIn notAdmin={!!user} />;
}
