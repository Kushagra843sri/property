'use client';

import { Button, LinkButton } from '@/components/ui/Button';

export default function PublicError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-[length:var(--text-2xl)]">Something went wrong</h1>
      <p className="mx-auto mt-3 max-w-[48ch] text-muted">
        This page could not be shown. Please try again, or contact us and we will help directly.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <LinkButton href="/contact" variant="secondary">
          Contact us
        </LinkButton>
      </div>
    </div>
  );
}
