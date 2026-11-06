import type { ReactNode } from 'react';

/** Shared layout for legal pages, with the mandatory "needs legal review" notice. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-[length:var(--text-3xl)]">{title}</h1>
      <p className="mt-2 text-muted">Last updated {updated}</p>
      {/* DRAFT: remove this notice only after a legal professional has reviewed the text. */}
      <p
        role="note"
        className="mt-6 max-w-[var(--measure)] rounded-md bg-warn-bg px-4 py-3 text-warn"
      >
        Draft: this text has not yet been reviewed by a legal professional.
      </p>
      <div className="mt-8 flex max-w-[var(--measure)] flex-col gap-5 [&_h2]:mt-6 [&_h2]:text-[length:var(--text-xl)] [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted [&_li]:mt-1">
        {children}
      </div>
    </div>
  );
}
