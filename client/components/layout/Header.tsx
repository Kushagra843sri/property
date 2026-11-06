'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, Phone, X } from 'lucide-react';
import { NAV, SITE } from '@/lib/site';
import { cn } from '@/lib/cn';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button, buttonClass } from '@/components/ui/Button';
import { Wordmark } from './Wordmark';

export function Header() {
  const pathname = usePathname();
  const { user, ready, openAuth, logout } = useAuth();
  // The menu is "open for this path": navigating changes the path, which closes it without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) =>
    setOpenAt((cur) => ((typeof v === 'function' ? v(cur === pathname) : v) ? pathname : null));
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const link = (href: string) =>
    cn(
      'relative inline-flex min-h-11 items-center text-[0.9375rem] after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left after:bg-ink',
      'after:scale-x-0 after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100',
      pathname.startsWith(href) && 'after:scale-x-100',
    );

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-[background-color,border-color] duration-300',
        scrolled ? 'border-line bg-paper/95 backdrop-blur-sm' : 'border-transparent bg-paper',
      )}
    >
      <div className="container-page flex h-[var(--header-h)] items-center justify-between gap-4">
        <div
          className={cn(
            'origin-left transition-transform duration-300 ease-out',
            scrolled && 'scale-90',
          )}
        >
          <Wordmark />
        </div>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={link(n.href)}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={SITE.phoneHref}
            className="hidden min-h-11 items-center gap-2 px-2 text-[0.9375rem] lg:inline-flex"
          >
            <Phone size={16} aria-hidden /> {SITE.phone}
          </a>
          {ready && user ? (
            <div className="hidden items-center gap-1 md:flex">
              {user.role === 'admin' && (
                <Link href="/admin" className={buttonClass('ghost')}>
                  Admin
                </Link>
              )}
              <Link href="/account" className={buttonClass('ghost')}>
                My account
              </Link>
              <Button variant="secondary" onClick={() => logout()}>
                Sign out
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              className="hidden md:inline-flex"
              onClick={() => openAuth({ mode: 'login' })}
            >
              Sign in
            </Button>
          )}
          <button
            type="button"
            className="grid size-11 place-items-center rounded-md hover:bg-sunken md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>
      </div>

      <div id="mobile-menu" hidden={!open} className="border-t border-line bg-paper md:hidden">
        <nav aria-label="Mobile" className="container-page flex flex-col py-3">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex min-h-12 items-center border-b border-line text-lg"
            >
              {n.label}
            </Link>
          ))}
          {ready && user ? (
            <>
              <Link
                href="/account"
                className="flex min-h-12 items-center border-b border-line text-lg"
              >
                My account
              </Link>
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className="flex min-h-12 items-center border-b border-line text-lg"
                >
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={() => logout()}
                className="flex min-h-12 items-center text-left text-lg"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openAuth({ mode: 'login' });
              }}
              className="flex min-h-12 items-center text-left text-lg"
            >
              Sign in
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
