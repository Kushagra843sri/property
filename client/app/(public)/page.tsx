import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { Reveal } from '@/components/motion/Reveal';
import { HeroVisual } from '@/components/three/HeroVisual';
import { LinkButton } from '@/components/ui/Button';
import { serverGet } from '@/lib/api';
import type { AreaOption } from '@/lib/types';
import { SERVICES, SITE } from '@/lib/site';
import type { Property } from '@/lib/types';

async function featured(): Promise<Property[] | null> {
  try {
    const f = await serverGet<Property[]>('/properties?sort=featured&limit=3', 60);
    return f.data;
  } catch {
    return null; // the home page must still render when the API is down
  }
}

// Quick entries into the listings. Rent and Buy are deliberately identical in weight.
const QUICK = [
  { label: 'PG rooms', href: '/listings?type=pg' },
  { label: 'Furnished rooms', href: '/listings?type=room' },
  { label: '1 BHK flats', href: '/listings?type=flat&bhk=1' },
  { label: '2 BHK flats', href: '/listings?type=flat&bhk=2' },
  { label: '3 BHK flats', href: '/listings?type=flat&bhk=3' },
  { label: 'Shops', href: '/listings?type=shop' },
  { label: 'Offices', href: '/listings?type=office' },
];

/** Top areas that have listings, for the "Popular areas" links. Empty on any failure. */
async function popularAreas(): Promise<AreaOption[]> {
  return serverGet<AreaOption[]>('/properties/areas', 300)
    .then((r) => r.data.filter((a) => a.top && a.count > 0))
    .catch(() => []);
}

export default async function HomePage() {
  const [items, areas] = await Promise.all([featured(), popularAreas()]);

  return (
    <>
      <section
        aria-labelledby="hero-title"
        className="container-page grid items-center gap-10 pt-10 pb-12 sm:pt-14 lg:grid-cols-12 lg:gap-12 lg:pt-20 lg:pb-[var(--section-gap)]"
      >
        <div className="lg:col-span-5">
          <h1 id="hero-title" className="text-[length:var(--text-hero)]">
            <span className="line-mask" style={{ ['--i' as string]: 0 }}>
              <span>Buy, rent or</span>
            </span>
            <span className="line-mask" style={{ ['--i' as string]: 1 }}>
              <span>find a room</span>
            </span>
          </h1>
          <p
            className="fade-up mt-6 max-w-[34ch] text-[length:var(--text-lg)] text-muted"
            style={{ ['--d' as string]: '450ms' }}
          >
            Flats, shops, offices, PG and furnished rooms, for sale and rent.
          </p>
          <div className="fade-up mt-8 flex flex-wrap gap-3" style={{ ['--d' as string]: '560ms' }}>
            <LinkButton href="/listings?purpose=buy" size="lg">
              Buy a property
            </LinkButton>
            <LinkButton href="/listings?purpose=rent" size="lg">
              Rent a property
            </LinkButton>
          </div>
        </div>
        <div className="fade-up lg:col-span-7" style={{ ['--d' as string]: '200ms' }}>
          <HeroVisual poster="/placeholders/hero-poster.svg" />
        </div>
      </section>

      <section aria-labelledby="find-title" className="container-page pb-[var(--section-gap)]">
        <h2 id="find-title" className="sr-only">
          Find a property
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              href: '/listings?purpose=buy',
              title: 'Buy',
              text: 'Flats, shops and offices for sale.',
            },
            {
              href: '/listings?purpose=rent',
              title: 'Rent',
              text: 'Flats, shops, offices, PG and rooms.',
            },
          ].map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className="group flex min-h-28 items-center justify-between gap-4 rounded-lg border border-forest bg-raised p-6 transition-[background-color,color] duration-200 hover:bg-forest hover:text-on-forest"
            >
              <span>
                <span className="block font-display text-[length:var(--text-section)] leading-none">
                  {t.title}
                </span>
                <span className="mt-2 block text-muted group-hover:text-on-forest-muted">
                  {t.text}
                </span>
              </span>
              <ArrowRight
                aria-hidden
                className="shrink-0 transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          ))}
        </div>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Quick links">
          {QUICK.map((q) => (
            <li key={q.href}>
              <Link
                href={q.href}
                className="inline-flex min-h-11 items-center rounded-pill border border-line-strong bg-raised px-4 text-[0.9375rem] transition-colors duration-150 hover:border-forest hover:text-forest"
                style={{ borderRadius: 'var(--r-pill)' }}
              >
                {q.label}
              </Link>
            </li>
          ))}
        </ul>

        <div role="group" aria-labelledby="featured-title" className="mt-14">
          <Reveal>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <h2 id="featured-title" className="text-[length:var(--text-section)]">
                Featured properties
              </h2>
              <Link
                href="/listings"
                className="inline-flex min-h-11 items-center text-forest underline underline-offset-4"
              >
                See all properties
              </Link>
            </div>
          </Reveal>
          {items === null ? (
            <p
              role="status"
              className="rounded-lg border border-line bg-raised p-8 text-center text-muted"
            >
              Our properties could not be loaded just now. Please refresh in a moment, or call us on{' '}
              {SITE.phone}.
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-lg border border-line bg-raised p-8 text-center text-muted">
              New properties are being added. Contact us to hear about them first.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p, i) => (
                <PropertyCard key={p.id} property={p} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {areas.length > 0 && (
        <section aria-labelledby="areas-title" className="container-page pb-[var(--section-gap)]">
          <h2 id="areas-title" className="text-[length:var(--text-section)]">
            Popular areas
          </h2>
          <ul className="mt-6 flex flex-wrap gap-2">
            {areas.map((a) => (
              <li key={a.name}>
                <Link
                  href={`/listings?locality=${encodeURIComponent(a.name)}`}
                  className="inline-flex min-h-11 items-center rounded-pill border border-line-strong bg-raised px-4 hover:border-ink"
                >
                  {a.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="What we do" className="bg-sunken py-[var(--section-gap)]">
        <div className="container-page">
          <ul className="grid gap-8 sm:grid-cols-3">
            {SERVICES.map((s, i) => (
              <li key={s.title}>
                <Reveal delay={i * 70}>
                  <span aria-hidden className="block h-px w-10 bg-gold" />
                  <h2 className="mt-4 text-[length:var(--text-section)]">{s.title}</h2>
                  <p className="mt-2 text-muted">{s.text}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="cta-title" className="container-page py-[var(--section-gap)]">
        <Reveal>
          <div className="grid items-end gap-6 border-t border-ink pt-8 md:grid-cols-[1fr_auto]">
            <h2 id="cta-title" className="max-w-[18ch] text-[length:var(--text-3xl)]">
              Looking for something specific?
            </h2>
            <LinkButton href="/contact" size="lg">
              Tell us what you need
            </LinkButton>
          </div>
        </Reveal>
      </section>
    </>
  );
}
