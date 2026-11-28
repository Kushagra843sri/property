import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pageWindow } from '@/components/listings/Pagination';
import { buildQuery } from '@/lib/api';
import { formatArea, formatPrice, specLine, typeLabel } from '@/lib/format';
import { activeCount, parseFilters, toApiQuery, toSearchParams } from '@/lib/listing-query';
import { SITE, listingWhatsappLink, whatsappLink } from '@/lib/site';
import { BUNNY_CDN_HOST, videoThumb } from '@/lib/video';
import { checkContrast } from '../scripts/contrast.mjs';

describe('formatPrice', () => {
  it('returns null when no price was entered', () => {
    expect(formatPrice(null)).toBeNull();
  });
  it.each([
    [8_500_000, 'total', '₹85 lakh'],
    [24_000_000, 'total', '₹2.4 crore'],
    [10_000_000, 'total', '₹1 crore'],
    [150_000, 'total', '₹1.5 lakh'],
    [99_999, 'total', '₹99,999'],
    [22_000, 'per-month', '₹22,000 a month'],
    [1_250_000, 'per-month', '₹12,50,000 a month'],
  ] as const)('%s %s -> %s', (n, unit, out) => expect(formatPrice(n, unit)).toBe(out));
});

describe('format helpers', () => {
  it('shows BHK for flats only', () => {
    expect(specLine({ type: 'flat', bhk: 2 })).toBe('2 BHK flat');
    expect(specLine({ type: 'flat' })).toBe('Flat');
    expect(specLine({ type: 'shop', bhk: 3 })).toBe('Shop');
    expect(typeLabel('pg')).toBe('PG room');
    expect(typeLabel('room')).toBe('Furnished room');
  });
  it('formats areas with units and skips empty values', () => {
    expect(formatArea(1450)).toBe('1,450 sq.ft');
    expect(formatArea(200, 'sqyd')).toBe('200 sq.yd');
    expect(formatArea(undefined)).toBeNull();
    expect(formatArea(0)).toBeNull();
  });
});

describe('listing filters <-> URL', () => {
  it('parses valid params and drops invalid ones', () => {
    const f = parseFilters({
      purpose: 'rent',
      type: 'pg',
      sort: 'bogus',
      page: '0',
      minPrice: 'x',
      bhk: '3',
    });
    expect(f).toMatchObject({
      purpose: 'rent',
      type: 'pg',
      sort: 'newest',
      page: 1,
      status: 'available',
    });
    expect(f.minPrice).toBeUndefined();
    expect(f.bhk).toBeUndefined(); // BHK means flats only
  });
  it('keeps BHK for flats', () => {
    expect(parseFilters({ type: 'flat', bhk: '2' }).bhk).toBe(2);
    expect(parseFilters({ bhk: '2' }).bhk).toBeUndefined();
  });
  it('swaps an inverted price range and rejects injection-shaped values', () => {
    const f = parseFilters({
      minPrice: '900',
      maxPrice: '100',
      type: ['villa', 'x'],
      q: '  hello  ',
    });
    // Price filters are switched off (FEATURES.priceFilters), so price params are dropped.
    expect([f.minPrice, f.maxPrice, f.type, f.q]).toEqual([undefined, undefined, 'villa', 'hello']);
    expect(parseFilters({ type: '$ne', purpose: '../x' }).type).toBeUndefined();
  });
  it('drops price sort while price filters are off', () => {
    expect(parseFilters({ sort: 'price_asc' }).sort).toBe('newest');
    expect(parseFilters({ sort: 'featured' }).sort).toBe('featured');
  });
  it('keeps the area and clears it when blank', () => {
    expect(parseFilters({ locality: '  Dwarka (any sector) ' }).locality).toBe(
      'Dwarka (any sector)',
    );
    expect(parseFilters({ locality: '   ' }).locality).toBeUndefined();
    expect(toApiQuery(parseFilters({ locality: 'Janakpuri' })).locality).toBe('Janakpuri');
  });
  it('round-trips through the URL without defaults', () => {
    const f = parseFilters({
      purpose: 'buy',
      type: 'flat',
      bhk: '3',
      sort: 'featured',
      locality: 'Nawada',
      page: '2',
    });
    const qs = toSearchParams(f).toString();
    expect(qs).toBe('purpose=buy&type=flat&bhk=3&sort=featured&locality=Nawada&page=2');
    expect(parseFilters(new URLSearchParams(qs))).toEqual(f);
    expect(toSearchParams(parseFilters({})).toString()).toBe('');
  });
  it('builds the API query and counts active filters', () => {
    const f = parseFilters({ purpose: 'rent', type: 'room' });
    expect(toApiQuery(f)).toMatchObject({
      purpose: 'rent',
      type: 'room',
      sort: 'newest',
      status: 'available',
      limit: 9,
    });
    expect(activeCount(f)).toBe(2);
    expect(buildQuery({ a: 1, b: '', c: undefined, d: 'x y' })).toBe('?a=1&d=x+y');
  });
});

describe('pageWindow', () => {
  it('windows long lists with gaps', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(6, 20)).toEqual([1, 'gap', 5, 6, 7, 'gap', 20]);
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});

describe('site constants', () => {
  it('derives phone numbers and WhatsApp from one place', () => {
    expect(SITE.phones).toHaveLength(2);
    expect(SITE.phoneHref).toBe(SITE.phones[0]!.href);
    expect(whatsappLink('hi there')).toContain(`wa.me/${SITE.whatsappNumber}`);
    expect(whatsappLink('hi there')).toContain('hi%20there');
  });

  it('builds the per-listing WhatsApp message with the title and the listing link', () => {
    const link = decodeURIComponent(
      listingWhatsappLink({ title: 'Garden Villa', slug: 'garden-villa-1' }),
    );
    expect(link).toContain(`wa.me/${SITE.whatsappNumber}`);
    expect(link).toContain('Need details regarding it.');
    expect(link).toContain('Garden Villa');
    expect(link).toContain('/listings/garden-villa-1');
  });
});

describe('design tokens', () => {
  it('every colour pair passes WCAG AA', () => {
    const css = readFileSync('styles/tokens.css', 'utf8');
    const failing = checkContrast(css).filter((r: { pass: boolean }) => !r.pass);
    expect(failing).toEqual([]);
  });
});

describe('videoThumb', () => {
  const id = '4dc36ecd-b1c3-437e-a58a-48e523155c77';
  it('builds the preview picture address from a Bunny player link', () => {
    expect(videoThumb(`https://iframe.mediadelivery.net/embed/823842/${id}`)).toBe(
      `https://${BUNNY_CDN_HOST}/${id}/thumbnail.jpg`,
    );
    expect(videoThumb(`https://player.mediadelivery.net/play/823842/${id}`)).toContain(id);
  });
  it('returns undefined for no link or a link that is not a Bunny player', () => {
    expect(videoThumb(undefined)).toBeUndefined();
    expect(videoThumb(null)).toBeUndefined();
    expect(videoThumb('https://evil.example/embed/1/' + id)).toBeUndefined();
  });
});

describe('site contact details', () => {
  it('links to the Instagram profile without any share-tracking part', () => {
    expect(SITE.instagram.url).toBe('https://www.instagram.com/shreeshyamproperty768');
    expect(SITE.instagram.url).not.toContain('?');
  });
});
