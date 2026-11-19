'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError, api } from '@/lib/api';
import { formatLocation, formatPrice, specLine } from '@/lib/format';
import type { Meta, Property, User } from '@/lib/types';
import { useAuth } from '@/components/auth/AuthProvider';
import { useInterests } from '@/components/listings/InterestContext';
import { Button, LinkButton } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input } from '@/components/ui/Field';

interface InterestRow {
  createdAt: string;
  property: Property;
}

function Interests() {
  const interests = useInterests();
  const [rows, setRows] = useState<InterestRow[] | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<InterestRow[]>('/me/interests', { query: { page, limit: 10 } })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data);
        setMeta(res.meta ?? null);
        setError('');
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : 'Could not load your properties.');
      });
    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  async function withdraw(id: string) {
    if (await interests.remove(id)) {
      toast.success('Removed from your list.');
      // Step back a page if that was the last item on this one.
      if (rows && rows.length === 1 && page > 1) setPage(page - 1);
      else setReloadKey((k) => k + 1);
    }
  }

  if (error)
    return (
      <p role="alert" className="rounded-md bg-error-bg px-4 py-3 text-error">
        {error}
      </p>
    );
  if (!rows)
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>
    );
  if (rows.length === 0)
    return (
      <div className="rounded-lg border border-line bg-raised p-8 text-center">
        <p className="text-lg">You have not shown interest in any property yet.</p>
        <LinkButton href="/listings" className="mt-4">
          Browse properties
        </LinkButton>
      </div>
    );

  return (
    <>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li
            key={r.property.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-raised p-4"
          >
            <div className="min-w-0">
              <Link
                href={`/listings/${r.property.slug}`}
                className="text-lg underline-offset-4 hover:underline"
              >
                {r.property.title}
              </Link>
              <p className="text-muted">
                {[formatPrice(r.property.price, r.property.priceUnit), specLine(r.property)]
                  .filter(Boolean)
                  .join(', ')}{' '}
                in {formatLocation(r.property.address)}
              </p>
            </div>
            <Button variant="ghost" onClick={() => withdraw(r.property.id)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span aria-live="polite">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}

function Profile({ user }: { user: User }) {
  const { setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy || name.trim() === user.name) return;
    if (name.trim().length < 2) return setError('Enter your full name');
    setBusy(true);
    setError('');
    try {
      const res = await api<{ user: User }>('/me', {
        method: 'PATCH',
        body: { name: name.trim() },
      });
      setUser(res.data.user);
      toast.success('Name updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" error={error}>
        {(a) => (
          <Input
            {...a}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Email and phone</span>
        <p className="min-h-11 rounded-md bg-sunken px-3.5 py-2.5 text-muted">
          {user.email}, {user.phone}
        </p>
      </div>
      <Button
        type="submit"
        loading={busy}
        disabled={name.trim() === user.name}
        className="self-start"
      >
        Save name
      </Button>
    </form>
  );
}

function Consent({ user }: { user: User }) {
  const { setUser } = useAuth();
  const [busy, setBusy] = useState(false);

  async function change(consent: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api<{ user: User }>('/me', { method: 'PATCH', body: { consent } });
      setUser(res.data.user);
      toast.success(
        consent
          ? 'We may contact you about properties again.'
          : 'We will no longer contact you about properties.',
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return user.consentGiven ? (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="max-w-[52ch]">
        You have agreed to be contacted about properties. You can change your mind at any time.
      </p>
      <Button variant="secondary" loading={busy} onClick={() => change(false)}>
        Stop contacting me
      </Button>
    </div>
  ) : (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="max-w-[52ch]">
        Contact is switched off. You will not be contacted and cannot register interest in
        properties.
      </p>
      <Button loading={busy} onClick={() => change(true)}>
        Allow contact again
      </Button>
    </div>
  );
}

function DeleteAccount() {
  const { setUser } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      await api('/me', { method: 'DELETE' });
      setUser(null);
      toast.success('Your account has been deleted.');
      router.push('/');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete. Please try again.');
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete account">
        <h2 className="pr-10 text-2xl">Delete your account?</h2>
        <p className="mt-3 text-muted">
          This permanently removes your details and the properties you showed interest in. It cannot
          be undone.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="danger" loading={busy} onClick={remove}>
            Yes, delete everything
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Keep my account
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export function AccountView() {
  const { user, ready, openAuth } = useAuth();

  if (!ready) return <div aria-busy="true" className="skeleton h-64" />;
  if (!user)
    return (
      <div className="rounded-lg border border-line bg-raised p-10 text-center">
        <h2 className="text-2xl">Sign in to see your account</h2>
        <p className="mt-2 text-muted">We will send a one-time code to your email or phone.</p>
        <Button className="mt-6" size="lg" onClick={() => openAuth({ mode: 'login' })}>
          Sign in
        </Button>
      </div>
    );

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="profile">
        <h2 id="profile" className="mb-4 text-[length:var(--text-xl)]">
          Your details
        </h2>
        <Profile user={user} />
      </section>
      <section aria-labelledby="interests">
        <h2 id="interests" className="mb-4 text-[length:var(--text-xl)]">
          Properties you are interested in
        </h2>
        <Interests />
      </section>
      <section aria-labelledby="privacy">
        <h2 id="privacy" className="mb-4 text-[length:var(--text-xl)]">
          Privacy
        </h2>
        <div className="flex flex-col gap-6 rounded-lg border border-line bg-raised p-6">
          <Consent user={user} />
          <hr className="border-line" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-[52ch] text-muted">
              Delete your account and everything we hold about you.
            </p>
            <DeleteAccount />
          </div>
        </div>
      </section>
    </div>
  );
}
