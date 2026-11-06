'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import {
  BUDGETS,
  FURNISHINGS,
  TYPES,
  activeCount,
  toSearchParams,
  type Filters,
} from '@/lib/listing-query';
import { typeLabel } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Select } from '@/components/ui/Field';

const BHKS = [1, 2, 3, 4, 5];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill border px-4 text-[0.9375rem]',
        'transition-[background-color,color,border-color,transform] duration-150 ease-out active:scale-[0.97]',
        active
          ? 'border-forest bg-forest text-on-forest'
          : 'border-line-strong bg-raised text-ink hover:border-ink',
      )}
      style={{ borderRadius: 'var(--r-pill)' }}
    >
      {children}
    </button>
  );
}

export function FilterBar({ filters }: { filters: Filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(filters.q ?? '');

  // Keep the box in step with the URL (back/forward, clear) without an effect.
  const [seenQ, setSeenQ] = useState(filters.q);
  if (seenQ !== filters.q) {
    setSeenQ(filters.q);
    setQ(filters.q ?? '');
  }

  const apply = (patch: Partial<Filters>) => {
    const next: Partial<Filters> = { ...filters, ...patch, page: 1 };
    const qs = toSearchParams(next).toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const budgets = filters.purpose ? BUDGETS[filters.purpose] : null;
  const budgetIndex = budgets
    ? budgets.findIndex(
        (b) =>
          ('min' in b ? b.min : undefined) === filters.minPrice &&
          ('max' in b ? b.max : undefined) === filters.maxPrice,
      )
    : -1;
  const count = activeCount(filters);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    apply({ q: q.trim() || undefined });
  };

  return (
    <section
      aria-label="Filter properties"
      className="rounded-lg border border-line bg-raised p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <form onSubmit={onSearch} role="search" className="relative min-w-0 flex-1">
          <label htmlFor="listing-q" className="sr-only">
            Search by title or locality
          </label>
          <Search
            size={18}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="listing-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title or locality"
            maxLength={100}
            className="min-h-11 w-full rounded-md border border-line-strong bg-paper pl-10 pr-3 text-base transition-colors duration-150 hover:border-ink"
          />
        </form>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line-strong px-4 md:hidden"
          aria-expanded={open}
          aria-controls="filter-panel"
          onClick={() => setOpen((v) => !v)}
        >
          <SlidersHorizontal size={18} aria-hidden /> Filters
          {count > 0 && (
            <span className="rounded-pill bg-forest px-2 text-sm text-on-forest">{count}</span>
          )}
        </button>
      </div>

      <div
        id="filter-panel"
        className={cn('mt-4 flex-col gap-5 md:flex', open ? 'flex' : 'hidden')}
      >
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Buy or rent</legend>
            <Chip
              active={!filters.purpose}
              onClick={() =>
                apply({ purpose: undefined, minPrice: undefined, maxPrice: undefined })
              }
            >
              All
            </Chip>
            <Chip
              active={filters.purpose === 'buy'}
              onClick={() => apply({ purpose: 'buy', minPrice: undefined, maxPrice: undefined })}
            >
              Buy
            </Chip>
            <Chip
              active={filters.purpose === 'rent'}
              onClick={() => apply({ purpose: 'rent', minPrice: undefined, maxPrice: undefined })}
            >
              Rent
            </Chip>
          </fieldset>

          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Bedrooms</legend>
            <Chip active={filters.bhk === undefined} onClick={() => apply({ bhk: undefined })}>
              Any BHK
            </Chip>
            {BHKS.map((n) => (
              <Chip
                key={n}
                active={filters.bhk === n}
                onClick={() => apply({ bhk: filters.bhk === n ? undefined : n })}
              >
                {n}
              </Chip>
            ))}
          </fieldset>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Property type
            <Select
              value={filters.type ?? ''}
              onChange={(e) => apply({ type: (e.target.value || undefined) as Filters['type'] })}
            >
              <option value="">Any type</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Budget
            <Select
              disabled={!budgets}
              value={budgetIndex >= 0 ? String(budgetIndex) : ''}
              onChange={(e) => {
                const b = budgets?.[Number(e.target.value)];
                apply({
                  minPrice: b && 'min' in b ? b.min : undefined,
                  maxPrice: b && 'max' in b ? b.max : undefined,
                });
              }}
            >
              <option value="">{budgets ? 'Any budget' : 'Choose Buy or Rent first'}</option>
              {budgets?.map((b, i) => (
                <option key={b.label} value={i}>
                  {b.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Furnishing
            <Select
              value={filters.furnishing ?? ''}
              onChange={(e) =>
                apply({ furnishing: (e.target.value || undefined) as Filters['furnishing'] })
              }
            >
              <option value="">Any</option>
              {FURNISHINGS.map((f) => (
                <option key={f} value={f}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Sort by
            <Select
              value={filters.sort}
              onChange={(e) => apply({ sort: e.target.value as Filters['sort'] })}
            >
              <option value="newest">Newest first</option>
              <option value="price_asc">Price, low to high</option>
              <option value="price_desc">Price, high to low</option>
              <option value="featured">Featured first</option>
            </Select>
          </label>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p aria-live="polite" className="text-sm text-muted">
            {isPending
              ? 'Updating results…'
              : count > 0
                ? `${count} filter${count > 1 ? 's' : ''} applied`
                : ' '}
          </p>
          {count > 0 && (
            <button
              type="button"
              className="min-h-11 px-2 text-sm font-medium text-forest underline underline-offset-2"
              onClick={() => {
                setQ('');
                apply({
                  purpose: undefined,
                  type: undefined,
                  bhk: undefined,
                  minPrice: undefined,
                  maxPrice: undefined,
                  furnishing: undefined,
                  q: undefined,
                });
              }}
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
