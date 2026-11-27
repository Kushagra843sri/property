import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Gallery } from '@/components/listings/Gallery';
import { InterestButton } from '@/components/listings/InterestButton';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { ApiError, serverGet } from '@/lib/api';
import { formatArea, formatLocation, formatPrice, specLine } from '@/lib/format';
import { SITE, listingWhatsappLink } from '@/lib/site';
import type { Property } from '@/lib/types';

type Params = Promise<{ slug: string }>;

async function load(slug: string): Promise<Property | null> {
  try {
    return (await serverGet<Property>(`/properties/${encodeURIComponent(slug)}`, 60)).data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err; // real failures reach the error boundary instead of masquerading as "not found"
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug).catch(() => null);
  if (!p) return { title: 'Property not found', robots: { index: false } };
  const priceText = formatPrice(p.price, p.priceUnit);
  const head = [`${specLine(p)} in ${formatLocation(p.address)}`, priceText].filter(Boolean);
  const desc = `${head.join(', ')}. ${p.description}`.slice(0, 160);
  const img = p.images[0]?.url;
  return {
    title: p.title,
    description: desc,
    alternates: { canonical: `/listings/${p.slug}` },
    openGraph: {
      title: p.title,
      description: desc,
      type: 'website',
      ...(img && !img.endsWith('.svg') ? { images: [img] } : {}),
    },
  };
}

