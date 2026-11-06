import Link from 'next/link';
import { SITE } from '@/lib/site';

/** PLACEHOLDER wordmark: replace with the client's logo (single component, used everywhere). */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${SITE.name}, home`}
      className={`group inline-flex items-baseline gap-2 ${className}`}
    >
      <span className="font-display text-[1.65rem] leading-none tracking-tight">{SITE.name}</span>
      <span
        aria-hidden
        className="h-px w-5 translate-y-[-0.3em] bg-brass transition-transform duration-300 ease-out [transform-origin:left] group-hover:scale-x-150"
      />
    </Link>
  );
}
