import Link from 'next/link';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { NAV, SITE, whatsappLink } from '@/lib/site';
import { Wordmark } from './Wordmark';

const row = 'inline-flex min-h-8 items-center gap-3 hover:underline';

export function Footer() {
  const a = SITE.address;
  return (
    <footer className="on-dark mt-24 bg-forest-deep pb-24 text-on-forest md:pb-0">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Wordmark />
          <p className="max-w-[34ch] text-on-forest-muted">
            {SITE.tagline}. Call, message or visit; we are happy to talk through any property.
          </p>
        </div>

        <address className="flex flex-col gap-3 not-italic" aria-label="Contact details">
          <h2 className="text-xl text-gold-bright">Contact</h2>
          {SITE.phones.map((p) => (
            <a key={p.href} href={p.href} className={row}>
              <Phone size={18} aria-hidden /> {p.display}
            </a>
          ))}
          <a href={whatsappLink()} className={row} rel="noopener noreferrer" target="_blank">
            <MessageCircle size={18} aria-hidden /> WhatsApp us
          </a>
          <a href={`mailto:${SITE.email}`} className={row}>
            <Mail size={18} aria-hidden /> {SITE.email}
          </a>
          <p className="flex gap-3">
            <MapPin size={18} className="mt-1 shrink-0" aria-hidden />
            <span>
              {a.line}, {a.locality}
              <br />
              {a.city}, {a.state} {a.pincode}
            </span>
          </p>
          <p className="flex gap-3">
            <Clock size={18} className="mt-1 shrink-0" aria-hidden />
            <span>
              {SITE.hours.map((h) => (
                <span key={h.days} className="block">
                  {h.days}: {h.time}
                </span>
              ))}
            </span>
          </p>
        </address>

        <nav aria-label="Footer" className="flex flex-col gap-1">
          <h2 className="mb-2 text-xl text-gold-bright">Explore</h2>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="inline-flex min-h-9 items-center hover:underline"
            >
              {n.label}
            </Link>
          ))}
          <Link href="/privacy" className="inline-flex min-h-9 items-center hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="inline-flex min-h-9 items-center hover:underline">
            Terms
          </Link>
        </nav>
      </div>
      <div className="border-t border-line-on-dark">
        <p className="container-page py-5 text-sm text-on-forest-muted">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
