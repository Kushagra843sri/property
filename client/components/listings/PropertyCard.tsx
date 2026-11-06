import Link from 'next/link';
import { Bath, BedDouble, Ruler } from 'lucide-react';
import type { Property } from '@/lib/types';
import { formatArea, formatLocation, formatPrice, specLine } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { InterestButton } from './InterestButton';
import { PropertyImage } from './PropertyImage';

interface Props {
  property: Property;
  priority?: boolean;
  /** Index for the staggered entrance (capped so long lists do not feel slow). */
  index?: number;
}

export function PropertyCard({ property: p, priority, index = 0 }: Props) {
  const first = p.images[0];
  const area = formatArea(p.carpetArea ?? p.builtUpArea, p.areaUnit);
  const unavailable = p.status !== 'available';

  return (
    <article
      className="fade-up group relative flex flex-col overflow-hidden rounded-lg border border-line bg-raised transition-[transform] duration-300 ease-out hover:-translate-y-0.5"
      style={{ ['--d' as string]: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sunken">
        <div className="absolute inset-0 transition-transform duration-[600ms] ease-out group-hover:scale-[1.04]">
          <PropertyImage
            src={first?.url}
            alt={first?.alt || `${specLine(p)} in ${formatLocation(p.address)}`}
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
            priority={priority ?? false}
          />
        </div>
        <div className="absolute left-3 top-3 flex gap-2">
          {p.featured && !unavailable && <Badge tone="forest">Featured</Badge>}
          {p.status === 'sold' && <Badge tone="neutral">Sold</Badge>}
          {p.status === 'rented' && <Badge tone="neutral">Rented</Badge>}
          <Badge tone="neutral">{p.purpose === 'rent' ? 'For rent' : 'For sale'}</Badge>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 break-words p-5">
        <p className="font-display text-[1.75rem] leading-none">
          {formatPrice(p.price, p.priceUnit)}
        </p>
        <h3 className="text-xl">
          <Link
            href={`/listings/${p.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[var(--focus)]"
          >
            {p.title}
          </Link>
        </h3>
        <p className="text-muted">
          {specLine(p)} in {formatLocation(p.address)}
        </p>
        <ul
          className="mt-auto flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted"
          aria-label="Key details"
        >
          {p.bhk ? (
            <li className="inline-flex items-center gap-1.5">
              <BedDouble size={16} aria-hidden /> {p.bhk} bed
            </li>
          ) : null}
          {p.bathrooms ? (
            <li className="inline-flex items-center gap-1.5">
              <Bath size={16} aria-hidden /> {p.bathrooms} bath
            </li>
          ) : null}
          {area && (
            <li className="inline-flex items-center gap-1.5">
              <Ruler size={16} aria-hidden /> {area}
            </li>
          )}
        </ul>
        <div className="relative z-10 pt-1">
          <InterestButton propertyId={p.id} available={!unavailable} />
        </div>
      </div>
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gold transition-transform duration-500 ease-out group-hover:scale-x-100"
      />
    </article>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-raised" aria-hidden>
      <div className="skeleton aspect-[4/3] rounded-none" />
      <div className="flex flex-col gap-3 p-5">
        <div className="skeleton h-7 w-1/3" />
        <div className="skeleton h-5 w-4/5" />
        <div className="skeleton h-4 w-3/5" />
        <div className="skeleton mt-4 h-11 w-40" />
      </div>
    </div>
  );
}
