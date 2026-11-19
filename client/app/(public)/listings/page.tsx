import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { FilterBar } from '@/components/listings/FilterBar';
import { Pagination } from '@/components/listings/Pagination';
import { PropertyCard, PropertyCardSkeleton } from '@/components/listings/PropertyCard';
import { LinkButton } from '@/components/ui/Button';
import { ApiError, buildQuery, serverGet } from '@/lib/api';
import {
  activeCount,
  parseFilters,
  toApiQuery,
  toSearchParams,
  type Filters,
} from '@/lib/listing-query';
import type { AreaOption, Property } from '@/lib/types';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const filters = parseFilters(await searchParams);
  const filtered = activeCount(filters) > 0 || filters.page > 1 || filters.status !== 'available';
  return {
    title: 'Properties for sale and rent',
    description: 'Browse apartments, villas, plots and commercial properties currently available.',
    alternates: { canonical: '/listings' },
    // Filtered views are for people, not for the index.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

function GridSkeleton() {
  return (
    <div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading properties"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}

async function Results({ filters }: { filters: Filters }) {
  let items: Property[] = [];
  let totalPages = 1;
  let total = 0;
  try {
    const res = await serverGet<Property[]>(`/properties${buildQuery(toApiQuery(filters))}`, 30);
    items = res.data;
    totalPages = res.meta?.totalPages ?? 1;
    total = res.meta?.total ?? items.length;
  } catch (err) {
    return (
      <div role="alert" className="rounded-lg border border-line bg-raised p-8 text-center">
        <h2 className="text-2xl">We could not load the properties</h2>
        <p className="mx-auto mt-2 max-w-[48ch] text-muted">
          {err instanceof ApiError && err.status === 0
            ? 'The property service is not reachable right now.'
            : 'Something went wrong on our side.'}{' '}
          Please try again in a minute, or call us and we will help directly.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <LinkButton href={`/listings?${toSearchParams(filters).toString()}`}>
            Try again
          </LinkButton>
          <LinkButton href="/contact" variant="secondary">
            Contact us
          </LinkButton>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-raised p-10 text-center">
        <h2 className="text-2xl">No properties match these filters</h2>
        <p className="mx-auto mt-2 max-w-[48ch] text-muted">
          Try removing a filter. If you are looking for something specific, tell us and we will keep
          an eye out.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <LinkButton href="/listings">Clear filters</LinkButton>
          <LinkButton href="/contact" variant="secondary">
            Tell us what you need
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="sr-only">Results</h2>
      <p className="mb-5 text-muted" aria-live="polite">
        {total} {total === 1 ? 'property' : 'properties'}
        {filters.page > 1 && `, page ${filters.page} of ${totalPages}`}
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => (
          <PropertyCard key={p.id} property={p} index={i} priority={i < 3} />
        ))}
      </div>
      <Pagination filters={filters} totalPages={totalPages} />
    </>
  );
}

export default async function ListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams);
  const key = toSearchParams(filters).toString();
  // If the area list cannot load, the area field still works by typing a name.
  const areas = await serverGet<AreaOption[]>('/properties/areas', 300)
    .then((r) => r.data)
    .catch(() => []);
  return (
    <div className="container-page py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        <Link href="/" className="hover:underline">
          Home
        </Link>{' '}
        / <span aria-current="page">Properties</span>
      </nav>
      <h1 className="mb-8 text-[length:var(--text-3xl)]">Properties</h1>
      <FilterBar filters={filters} areas={areas} />
      <div className="mt-8">
        <Suspense key={key} fallback={<GridSkeleton />}>
          <Results filters={filters} />
        </Suspense>
      </div>
    </div>
  );
}
