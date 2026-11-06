'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  ExternalLink,
  Heart,
  Inbox,
  LayoutDashboard,
  LogOut,
  Users,
} from 'lucide-react';
import { SITE } from '@/lib/site';
import { cn } from '@/lib/cn';
import { useAuth } from '@/components/auth/AuthProvider';

const LINKS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/listings', label: 'Listings', icon: Building2 },
  { href: '/admin/leads', label: 'Leads', icon: Users },
  { href: '/admin/interests', label: 'Interests', icon: Heart },
  { href: '/admin/enquiries', label: 'Enquiries', icon: Inbox },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const active = (l: (typeof LINKS)[number]) =>
    l.exact ? pathname === l.href : pathname.startsWith(l.href);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="on-dark bg-forest-deep text-on-forest md:sticky md:top-0 md:h-dvh">
        <div className="flex items-center justify-between gap-2 px-4 py-4 md:block">
          <p className="font-display text-xl text-gold-bright">{SITE.name}</p>
          <p className="hidden text-sm text-on-forest-muted md:block">Admin</p>
        </div>
        <nav
          aria-label="Admin"
          className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l) ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 transition-colors duration-150',
                active(l) ? 'bg-line-on-dark text-gold-bright' : 'hover:bg-line-on-dark',
              )}
            >
              <l.icon size={18} aria-hidden /> {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:pb-0 md:pt-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 hover:bg-line-on-dark"
          >
            <ExternalLink size={18} aria-hidden /> View site
          </Link>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push('/');
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-left hover:bg-line-on-dark"
          >
            <LogOut size={18} aria-hidden /> Sign out
          </button>
        </div>
      </aside>
      <main id="main" className="min-w-0 p-4 sm:p-8">
        {children}
      </main>
    </div>
  );
}
