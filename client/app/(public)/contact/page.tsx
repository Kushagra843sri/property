import type { Metadata } from 'next';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { EnquiryForm } from '@/components/forms/EnquiryForm';
import { SITE, whatsappLink } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Call, WhatsApp or write to ${SITE.name}, or visit the office.`,
  alternates: { canonical: '/contact' },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function osm(lat: number, lng: number) {
  const d = 0.006;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
}

export default async function ContactPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const a = SITE.address;
  const row = 'inline-flex min-h-11 items-center gap-3 hover:underline';
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-[length:var(--text-3xl)]">Contact</h1>
      <p className="mt-3 max-w-[48ch] text-lg text-muted">
        Call, message or visit. We reply to every enquiry personally.
      </p>

      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <EnquiryForm
            propertyId={first(sp.property)}
            propertyTitle={first(sp.title)?.slice(0, 140)}
          />
        </div>

        <div className="flex flex-col gap-8 lg:col-span-5">
          <address className="flex flex-col gap-1 not-italic">
            <a href={SITE.phoneHref} className={row}>
              <Phone size={18} aria-hidden /> {SITE.phone}
            </a>
            <a href={whatsappLink()} className={row} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} aria-hidden /> Chat on WhatsApp
            </a>
            <a href={`mailto:${SITE.email}`} className={row}>
              <Mail size={18} aria-hidden /> {SITE.email}
            </a>
            <p className="mt-2 flex gap-3">
              <MapPin size={18} className="mt-1 shrink-0" aria-hidden />
              <span>
                {a.line}, {a.locality}
                <br />
                {a.city}, {a.state} {a.pincode}
              </span>
            </p>
          </address>

          <section aria-labelledby="hours">
            <h2 id="hours" className="mb-2 flex items-center gap-2 text-xl">
              <Clock size={18} aria-hidden /> Office hours
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
              {SITE.hours.map((h) => (
                <div key={h.days} className="contents">
                  <dt className="text-muted">{h.days}</dt>
                  <dd>{h.time}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="aspect-[4/3] overflow-hidden rounded-lg border border-line">
            <iframe
              title="Map showing the office location"
              src={osm(SITE.geo.lat, SITE.geo.lng)}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="size-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
