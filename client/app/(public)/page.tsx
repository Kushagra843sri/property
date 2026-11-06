import Link from 'next/link';
import { PropertyCard } from '@/components/listings/PropertyCard';
import { Reveal } from '@/components/motion/Reveal';
import { HeroVisual } from '@/components/three/HeroVisual';
import { LinkButton } from '@/components/ui/Button';
import { serverGet } from '@/lib/api';
import { SITE } from '@/lib/site';
import type { Property } from '@/lib/types';

async function featured(): Promise<Property[] | null> {
  try {
    const f = await serverGet<Property[]>('/properties?sort=featured&limit=3', 60);
    return f.data;
  } catch {
    return null; // the home page must still render when the API is down
  }
}

const STEPS = [
  {
    n: '1',
    title: 'Browse',
    text: 'Filter by budget, bedrooms and area. Every listing shows its real details.',
  },
  {
    n: '2',
    title: 'Say you are interested',
    text: 'One tap tells us which property caught your eye.',
  },
  { n: '3', title: 'We call you back', text: 'We answer your questions and arrange a visit.' },
];

export default async function HomePage() {
  const items = await featured();

  return (
    <>
      <section
        aria-labelledby="hero-title"
        className="container-page grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-12 lg:gap-12 lg:py-20"
      >
        <div className="lg:col-span-5">
          <h1 id="hero-title" className="text-[length:var(--text-hero)]">
            <span className="line-mask" style={{ ['--i' as string]: 0 }}>
              <span>Homes worth</span>
            </span>
            <span className="line-mask" style={{ ['--i' as string]: 1 }}>
              <span>walking through</span>
            </span>
          </h1>
          <p
            className="fade-up mt-6 max-w-[34ch] text-[length:var(--text-lg)] text-muted"
            style={{ ['--d' as string]: '450ms' }}
          >
            Browse our current properties, then talk to us directly.
          </p>
          <div className="fade-up mt-8 flex flex-wrap gap-3" style={{ ['--d' as string]: '560ms' }}>
            <LinkButton href="/listings" size="lg">
              View properties
            </LinkButton>
            <LinkButton href="/contact" size="lg" variant="secondary">
              Contact us
            </LinkButton>
          </div>
        </div>
        <div className="fade-up lg:col-span-7" style={{ ['--d' as string]: '200ms' }}>
          <HeroVisual poster="/placeholders/hero-poster.svg" />
        </div>
      </section>

      <section aria-labelledby="featured-title" className="container-page py-12 sm:py-16">
        <Reveal>
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 id="featured-title" className="text-[length:var(--text-2xl)]">
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
      </section>

      <section aria-labelledby="how-title" className="bg-sunken py-16 sm:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <h2 id="how-title" className="text-[length:var(--text-2xl)]">
              How it works
            </h2>
          </Reveal>
          <ol className="grid gap-8 sm:grid-cols-3 lg:col-span-8">
            {STEPS.map((s, i) => (
              <li key={s.n}>
                <Reveal delay={i * 70}>
                  <p aria-hidden className="font-display text-[3rem] leading-none text-brass-ink">
                    {s.n}
                  </p>
                  <h3 className="mt-3 text-xl">{s.title}</h3>
                  <p className="mt-2 text-muted">{s.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="cta-title" className="container-page py-16 sm:py-24">
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
