import Link from 'next/link';
import { SITE } from '@/lib/site';

/**
 * PLACEHOLDER emblem: a simple winged mark on a dark tile, standing in for the client's real logo
 * (gold winged emblem on a dark tile). When the logo file arrives, replace the body of
 * `LogoMark` (e.g. with next/image); nothing else needs to change.
 */
function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden
      className="shrink-0 rounded-md bg-forest-deep ring-1 ring-line-on-dark"
    >
      <path
        d="M20 9 L22.2 16 L20 31 L17.8 16 Z M17 17 C13 14 8 14 5 17 C9 17 12 19 14 22 C15.5 20 16.5 18.5 17 17 Z M23 17 C27 14 32 14 35 17 C31 17 28 19 26 22 C24.5 20 23.5 18.5 23 17 Z"
        fill="var(--gold)"
      />
    </svg>
  );
}

/** Business wordmark = emblem + name (gold on the dark green bars). One place to swap the logo. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${SITE.name}, home`}
      className={`inline-flex items-center gap-3 ${className}`}
    >
      <LogoMark />
      <span className="font-display text-[1.25rem] leading-none tracking-tight text-gold-bright sm:text-[1.5rem]">
        {SITE.name}
      </span>
    </Link>
  );
}
