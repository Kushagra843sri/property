'use client';

import type { ReactNode } from 'react';
import type { Meta } from '@/lib/types';
import { Button } from '@/components/ui/Button';

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-[length:var(--text-2xl)]">{title}</h1>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Loading / error / empty wrapper so every admin list handles all three states. */
export function State({
  loading,
  error,
  empty,
  emptyText,
  onRetry,
  children,
}: {
  loading: boolean;
  error?: string | undefined;
  empty: boolean;
  emptyText: string;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (error)
    return (
      <div role="alert" className="rounded-md bg-error-bg px-4 py-3 text-error">
        {error}{' '}
        {onRetry && (
          <button type="button" onClick={onRetry} className="underline underline-offset-2">
            Try again
          </button>
        )}
      </div>
    );
  if (loading)
    return (
      <div aria-busy="true" className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-12" />
        ))}
      </div>
    );
  if (empty)
    return (
      <p className="rounded-lg border border-line bg-raised p-8 text-center text-muted">
        {emptyText}
      </p>
    );
  return <>{children}</>;
}

export function Table({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-raised">
      <table className="w-full min-w-[40rem] text-left text-[0.9375rem]">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
export const Th = ({ children }: { children?: ReactNode }) => (
  <th scope="col" className="border-b border-line bg-sunken px-4 py-3 font-medium">
    {children}
  </th>
);
export const Td = ({ children, className = '' }: { children?: ReactNode; className?: string }) => (
  <td className={`border-b border-line px-4 py-3 align-top ${className}`}>{children}</td>
);

export function Pager({ meta, onPage }: { meta?: Meta | undefined; onPage: (p: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between">
      <Button variant="secondary" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
        Previous
      </Button>
      <span aria-live="polite">
        Page {meta.page} of {meta.totalPages} ({meta.total} total)
      </span>
      <Button
        variant="secondary"
        disabled={meta.page >= meta.totalPages}
        onClick={() => onPage(meta.page + 1)}
      >
        Next
      </Button>
    </div>
  );
}

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';
