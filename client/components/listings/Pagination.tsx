import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toSearchParams, type Filters } from '@/lib/listing-query';
import { cn } from '@/lib/cn';

/** Windowed page list: 1 … 4 5 [6] 7 8 … 20. Server-rendered links so it works without JS. */
export function pageWindow(page: number, total: number): (number | 'gap')[] {
  const set = new Set([1, total, page - 1, page, page + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((n, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && n - prev > 1) out.push('gap');
    out.push(n);
  });
  return out;
}

export function Pagination({ filters, totalPages }: { filters: Filters; totalPages: number }) {
  if (totalPages <= 1) return null;
  const href = (page: number) => {
    const qs = toSearchParams({ ...filters, page }).toString();
    return qs ? `/listings?${qs}` : '/listings';
  };
  const cell = 'inline-flex size-11 items-center justify-center rounded-md border text-[0.9375rem]';
  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {filters.page > 1 && (
        <Link
          href={href(filters.page - 1)}
          className={cn(cell, 'border-line-strong hover:border-ink')}
          aria-label="Previous page"
          rel="prev"
        >
          <ChevronLeft size={18} aria-hidden />
        </Link>
      )}
      {pageWindow(filters.page, totalPages).map((n, i) =>
        n === 'gap' ? (
          <span key={`g${i}`} aria-hidden className="px-1 text-muted">
            …
          </span>
        ) : (
          <Link
            key={n}
            href={href(n)}
            aria-current={n === filters.page ? 'page' : undefined}
            aria-label={`Page ${n}`}
            className={cn(
              cell,
              n === filters.page
                ? 'border-forest bg-forest text-on-forest'
                : 'border-line-strong hover:border-ink',
            )}
          >
            {n}
          </Link>
        ),
      )}
      {filters.page < totalPages && (
        <Link
          href={href(filters.page + 1)}
          className={cn(cell, 'border-line-strong hover:border-ink')}
          aria-label="Next page"
          rel="next"
        >
          <ChevronRight size={18} aria-hidden />
        </Link>
      )}
    </nav>
  );
}
