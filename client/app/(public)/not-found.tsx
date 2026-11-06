import { LinkButton } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-[length:var(--text-2xl)]">We could not find that page</h1>
      <p className="mx-auto mt-3 max-w-[48ch] text-muted">
        The link may be old, or the property may have been taken off the market.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <LinkButton href="/listings">View properties</LinkButton>
        <LinkButton href="/" variant="secondary">
          Go home
        </LinkButton>
      </div>
    </div>
  );
}
