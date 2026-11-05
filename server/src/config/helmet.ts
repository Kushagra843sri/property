import helmet from 'helmet';

// The API serves JSON only, so the CSP can be fully locked down.
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"] },
  },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  crossOriginResourcePolicy: { policy: 'same-site' },
});
