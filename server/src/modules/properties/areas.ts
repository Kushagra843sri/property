import { Property } from '../../models/property.js';

/**
 * The dealer's main areas, shown first. `match` is case-insensitive. A regex lets one entry cover
 * several localities: "Dwarka (any sector)" covers every Dwarka locality except Dwarka Mor.
 */
export const TOP_AREAS: readonly { name: string; match: RegExp }[] = [
  { name: 'Uttam Nagar East', match: /^uttam nagar east$/i },
  { name: 'Uttam Nagar West', match: /^uttam nagar west$/i },
  { name: 'Nawada', match: /^nawada$/i },
  { name: 'Dwarka Mor', match: /^dwarka mor$/i },
  { name: 'Dwarka (any sector)', match: /^dwarka(?!\s+mor$)/i },
  { name: 'Janakpuri', match: /^janakpuri$/i },
  { name: 'Vikaspuri', match: /^vikaspuri$/i },
  { name: 'Rajouri Garden', match: /^rajouri garden$/i },
  { name: 'Ramesh Nagar', match: /^ramesh nagar$/i },
  { name: 'Shubhas Nagar', match: /^shubhas nagar$/i },
];

const topArea = (name: string) =>
  TOP_AREAS.find((a) => a.name.toLowerCase() === name.toLowerCase());

/** Filter value for a locality query: a top-area regex, or null when the name is not a top area. */
export const topAreaMatcher = (name: string): RegExp | null => topArea(name)?.match ?? null;

export interface AreaOption {
  name: string;
  count: number;
  top: boolean;
}

/**
 * Every area with at least one available listing. Top areas come first in TOP_AREAS order, even
 * when they have no listings yet, so the list is stable. The rest follow alphabetically.
 */
export async function listAreas(): Promise<AreaOption[]> {
  const rows = await Property.aggregate<{ _id: string; count: number }>([
    { $match: { status: 'available', 'address.locality': { $nin: [null, ''] } } },
    { $group: { _id: '$address.locality', count: { $sum: 1 } } },
  ]);
  const top = TOP_AREAS.map((a) => ({
    name: a.name,
    count: rows.reduce((n, r) => (a.match.test(r._id) ? n + r.count : n), 0),
    top: true,
  }));
  const others = rows
    .filter((r) => !TOP_AREAS.some((a) => a.match.test(r._id)))
    .sort((a, b) => a._id.localeCompare(b._id))
    .map((r) => ({ name: r._id, count: r.count, top: false }));
  return [...top, ...others];
}
