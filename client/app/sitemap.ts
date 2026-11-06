import type { MetadataRoute } from 'next';
import { serverGet } from '@/lib/api';
import { SITE } from '@/lib/site';
import type { Property } from '@/lib/types';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/listings', '/about', '/contact', '/privacy', '/terms'].map((p) => ({
    url: `${SITE.url}${p}`,
  }));
  const listings: MetadataRoute.Sitemap = [];
  try {
    // Walk the (capped, 50 per page) list endpoint; stop after a sane number of pages.
    for (let page = 1; page <= 20; page++) {
      const res = await serverGet<Property[]>(`/properties?limit=50&page=${page}`, 3600);
      for (const p of res.data) {
        listings.push({
          url: `${SITE.url}/listings/${p.slug}`,
          ...(p.createdAt ? { lastModified: p.createdAt } : {}),
        });
      }
      if (page >= (res.meta?.totalPages ?? 1)) break;
    }
  } catch {
    // API down at build/revalidate time: still serve the static pages.
  }
  return [...pages, ...listings];
}
