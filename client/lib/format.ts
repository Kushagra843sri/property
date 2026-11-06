const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, '');

/** Rupee amounts in Indian convention: crore / lakh above the thresholds, grouped digits below. */
export function formatPrice(price: number, unit: 'total' | 'per-month' = 'total'): string {
  let out: string;
  if (unit === 'per-month' || price < 100_000) out = `₹${inr.format(price)}`;
  else if (price >= 10_000_000) out = `₹${trim(price / 10_000_000)} crore`;
  else out = `₹${trim(price / 100_000)} lakh`;
  return unit === 'per-month' ? `${out} a month` : out;
}

const AREA_UNIT = { sqft: 'sq.ft', sqyd: 'sq.yd', sqm: 'sq.m', acre: 'acre' } as const;

export function formatArea(value?: number, unit: keyof typeof AREA_UNIT = 'sqft'): string | null {
  if (!value) return null;
  return `${inr.format(value)} ${AREA_UNIT[unit] ?? AREA_UNIT.sqft}`;
}

const TYPE_LABEL: Record<string, string> = {
  apartment: 'Apartment',
  villa: 'Villa',
  house: 'House',
  plot: 'Plot',
  commercial: 'Commercial',
  office: 'Office',
  shop: 'Shop',
  other: 'Property',
};
export const typeLabel = (t: string) => TYPE_LABEL[t] ?? 'Property';

export function formatLocation(a: { locality?: string; city: string }): string {
  return [a.locality, a.city].filter(Boolean).join(', ');
}

/** "3 BHK apartment" style headline; falls back to the type alone. */
export function specLine(p: { bhk?: number; type: string }): string {
  return p.bhk ? `${p.bhk} BHK ${typeLabel(p.type).toLowerCase()}` : typeLabel(p.type);
}
