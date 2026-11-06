/**
 * Listing filters <-> URL query string. The URL is the single source of truth for the filter bar,
 * so every filtered view is shareable, back-button friendly and server-renderable.
 */

export const PURPOSES = ['buy', 'rent'] as const;
// Types the API accepts for filtering; QUICK_TYPES are the ones shown as chips.
export const TYPES = [
  'flat',
  'shop',
  'office',
  'pg',
  'room',
  'villa',
  'house',
  'plot',
  'commercial',
] as const;
export const QUICK_TYPES = ['flat', 'shop', 'office', 'pg', 'room'] as const;
export const FURNISHINGS = ['unfurnished', 'semi-furnished', 'furnished'] as const;
export const SORTS = ['newest', 'price_asc', 'price_desc', 'featured'] as const;
export const STATUSES = ['available', 'sold', 'rented'] as const;

export interface Filters {
  purpose?: (typeof PURPOSES)[number];
  type?: (typeof TYPES)[number];
  bhk?: number;
  minPrice?: number;
  maxPrice?: number;
  furnishing?: (typeof FURNISHINGS)[number];
  sort: (typeof SORTS)[number];
  status: (typeof STATUSES)[number];
  q?: string;
  page: number;
}

type Raw = Record<string, string | string[] | undefined> | URLSearchParams;

const one = (raw: Raw, key: string): string | undefined => {
  const v = raw instanceof URLSearchParams ? raw.get(key) : raw[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s === undefined || s === null || s === '' ? undefined : s;
};
const pick = <T extends readonly string[]>(list: T, v?: string): T[number] | undefined =>
  v && (list as readonly string[]).includes(v) ? (v as T[number]) : undefined;
const int = (v: string | undefined, min: number, max: number): number | undefined => {
  if (v === undefined || !/^\d+$/.test(v)) return undefined;
  const n = Number(v);
  return n >= min && n <= max ? n : undefined;
};

/** Parse untrusted URL params into valid filters; anything invalid is dropped, never forwarded. */
export function parseFilters(raw: Raw): Filters {
  let minPrice = int(one(raw, 'minPrice'), 0, 1e12);
  let maxPrice = int(one(raw, 'maxPrice'), 0, 1e12);
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  const q = one(raw, 'q')?.trim().slice(0, 100);
  const type = pick(TYPES, one(raw, 'type'));
  return {
    purpose: pick(PURPOSES, one(raw, 'purpose')),
    type,
    // BHK is only meaningful for flats: ignore it for any other (or no) type.
    bhk: type === 'flat' ? int(one(raw, 'bhk'), 0, 20) : undefined,
    minPrice,
    maxPrice,
    furnishing: pick(FURNISHINGS, one(raw, 'furnishing')),
    sort: pick(SORTS, one(raw, 'sort')) ?? 'newest',
    status: pick(STATUSES, one(raw, 'status')) ?? 'available',
    q: q || undefined,
    page: int(one(raw, 'page'), 1, 10_000) ?? 1,
  };
}

const DEFAULTS = { sort: 'newest', status: 'available', page: 1 } as const;

/** Filters -> URLSearchParams, omitting defaults so URLs stay short. */
export function toSearchParams(f: Partial<Filters>): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === '' || v === null) continue;
    if (k in DEFAULTS && v === DEFAULTS[k as keyof typeof DEFAULTS]) continue;
    p.set(k, String(v));
  }
  return p;
}

/** Query sent to the API (page size fixed here). */
export function toApiQuery(f: Filters, limit = 9): Record<string, string | number> {
  const out: Record<string, string | number> = {
    sort: f.sort,
    status: f.status,
    page: f.page,
    limit,
  };
  for (const k of ['purpose', 'type', 'bhk', 'minPrice', 'maxPrice', 'furnishing', 'q'] as const) {
    const v = f[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** Number of active filters (excludes sort, status and page) for the badge on the mobile toggle. */
export const activeCount = (f: Filters): number =>
  ['purpose', 'type', 'bhk', 'minPrice', 'maxPrice', 'furnishing', 'q'].filter(
    (k) => f[k as keyof Filters] !== undefined,
  ).length;

export const BUDGETS = {
  buy: [
    { label: 'Under ₹50 lakh', max: 5_000_000 },
    { label: '₹50 lakh to ₹1 crore', min: 5_000_000, max: 10_000_000 },
    { label: '₹1 crore to ₹2 crore', min: 10_000_000, max: 20_000_000 },
    { label: 'Above ₹2 crore', min: 20_000_000 },
  ],
  rent: [
    { label: 'Under ₹15,000', max: 15_000 },
    { label: '₹15,000 to ₹30,000', min: 15_000, max: 30_000 },
    { label: '₹30,000 to ₹60,000', min: 30_000, max: 60_000 },
    { label: 'Above ₹60,000', min: 60_000 },
  ],
} as const;
