/**
 * Feature flags. Set `hero3d` to false to switch the 3D hero off everywhere; the static
 * poster is used instead and the three.js chunk is never downloaded.
 */
export const FEATURES = {
  hero3d: true,
  // Price range filter and price sort are hidden: the owner negotiates prices, so they are not
  // revealed up front. The code stays in place; set this to true to bring them back.
  priceFilters: false,
} as const;