function Spec({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5 border-t border-line py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function osmEmbed(lat: number, lng: number) {
  const d = 0.006;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
}

export default async function PropertyPage({ params }: { params: Params }) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();

  const area = formatArea(p.carpetArea, p.areaUnit);
  const built = formatArea(p.builtUpArea, p.areaUnit);
  const unavailable = p.status !== 'available';
  const hasGeo = typeof p.geo?.lat === 'number' && typeof p.geo?.lng === 'number';
  const where = formatLocation(p.address);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: p.title,
    url: `${SITE.url}/listings/${p.slug}`,
    description: p.description,
    datePosted: p.createdAt,
    image: p.images.map((i) => (i.url.startsWith('/') ? `${SITE.url}${i.url}` : i.url)),
    offers: {
      '@type': 'Offer',
      ...(p.price !== null && { price: p.price }), // omitted when no price is entered
      priceCurrency: 'INR',
      availability: unavailable ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: p.address.locality,
      addressRegion: p.address.state,
      addressCountry: 'IN',
    },
  };

  return (
    <div className="container-page py-8 sm:py-12">
      {/* JSON-LD: "<" is escaped so listing text can never close the script tag. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        <Link href="/listings" className="hover:underline">
          Properties
        </Link>{' '}
        / <span aria-current="page">{p.title}</span>
      </nav>

      <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Gallery images={p.images} title={p.title} />

          <header className="mt-8">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone="neutral">{p.purpose === 'rent' ? 'For rent' : 'For sale'}</Badge>
              {p.featured && !unavailable && <Badge tone="forest">Featured</Badge>}
              {p.status === 'sold' && <Badge tone="warn">Sold</Badge>}
              {p.status === 'rented' && <Badge tone="warn">Rented</Badge>}
            </div>
            <h1 className="text-[length:var(--text-3xl)]">{p.title}</h1>
            <p className="mt-3 flex items-center gap-2 text-lg text-muted">
              <MapPin size={18} aria-hidden /> {where}
            </p>
          </header>
        </div>

        {/* Sections below the header; on phones the contact panel sits between header and these. */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <section aria-labelledby="overview" className="mt-10">
            <h2 id="overview" className="mb-2 text-[length:var(--text-xl)]">
              Overview
            </h2>
            <dl className="grid grid-cols-2 gap-x-8 sm:grid-cols-3">
              <Spec label="Type" value={specLine(p)} />
              <Spec label="Bedrooms" value={p.bhk} />
              <Spec label="Bathrooms" value={p.bathrooms} />
              <Spec label="Carpet area" value={area} />
              <Spec label="Built-up area" value={built} />
              <Spec
                label="Furnishing"
                value={p.furnishing && p.furnishing.charAt(0).toUpperCase() + p.furnishing.slice(1)}
              />
              <Spec
                label="Floor"
                value={
                  p.floor !== undefined
                    ? `${p.floor}${p.totalFloors ? ` of ${p.totalFloors}` : ''}`
                    : null
                }
              />
              <Spec label="Facing" value={p.facing} />
              <Spec
                label="Age of property"
                value={p.ageOfProperty !== undefined ? `${p.ageOfProperty} years` : null}
              />
              <Spec label="Possession" value={p.possession} />
            </dl>
          </section>

          {p.description && (
            <section aria-labelledby="about" className="mt-10">
              <h2 id="about" className="mb-3 text-[length:var(--text-xl)]">
                About this property
              </h2>
              <p className="max-w-[var(--measure)] whitespace-pre-line">{p.description}</p>
            </section>
          )}

          {p.amenities.length > 0 && (
            <section aria-labelledby="amenities" className="mt-10">
              <h2 id="amenities" className="mb-3 text-[length:var(--text-xl)]">
                Amenities
              </h2>
              <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {p.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2">
                    <Check size={16} className="text-forest" aria-hidden /> {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.videoUrl && (
            <section aria-labelledby="video" className="mt-10">
              <h2 id="video" className="mb-3 text-[length:var(--text-xl)]">
                Video tour
              </h2>
              <div className="aspect-video overflow-hidden rounded-lg border border-line bg-black">
                <iframe
                  title={`Video tour of ${p.title}`}
                  src={p.videoUrl}
                  loading="lazy"
                  allow="accelerometer; gyroscope; encrypted-media; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  className="size-full"
                />
              </div>
            </section>
          )}

          {hasGeo && (
            <section aria-labelledby="location" className="mt-10">
              <h2 id="location" className="mb-3 text-[length:var(--text-xl)]">
                Location
              </h2>
              <div className="aspect-[16/9] overflow-hidden rounded-lg border border-line">
                <iframe
                  title={`Map showing ${where}`}
                  src={osmEmbed(p.geo!.lat!, p.geo!.lng!)}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="size-full"
                />
              </div>
              <a
                className="mt-2 inline-flex min-h-11 items-center text-forest underline underline-offset-2"
                href={`https://www.openstreetmap.org/?mlat=${p.geo!.lat}&mlon=${p.geo!.lng}#map=16/${p.geo!.lat}/${p.geo!.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open larger map
              </a>
            </section>
          )}
        </div>

        <aside
          aria-label="Contact about this property"
          className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start"
        >
          <div className="rounded-lg border border-line bg-raised p-6 shadow-raised">
            {p.price !== null && (
              <p className="font-display text-[2.25rem] leading-none">
                {formatPrice(p.price, p.priceUnit)}
              </p>
            )}
            {unavailable ? (
              <p className="mt-4 rounded-md bg-warn-bg px-3 py-2 text-warn" role="status">
                This property is {p.status}. Ask us about similar ones.
              </p>
            ) : (
              <p className="mt-2 text-muted">
                Tell us you are interested and we will call you back.
              </p>
            )}
            <div className="mt-5 flex flex-col gap-3">
              <InterestButton propertyId={p.id} available={!unavailable} variant="panel" />
              <LinkButton href={SITE.phoneHref} variant="secondary" size="lg" className="w-full">
                <Phone size={18} aria-hidden /> Call {SITE.phone}
              </LinkButton>
              <LinkButton
                href={listingWhatsappLink(p)}
                variant="secondary"
                size="lg"
                className="w-full"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} aria-hidden /> WhatsApp
              </LinkButton>
              <Link
                href={`/contact?property=${p.id}&title=${encodeURIComponent(p.title)}`}
                className="inline-flex min-h-11 items-center justify-center text-forest underline underline-offset-2"
              >
                Send an enquiry
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
