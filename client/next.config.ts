import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cache Components is off on purpose: the site uses plain server components with
  // time-based revalidation (see docs/MORNING-REVIEW.md). Re-enable deliberately later.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'placehold.co' },
    ],
  },
  turbopack: {
    // The repo root also has a package.json (husky); pin the root to this app.
    root: path.resolve(import.meta.dirname),
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
