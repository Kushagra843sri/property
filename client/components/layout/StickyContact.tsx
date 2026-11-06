import { MessageCircle, Phone } from 'lucide-react';
import { SITE, whatsappLink } from '@/lib/site';

/** Mobile-only bar so a call or WhatsApp message is always one tap away. */
export function StickyContact() {
  return (
    <div
      role="region"
      aria-label="Quick contact"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-px border-t border-line bg-line pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <a
        href={SITE.phoneHref}
        className="flex min-h-14 items-center justify-center gap-2 bg-forest font-medium text-on-forest active:bg-forest-hover"
      >
        <Phone size={18} aria-hidden /> Call
      </a>
      <a
        href={whatsappLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-14 items-center justify-center gap-2 bg-raised font-medium text-forest active:bg-sunken"
      >
        <MessageCircle size={18} aria-hidden /> WhatsApp
      </a>
    </div>
  );
}
