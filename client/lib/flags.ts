/**
 * Feature flags. Set `hero3d` to false to switch the 3D hero off everywhere; the static
 * poster is used instead and the three.js chunk is never downloaded.
 */
export const FEATURES = {
  hero3d: true,
} as const;
