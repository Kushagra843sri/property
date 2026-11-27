import Image from 'next/image';
import Link from 'next/link';
import { SITE } from '@/lib/site';

/** The client's emblem (gold winged building on black), cropped from his logo. */
function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <Image
      src="/brand/logo-mark.png"
      alt=""
      width={size}
      height={size}
      priority
      className="shrink-0 rounded-md ring-1 ring-line-on-dark"
    />
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
